import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { fetchBoards, fetchPosts, fetchComments, fetchPostDetail } from '@/lib/naverWorks'
import { parseComment } from '@/lib/parseNaverWorks'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    let syncedDeliveries = 0
    let updatedDeliveries = 0
    let processedPostsCount = 0

    // Load all current comment counts from DB for fast in-memory lookup
    const allMeta = await prisma.naverWorksMeta.findMany()
    const metaMap = new Map<string, number>()
    for (const m of allMeta) {
      metaMap.set(m.postId, m.commentCount)
    }

    // Shared: create or update Delivery from a parsed result
    const upsertDelivery = async (
      parsed: { customerName: string; content: string; isDelivery: boolean; deliveryDate: string; productName: string },
      createdTime: string,
      performedBy: string,
      externalId?: string
    ) => {
      // Prefer an '예정' delivery, fall back to any recent delivery for the same destination
      // (handles the case where the delivery was already marked '완료' but a date change arrives)
      let existingDelivery = await prisma.delivery.findFirst({
        where: { destination: { contains: parsed.customerName }, status: '예정' },
        orderBy: { createdAt: 'desc' },
      })
      if (!existingDelivery) {
        existingDelivery = await prisma.delivery.findFirst({
          where: {
            destination: { contains: parsed.customerName },
            source: 'naver_works',
            createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        })
      }

      let targetDate = new Date(createdTime || Date.now())
      if (parsed.deliveryDate) {
        const d = new Date(parsed.deliveryDate)
        if (!isNaN(d.getTime())) targetDate = d
      }

      if (existingDelivery) {
        await prisma.delivery.update({
          where: { id: existingDelivery.id },
          data: {
            date: targetDate,
            status: '예정',
            memo: existingDelivery.memo ? `${existingDelivery.memo}\n[추가] ${parsed.content}` : parsed.content,
            ...(externalId ? { externalId } : {}),
          },
        })
        updatedDeliveries++
      } else {
        await prisma.delivery.create({
          data: {
            date: targetDate,
            productName: parsed.productName || '수중청소기',
            destination: parsed.customerName,
            memo: parsed.content,
            quantity: 1,
            performedBy,
            status: '예정',
            source: 'naver_works',
            ...(externalId ? { externalId } : {}),
          },
        })
        syncedDeliveries++
      }
    }

    // 1. Fetch Boards
    console.log('Fetching boards from Naver Works...')
    let boardsResult
    try {
      boardsResult = await fetchBoards()
    } catch (err) {
      console.warn('Could not fetch boards. Check scope or credentials.', err)
    }

    if (boardsResult && boardsResult.boards) {
      for (const board of boardsResult.boards) {
        if (!board.boardName.includes('신규구매 의뢰')) continue

        let cursor: string | undefined = undefined
        let hasMore = true

        // Scan all pages — old posts can receive new comments at any time
        while (hasMore) {
          let postsResult
          try {
            postsResult = await fetchPosts(board.boardId, cursor)
          } catch (err) {
            hasMore = false
            break
          }

          if (!postsResult || !postsResult.posts || postsResult.posts.length === 0) {
            hasMore = false
            break
          }

          for (const post of postsResult.posts) {
            processedPostsCount++
            const postId = post.postId
            const currentCommentCount = post.commentCount || 0
            // undefined = this post has never been seen by the sync before
            const storedCommentCount = metaMap.get(postId)
            const isNewPost = storedCommentCount === undefined
            const storedCount = storedCommentCount ?? 0

            // ── NEW POST: process the post body itself ──────────────────────
            // Posts with no replies (commentCount = 0) are otherwise never read.
            // e.g. "납기일변경 7/30" posted as a standalone 글 without 답글 yet.
            if (isNewPost) {
              try {
                const postDetail = await fetchPostDetail(board.boardId, postId)
                const postBody = (postDetail.content || '').replace(/<[^>]*>/g, ' ').trim()

                if (postBody) {
                  // Use delivery.externalId to guard against double-processing
                  const existingDelivery = await prisma.delivery.findUnique({
                    where: { externalId: `post_${postId}` },
                  })

                  if (!existingDelivery) {
                    const parsed = await parseComment(
                      post.title || '',
                      postBody,
                      postDetail.createdTime || new Date().toISOString()
                    )

                    if (parsed && parsed.customerName && parsed.isDelivery) {
                      // Store externalId so we never create a duplicate for this post
                      const pendingDelivery = await prisma.delivery.findFirst({
                        where: { destination: { contains: parsed.customerName }, status: '예정' },
                      })

                      let targetDate = new Date(postDetail.createdTime || Date.now())
                      if (parsed.deliveryDate) {
                        const d = new Date(parsed.deliveryDate)
                        if (!isNaN(d.getTime())) targetDate = d
                      }

                      if (pendingDelivery) {
                        await prisma.delivery.update({
                          where: { id: pendingDelivery.id },
                          data: {
                            date: targetDate,
                            memo: pendingDelivery.memo
                              ? `${pendingDelivery.memo}\n[추가] ${parsed.content}`
                              : parsed.content,
                            externalId: `post_${postId}`,
                          },
                        })
                        updatedDeliveries++
                      } else {
                        await prisma.delivery.create({
                          data: {
                            date: targetDate,
                            productName: parsed.productName || '수중청소기',
                            destination: parsed.customerName,
                            memo: parsed.content,
                            quantity: 1,
                            performedBy: '자동연동(게시글)',
                            status: '예정',
                            source: 'naver_works',
                            externalId: `post_${postId}`,
                          },
                        })
                        syncedDeliveries++
                      }
                    }
                  }
                }
              } catch (err) {
                console.warn(`Could not process post body for ${postId}:`, err)
              }

              // Always register new posts in meta so they aren't re-fetched every run
              await prisma.naverWorksMeta.upsert({
                where: { postId },
                update: { commentCount: currentCommentCount },
                create: { postId, commentCount: currentCommentCount },
              })
              metaMap.set(postId, currentCommentCount)
            }

            // ── COMMENTS: only when count increased since last sync ─────────
            if (currentCommentCount > storedCount) {
              let commentsResult
              try {
                commentsResult = await fetchComments(board.boardId, postId)
              } catch (err) {
                continue
              }

              if (commentsResult && commentsResult.comments) {
                // Sort oldest → newest to process in chronological order
                const sortedComments = [...commentsResult.comments].sort(
                  (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
                )
                for (const comment of sortedComments) {
                  const commentId = comment.commentId
                  const commentText = comment.content || ''

                  if (!commentText.trim()) continue

                  // Guard: skip comments already turned into a Delivery record
                  const existingDelivery = await prisma.delivery.findUnique({
                    where: { externalId: `comment_${commentId}` },
                  })
                  if (existingDelivery) continue

                  const parsed = await parseComment(
                    post.title || '',
                    commentText,
                    comment.createdTime || new Date().toISOString()
                  )

                  if (parsed && parsed.customerName && parsed.isDelivery) {
                    await upsertDelivery(parsed, comment.createdTime || new Date().toISOString(), '자동연동(댓글)', `comment_${commentId}`)
                  }
                } // end comments loop
              }

              // Update the Meta DB so we don't scan it again next time
              await prisma.naverWorksMeta.upsert({
                where: { postId },
                update: { commentCount: currentCommentCount },
                create: { postId, commentCount: currentCommentCount },
              })
              metaMap.set(postId, currentCommentCount)
            }
          } // end posts loop

          cursor = postsResult.responseMetaData?.nextCursor
          if (!cursor) hasMore = false
        } // end while pages loop
      } // end boards loop
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      processedPostsCount,
      syncedDeliveries,
      updatedDeliveries,
    })
  } catch (error: any) {
    console.error('Naver Works sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
