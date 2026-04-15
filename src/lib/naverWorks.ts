import jwt from 'jsonwebtoken';

const CLIENT_ID = process.env.NAVER_WORKS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.NAVER_WORKS_CLIENT_SECRET || '';
const SERVICE_ACCOUNT = process.env.NAVER_WORKS_SERVICE_ACCOUNT || '';
// Replace encoded newlines if they exist
const PRIVATE_KEY = (process.env.NAVER_WORKS_PRIVATE_KEY || '').replace(/\\n/g, '\n');

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

export async function getNaverWorksAccessToken() {
  // Return cached token if still valid (adding 1 min buffer)
  if (cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 60000) {
    return cachedAccessToken;
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour

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
  // Removed calendar scopes since they are no longer needed
  params.append('scope', 'board board.read');

  const res = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to get Naver Works Access Token:', text);
    throw new Error('Failed to fetch token from Naver Works');
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  tokenExpiryTime = Date.now() + data.expires_in * 1000;

  return cachedAccessToken;
}

export async function fetchBoards() {
  const token = await getNaverWorksAccessToken();
  const res = await fetch('https://www.worksapis.com/v1.0/boards', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch boards');
  const text = await res.text();
  return JSON.parse(text.replace(/([:\[,]\s*)([0-9]{15,})\b/g, '$1"$2"'));
}

export async function fetchPosts(boardId: string, cursor?: string) {
  const token = await getNaverWorksAccessToken();
  const url = cursor 
    ? `https://www.worksapis.com/v1.0/boards/${boardId}/posts?cursor=${cursor}`
    : `https://www.worksapis.com/v1.0/boards/${boardId}/posts`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  const text = await res.text();
  return JSON.parse(text.replace(/([:\[,]\s*)([0-9]{15,})\b/g, '$1"$2"'));
}

export async function fetchComments(boardId: string, postId: string) {
  const token = await getNaverWorksAccessToken();
  const res = await fetch(`https://www.worksapis.com/v1.0/boards/${boardId}/posts/${postId}/comments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
     const text = await res.text();
     console.error('Failed to fetch comments:', text);
     throw new Error('Failed to fetch comments');
  }
  const text = await res.text();
  return JSON.parse(text.replace(/([:\[,]\s*)([0-9]{15,})\b/g, '$1"$2"'));
}
