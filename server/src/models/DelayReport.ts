import { Schema, model } from 'mongoose';
import { DELAY_CATEGORIES } from '../types';

const delayReportSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trainInstance: { type: Schema.Types.ObjectId, ref: 'TrainInstance', required: true },
    train: { type: Schema.Types.ObjectId, ref: 'Train', required: true },
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    category: { type: String, enum: DELAY_CATEGORIES, required: true },
    reportedAt: { type: Date, default: Date.now },
    windowBucket: { type: Number, required: true },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);
delayReportSchema.index({ user: 1, trainInstance: 1, station: 1, windowBucket: 1 }, { unique: true });
delayReportSchema.index({ trainInstance: 1, station: 1, reportedAt: -1 });

export const DelayReport = model('DelayReport', delayReportSchema);
