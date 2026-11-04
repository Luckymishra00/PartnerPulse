import { Router } from 'express';
import User from '../models/User.js';
import { asyncH, requireAuth, requireRole, signToken } from '../middleware/auth.js';

const r = Router();

// Tells the login screen whether the first admin still has to be created
r.get(
  '/status',
  asyncH(async (_req, res) => {
    res.json({ needsSetup: (await User.countDocuments()) === 0 });
  })
);

r.post(
  '/login',
  asyncH(async (req, res) => {
    const { email = '', password = '' } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ message: 'Email or password is not correct' });
    }
    res.json({ token: signToken(user), user });
  })
);

// Open only while no user exists (first admin). After that, admins create accounts.
r.post(
  '/register',
  asyncH(async (req, res, next) => {
    if ((await User.countDocuments()) === 0) {
      req.firstUser = true;
      return next();
    }
    requireAuth(req, res, (err) => (err ? next(err) : requireRole('admin')(req, res, next)));
  }),
  asyncH(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Use a password with at least 8 characters' });
    const user = await User.create({
      name,
      email,
      passwordHash: await User.hash(password),
      role: req.firstUser ? 'admin' : role || 'manager',
    });
    res.status(201).json(req.firstUser ? { token: signToken(user), user } : { user });
  })
);

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default r;
