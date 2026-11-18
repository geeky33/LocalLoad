import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    points: { type: Number, default: 0 }, // simple contribution counter: +1 per accepted report
    isDemo: { type: Boolean, default: false }, // seeded demo / simulated commuter account
    notificationSettings: {
      enabled: { type: Boolean, default: true },
      crowd: { type: Boolean, default: true },
      delay: { type: Boolean, default: true },
      nearby: { type: Boolean, default: true }, // less-crowded trains arriving at my nearest station
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
