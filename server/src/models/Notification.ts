import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['crowd', 'delay', 'nearby', 'info'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    train: { type: Schema.Types.ObjectId, ref: 'Train' },
    trainInstance: { type: Schema.Types.ObjectId, ref: 'TrainInstance' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
