import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { ENV } from '../utils/env';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
  type: z.enum(['student', 'teacher']).optional()
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parse = credentialsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ msg: 'Invalid input' });
  const { username, password, type } = parse.data;

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ msg: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: hashed, type: type ?? 'student' });

  res.json({ msg: 'Registered', user: { id: user.id, username: user.username } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parse = credentialsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ msg: 'Invalid input' });
  const { username, password } = parse.data;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ msg: 'User not found' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ msg: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id }, ENV.JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, type: user.type, petLevel: user.petLevel, completedModules: user.completedModules }
  });
});

// GET /api/auth/me (example protected)
router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select('-password');
  res.json({ user });
});

export default router;
