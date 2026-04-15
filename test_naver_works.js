const jwt = require('jsonwebtoken');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const envsToSet = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.+?)"$/);
  if (match) {
    envsToSet[match[1]] = match[2].replace(/\\n/g, '\n');
  }
});

const CLIENT_ID = envsToSet['NAVER_WORKS_CLIENT_ID'];
const CLIENT_SECRET = envsToSet['NAVER_WORKS_CLIENT_SECRET'];
const SERVICE_ACCOUNT = envsToSet['NAVER_WORKS_SERVICE_ACCOUNT'];
const PRIVATE_KEY = envsToSet['NAVER_WORKS_PRIVATE_KEY'];

async function test() {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const payload = {
    iss: CLIENT_ID,
    sub: SERVICE_ACCOUNT,
    iat,
    exp,
  };

  const assertion = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', assertion);
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('scope', 'board board.read');

  const res = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  const token = data.access_token;

  const boardsRes = await fetch('https://www.worksapis.com/v1.0/boards', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const boardsData = await boardsRes.json();
  
  for(const board of boardsData.boards) {
     const postsRes = await fetch(`https://www.worksapis.com/v1.0/boards/${board.boardId}/posts`, {
       headers: { Authorization: `Bearer ${token}` }
     });
     const postsData = await postsRes.json();
     if(postsData.posts && postsData.posts.length > 0) {
        for(const post of postsData.posts) {
           console.log("Post:", post.title);
           const commentsRes = await fetch(`https://www.worksapis.com/v1.0/boards/${board.boardId}/posts/${post.postId}/comments`, {
             headers: { Authorization: `Bearer ${token}` }
           });
           const commentsData = await commentsRes.json();
           console.log("Comments:", JSON.stringify(commentsData, null, 2));
           if(commentsData.comments && commentsData.comments.length > 0) {
              return; // Stop after finding first post with some data
           }
        }
     }
  }
}
test();
