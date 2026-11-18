import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { signToken } from '../middleware/auth';
import { CrowdReport, DelayReport, User } from '../models';
import { HttpError } from '../utils/httpError';

const publicUser = (u: any) => ({
  _id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  points: u.points,
  notificationSettings: u.notificationSettings,
  createdAt: u.createdAt,
});

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({ token: signToken({ id: String(user._id), role: user.role as 'user' }), user: publicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
  res.json({ token: signToken({ id: String(user._id), role: user.role as 'user' | 'admin' }), user: publicUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id).lean();
  if (!user) throw new HttpError(404, 'User not found');
  const [crowdReports, delayReports] = await Promise.all([
    CrowdReport.countDocuments({ user: user._id, isSample: false }),
    DelayReport.countDocuments({ user: user._id, isSample: false }),
  ]);
  res.json({ user: publicUser(user), stats: { crowdReports, delayReports } });
}
