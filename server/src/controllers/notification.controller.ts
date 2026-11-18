import { Request, Response } from 'express';
import { Notification, User } from '../models';

export async function listNotifications(req: Request, res: Response) {
  const items = await Notification.find({ user: req.user!.id }).sort({ createdAt: -1 }).limit(30).lean();
  res.json(items);
}

export async function updateSettings(req: Request, res: Response) {
  const set: Record<string, boolean> = {};
  for (const key of ['enabled', 'crowd', 'delay', 'nearby'] as const) {
    if (typeof req.body[key] === 'boolean') set[`notificationSettings.${key}`] = req.body[key];
  }
  const user = await User.findByIdAndUpdate(req.user!.id, { $set: set }, { returnDocument: 'after' }).lean();
  res.json(user?.notificationSettings);
}

export async function markAllRead(req: Request, res: Response) {
  await Notification.updateMany({ user: req.user!.id, read: false }, { $set: { read: true } });
  res.status(204).end();
}
