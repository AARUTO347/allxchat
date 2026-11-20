// Netlify Function: Backblaze B2 delete (best-effort).
// Verifies Firebase ID token + conversation membership, resolves the file id
// by name, then deletes the version. Failures are non-fatal for the caller.

const ALLOWED_ORIGINS = new Set([
  'https://allxchat.netlify.app',
  'https://allxchat-12a8b.web.app',
  'https://allxchat-12a8b.firebaseapp.com',
  'https://aaruto347.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const RTDB_URL = 'https://allxchat-12a8b-default-rtdb.asia-southeast1.firebasedatabase.app';
const FIREBASE_WEB_API_KEY = 'AIzaSyAxuFQi5bSJ-viRUMGmmz9L1jUoEd3MpKw';

let b2Auth = null;
async function authorizeB2() {
  if (b2Auth && b2Auth.expiresAt > Date.now()) return b2Auth;
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APP_KEY;
  if (!keyId || !appKey) throw new Error('B2_KEY_ID / B2_APP_KEY not configured on the server.');
  const basic = Buffer.from(`${keyId}:${appKey}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`B2 authorize failed: ${res.status}`);
  const data = await res.json();
  b2Auth = {
    authToken: data.authorizationToken,
    apiUrl: data.apiUrl,
    downloadUrl: data.downloadUrl,
    accountId: data.accountId,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };
  return b2Auth;
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (ALLOWED_ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

async function verifyFirebaseToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.users?.[0]?.localId || null;
  } catch {
    return null;
  }
}

function conversationFromKey(key) {
  const parts = String(key || '').split('/');
  return parts.length >= 2 && parts[0] === 'allxchat' ? parts[1] : null;
}

async function checkMembership(idToken, uid, conversationId) {
  if (!idToken || !uid || !conversationId) return false;
  try {
    const url = `${RTDB_URL}/conversations/${encodeURIComponent(conversationId)}.json?auth=${encodeURIComponent(idToken)}`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data || typeof data !== 'object') return false;
    return data.participantIds?.[uid] === true;
  } catch {
    return false;
  }
}

exports.handler = async (event) => {
  const origin = (event.headers || {}).origin || '';
  const cors = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed.' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const idToken = payload.idToken;
  const uid = await verifyFirebaseToken(idToken);
  if (!uid) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthenticated.' }) };

  const objectKey = String(payload.objectKey || '');
  if (!objectKey || objectKey.includes('..') || objectKey.startsWith('/')) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid objectKey.' }) };
  }

  const conversationId = conversationFromKey(objectKey);
  if (!conversationId) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'objectKey missing conversation.' }) };
  const isMember = await checkMembership(idToken, uid, conversationId);
  if (!isMember) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Not a conversation participant.' }) };

  // Only allow deleting objects under the caller's own uid segment.
  const parts = objectKey.split('/');
  if (parts[2] !== uid) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Cannot delete another user\'s file.' }) };
  }

  let auth;
  try { auth = await authorizeB2(); } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: e.message }) };
  }

  // Resolve fileId by name.
  let fileId = null;
  try {
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID, prefix: objectKey, maxFileCount: 1 }),
    });
    if (res.ok) {
      const data = await res.json();
      const f = (data.files || []).find((x) => x.fileName === objectKey);
      if (f) fileId = f.fileId;
    }
  } catch {
    // ignore
  }

  if (!fileId) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ deleted: false, reason: 'not found' }) };
  }

  try {
    const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileName: objectKey }),
    });
    if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: e.message }) };
  }

  return { statusCode: 200, headers: cors, body: JSON.stringify({ deleted: true }) };
};
