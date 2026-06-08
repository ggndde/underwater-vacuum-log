import { prisma } from '@/lib/prisma'
import { fetchBoards, fetchPosts, fetchComments, fetchPostDetail } from '@/lib/naverWorks'
import { parseComment } from '@/lib/parseNaverWorks'

const DELIVERY_KEYWORDS = ['납품', '협의', '방문']

export const hasDeliveryKeyword = (text: string) =>
  DELIVERY_KEYWORDS.some(kw => text.includes(kw))

type ParsedComment = {
  customerName: string
  content: string
  isDelivery: boolean
  deliveryDate: string
  productName: string
}

export async function upsertDelivery(
  parsed: ParsedComment,
  createdTime: string,
  performedBy: string,
  externalId?: string,
  counters?: { synced: { n: number }; updated: { n: number } }
) {
  let existing = await prisma.delivery.findFirst({
    where: { destination: { contains: parsed.customerName }, status: '예정' },
    orderBy: { createdAt: 'desc' },
  })
  if (!existing) {
    existing = await prisma.delivery.findFirst({
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

  if (existing) {
    await prisma.delivery.update({
      where: { id: existing.id },
      data: {
        date: targetDate,
        status: '예정',
        memo: existing.memo ? `${existing.memo}\n[추가] ${parsed.content}` : parsed.content,
        ...(externalId ? { externalId } : {}),
      },
    })
    if (counters) counters.updated.n++
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
    if (counters) counters.synced.n++
  }
}

/**
 * 신규구매 의뢰 게시판 전체를 스캔하여 키워드 댓글/게시글을 납품 캘린더에 연동.
 *
 * @param forceAll true면 metaMap 무시하고 모든 게시글의 전체 댓글을 스캔 (1회성 전체 싱크)
 *                 false면 commentCount가 증가한 게시글만 처리 (일반 크론)
 */
export async function runNaverWorksSync(forceAll: boolean) {
  const synced = { n: 0 }
  const updated = { n: 0 }
  let processedPosts = 0

  const allMeta = await prisma.naverWorksMeta.findMany()
  const metaMap = new Map<string, number>()
  for (const m of allMeta) metaMap.set(m.postId, m.commentCount)

  let boardsResult
  try {
    boardsResult = await fetchBoards()
  } catch (err) {
    console.warn('Could not fetch boards:', err)
    return { processedPosts, synced: synced.n, updated: updated.n }
  }

  if (!boardsResult?.boards) return { processedPosts, synced: synced.n, updated: updated.n }

  for (const board of boardsResult.boards) {
    if (!board.boardName.includes('신규구매 의뢰')) continue

    let cursor: string | undefined = undefined
    let hasMore = true

    while (hasMore) {
      let postsResult
      try {
        postsResult = await fetchPosts(board.boardId, cursor)
      } catch {
        hasMore = false
        break
      }

      if (!postsResult?.posts?.length) { hasMore = false; break }

      for (const post of postsResult.posts) {
        processedPosts++
        const postId = post.postId
        const currentCommentCount = post.commentCount || 0
        const storedCommentCount = metaMap.get(postId)
        const isNewPost = storedCommentCount === undefined
        const storedCount = storedCommentCount ?? 0

        // 새 게시글이면 본문 처리 (댓글 0개인 게시글 커버)
        if (isNewPost) {
          try {
            const postDetail = await fetchPostDetail(board.boardId, postId)
            const postBody = (postDetail.content || '').replace(/<[^>]*>/g, ' ').trim()

            if (postBody && hasDeliveryKeyword(postBody)) {
              const noExisting = !(await prisma.delivery.findUnique({ where: { externalId: `post_${postId}` } }))
              if (noExisting) {
                const parsed = await parseComment(post.title || '', postBody, postDetail.createdTime || new Date().toISOString())
                if (parsed?.customerName) {
                  await upsertDelivery(parsed, postDetail.createdTime || new Date().toISOString(), '자동연동(게시글)', `post_${postId}`, { synced, updated })
                }
              }
            }
          } catch (err) {
            console.warn(`Post body fetch failed for ${postId}:`, err)
          }

          await prisma.naverWorksMeta.upsert({
            where: { postId },
            update: { commentCount: currentCommentCount },
            create: { postId, commentCount: currentCommentCount },
          })
          metaMap.set(postId, currentCommentCount)
        }

        // 댓글 처리: forceAll이면 전체, 아니면 증가분만
        const shouldProcessComments = forceAll ? currentCommentCount > 0 : currentCommentCount > storedCount

        if (shouldProcessComments) {
          let commentsResult
          try {
            commentsResult = await fetchComments(board.boardId, postId)
          } catch {
            continue
          }

          if (commentsResult?.comments) {
            const sorted = [...commentsResult.comments].sort(
              (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime()
            )
            for (const comment of sorted) {
              const commentText = comment.content || ''
              if (!commentText.trim()) continue
              if (!hasDeliveryKeyword(commentText)) continue

              const alreadyDone = await prisma.delivery.findUnique({ where: { externalId: `comment_${comment.commentId}` } })
              if (alreadyDone) continue

              const parsed = await parseComment(post.title || '', commentText, comment.createdTime || new Date().toISOString())
              if (parsed?.customerName) {
                await upsertDelivery(parsed, comment.createdTime || new Date().toISOString(), '자동연동(댓글)', `comment_${comment.commentId}`, { synced, updated })
              }
            }
          }

          // forceAll이든 증분이든 처리 후 메타 업데이트
          await prisma.naverWorksMeta.upsert({
            where: { postId },
            update: { commentCount: currentCommentCount },
            create: { postId, commentCount: currentCommentCount },
          })
          metaMap.set(postId, currentCommentCount)
        }
      }

      cursor = postsResult.responseMetaData?.nextCursor
      if (!cursor) hasMore = false
    }
  }

  return { processedPosts, synced: synced.n, updated: updated.n }
}
