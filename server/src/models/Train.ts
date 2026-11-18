import { Schema, model } from 'mongoose';
import { LINES } from '../types';

// Static timetable entry (SIMULATED timetable - not official railway data).
const trainSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    line: { type: String, enum: LINES, required: true },
    type: { type: String, enum: ['fast', 'slow'], required: true },
    direction: { type: String, enum: ['up', 'down'], required: true }, // down = away from Churchgate/CSMT
    source: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    destination: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    stations: [{ type: Schema.Types.ObjectId, ref: 'Station', required: true }], // ordered halts
    departureTime: { type: String, required: true }, // "HH:mm"
    durationMin: { type: Number, required: true },
  },
  { timestamps: true },
);
trainSchema.index({ line: 1, type: 1, direction: 1 });

export const Train = model('Train', trainSchema);
