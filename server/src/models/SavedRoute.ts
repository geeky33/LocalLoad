import { Schema, model } from 'mongoose';
import { LINES } from '../types';

const savedRouteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    source: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    destination: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    preferredTime: { type: String, required: true }, // "HH:mm"
    line: { type: String, enum: LINES, required: true },
    preference: { type: String, enum: ['fast', 'slow', 'any'], default: 'any' },
  },
  { timestamps: true },
);

export const SavedRoute = model('SavedRoute', savedRouteSchema);
