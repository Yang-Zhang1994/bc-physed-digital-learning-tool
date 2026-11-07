import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/user';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  UserRole,
} from '../utils/tokens';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from '../utils/cookies';

const router = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
  type: z.enum(['student', 'teacher']).optional(),
});

function publicUser(user: InstanceType<typeof User>) {
  return {
    id: user.id,
    username: user.username,
    type: user.type,
    role: user.type,
    petLevel: user.petLevel,
    completedModules: user.completedModules,
  };
}

async function issueSession(
  res: import('express').Response,
  user: InstanceType<typeof User>
) {
  const role = (user.type as UserRole) || 'student';
  const accessToken = signAccessToken(user.id, role);
  const { raw: refreshToken } = await issueRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken }; // not returned to client in body — cookies only
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parse = credentialsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ msg: 'Invalid input' });
  const { username, password, type } = parse.data;

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ msg: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: hashed, type: type ?? 'student' });

  res.json({ msg: 'Registered', user: { id: user.id, username: user.username, type: user.type } });
});

// POST /api/auth/login — sets HttpOnly access + refresh cookies
router.post('/login', async (req, res) => {
  const parse = credentialsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ msg: 'Invalid input' });
  const { username, password } = parse.data;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ msg: 'User not found' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ msg: 'Invalid credentials' });

  await issueSession(res, user);

  res.json({
    user: publicUser(user),
  });
});

// POST /api/auth/refresh — rotate refresh cookie, mint new access cookie
router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!raw) return res.status(401).json({ msg: 'No refresh token' });

  const rotated = await rotateRefreshToken(raw);
  if (!rotated) {
    clearAuthCookies(res);
    return res.status(401).json({ msg: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(rotated.userId);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ msg: 'User not found' });
  }

  const role = (user.type as UserRole) || 'student';
  const accessToken = signAccessToken(user.id, role);
  setAuthCookies(res, accessToken, rotated.raw);

  res.json({
    user: publicUser(user),
    exp: (() => {
      try {
        const [, payloadB64] = accessToken.split('.');
        const json = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        return json.exp as number;
      } catch {
        return undefined;
      }
    })(),
  });
});

// POST /api/auth/logout — revoke refresh + clear cookies
router.post('/logout', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  await revokeRefreshToken(raw);
  clearAuthCookies(res);
  res.json({ ok: true });
});

// POST /api/auth/logout-all — revoke every refresh token for this user
router.post('/logout-all', requireAuth, async (req: AuthedRequest, res) => {
  if (req.userId) await revokeAllRefreshTokensForUser(req.userId);
  clearAuthCookies(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(404).json({ msg: 'User not found' });
  res.json({
    user: publicUser(user),
    tokenExp: req.tokenExp,
  });
});

export default router;
