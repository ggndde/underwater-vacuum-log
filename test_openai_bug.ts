import { fetchBoards, fetchPosts, fetchComments } from './src/lib/naverWorks';
import { parseComment } from './src/lib/parseNaverWorks';

async function test() {
  const boardsResult = await fetchBoards();
  for (const board of boardsResult.boards) {
    const postsResult = await fetchPosts(board.boardId);
    if (!postsResult?.posts) continue;
    for (const post of postsResult.posts) {
      if (post.commentCount > 0) {
        const commentsResult = await fetchComments(board.boardId, post.postId);
        for (const comment of commentsResult?.comments || []) {
           const commentText = comment.content || '';
           if (!commentText.trim()) continue;
           
           console.log(`Testing comment ${comment.commentId} in post ${post.postId}`);
           try {
              await parseComment(post.title || '', commentText);
           } catch(e: any) {
              console.error("Failed on comment: ", commentText);
              console.error(e.message);
              return; // Stop on first failure
           }
        }
      }
    }
  }
}
test().catch(console.error);
