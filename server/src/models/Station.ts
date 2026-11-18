import { Schema, model } from 'mongoose';
import { LINES } from '../types';

// One record per station *per line* (Dadar on Western and Central are separate records).
const stationSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    line: { type: String, enum: LINES, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    sequence: { type: Number, required: true }, // order along the line, starting from the city terminus
  },
  { timestamps: true },
);
stationSchema.index({ line: 1, sequence: 1 });

export const Station = model('Station', stationSchema);
