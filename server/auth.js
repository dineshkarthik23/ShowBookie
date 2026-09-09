import crypto from 'crypto';

const COOKIE_NAME = 'showbookie.auth';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required.');
  return process.env.SESSION_SECRET;
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createAuthToken(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + TOKEN_TTL_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function getAuthUser(req) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data.user : null;
  } catch (_error) {
    return null;
  }
}

export function setAuthCookie(res, user) {
  const token = createAuthToken(user);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${TOKEN_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`);
}
