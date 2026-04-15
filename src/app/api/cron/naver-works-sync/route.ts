import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server';
;
import { fetchBoards, fetchPosts, fetchComments } from '@/lib/naverWorks';
import { parseComment } from '@/lib/parseNaverWorks';
;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    let syncedLogs = 0;
    let syncedDeliveries = 0;
    let updatedDeliveries = 0;
    let processedPostsCount = 0;
    
    // Load all current comment counts from DB for fast in-memory lookup
    const allMeta = await prisma.naverWorksMeta.findMany();
    const metaMap = new Map<string, number>();
    for (const m of allMeta) {
      metaMap.set(m.postId, m.commentCount);
    }
    
    // 1. Fetch Boards
    console.log('Fetching boards from Naver Works...');
    let boardsResult;
    try {
      boardsResult = await fetchBoards();
    } catch(err) {
      console.warn("Could not fetch boards. Check scope or credentials.", err);
    }
    
    if (boardsResult && boardsResult.boards) {
      for (const board of boardsResult.boards) {
        if (!board.boardName.includes('신규구매 의뢰')) continue;

        let cursor: string | undefined = undefined;
        let hasMore = true;
        let pageCount = 0;
        
        // Loop through pages (limit to 10 pages max to prevent infinite loops/timeouts)
        while (hasMore && pageCount < 10) {
          pageCount++;
          let postsResult;
          try {
            postsResult = await fetchPosts(board.boardId, cursor);
          } catch(err) {
            hasMore = false;
            break;
          }

          if (!postsResult || !postsResult.posts || postsResult.posts.length === 0) {
            hasMore = false;
            break;
          }

          for (const post of postsResult.posts) {
            processedPostsCount++;
            const postId = post.postId;
            const currentCommentCount = post.commentCount || 0;
            const storedCommentCount = metaMap.get(postId) || 0;

            // ONLY fetch comments if the count has INCREASED
            if (currentCommentCount > storedCommentCount) {
              
              let commentsResult;
              try {
                commentsResult = await fetchComments(board.boardId, postId);
              } catch(err) {
                continue;
              }

              if (commentsResult && commentsResult.comments) {
                // 부모 게시글부터 오래된 댓글(과거) -> 최신 댓글 순서로 시간순 정렬하여 히스토리 꼬임 및 날짜 덮어쓰기 방지
                const sortedComments = [...commentsResult.comments].sort((a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime());
                for (const comment of sortedComments) {
                  const commentId = comment.commentId;
                  const commentText = comment.content || '';
                  
                  if (!commentText.trim()) continue;

                  // Check if we already processed this specific comment
                  const existingLog = await prisma.serviceLog.findUnique({
                    where: { externalId: commentId },
                  });
                  
                  if (existingLog) continue;

                  // Parse comment with AI
                  const parsed = await parseComment(post.title || '', commentText, comment.createdTime || new Date().toISOString());

                  if (parsed && parsed.customerName) {
                    
                    // 1. Delivery Logic ALWAYS executes if parsed.isDelivery is true
                    if (parsed.isDelivery) {
                      const pendingDelivery = await prisma.delivery.findFirst({
                        where: { 
                          destination: { contains: parsed.customerName },
                          status: '예정'
                        }
                      });

                      let targetDate = new Date(comment.createdTime || Date.now());
                      if (parsed.deliveryDate) {
                        const parsedDate = new Date(parsed.deliveryDate);
                        if (!isNaN(parsedDate.getTime())) {
                            targetDate = parsedDate;
                        }
                      }

                      if (pendingDelivery) {
                        await prisma.delivery.update({
                          where: { id: pendingDelivery.id },
                          data: {
                            date: targetDate, 
                            memo: pendingDelivery.memo ? `${pendingDelivery.memo}\n[추가] ${parsed.content}` : parsed.content
                          }
                        });
                        updatedDeliveries++;
                      } else {
                        await prisma.delivery.create({
                          data: {
                            date: targetDate,
                            productName: parsed.productName || '수중청소기',
                            destination: parsed.customerName,
                            memo: parsed.content,
                            quantity: 1,
                            performedBy: '자동연동(댓글)',
                            status: '예정',
                            source: 'naver_works'
                          }
                        });
                        syncedDeliveries++;
                      }
                    }

                    // 2. Service Log (Customer History) Logic
                    // ONLY executes if customer and machine exist in DB
                    const customer = await prisma.customer.findFirst({
                      where: { name: { contains: parsed.customerName } }
                    });

                    if (customer) {
                      // Find placeholder machine
                      const firstMachine = await prisma.machine.findFirst({
                        where: { customerId: customer.id }
                      });

                      if (firstMachine) {
                        // Create History Log
                        await prisma.serviceLog.create({
                          data: {
                            date: new Date(comment.createdTime || Date.now()),
                            type: parsed.isDelivery ? 'DELIVERY' : 'VISIT', 
                            body: parsed.content,
                            machineId: firstMachine.id,
                            externalId: commentId,
                            source: 'naver_works'
                          }
                        });
                        syncedLogs++;
                      }
                    }
                  }
                } // end comments loop
              }

              // Update the Meta DB so we don't scan it again next time
              await prisma.naverWorksMeta.upsert({
                where: { postId },
                update: { commentCount: currentCommentCount },
                create: { postId, commentCount: currentCommentCount }
              });
              // Update our in-memory map just in case we process the same post in the same run (unlikely but safe)
              metaMap.set(postId, currentCommentCount);
            }
          } // end posts loop
          
          cursor = postsResult.responseMetaData?.nextCursor;
          if (!cursor) {
            hasMore = false; // No more pages
          }
        } // end while pages loop
      } // end boards loop
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sync completed', 
      processedPostsCount,
      syncedLogs, 
      syncedDeliveries,
      updatedDeliveries
    });

  } catch (error: any) {
    console.error('Naver Works sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
