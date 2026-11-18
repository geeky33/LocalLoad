import { Schema, model } from 'mongoose';
import { CROWD_LEVELS } from '../types';

const crowdReportSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trainInstance: { type: Schema.Types.ObjectId, ref: 'TrainInstance', required: true },
    train: { type: Schema.Types.ObjectId, ref: 'Train', required: true },
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    level: { type: String, enum: CROWD_LEVELS, required: true },
    reportedAt: { type: Date, default: Date.now },
    // floor(reportedAt / reportingWindow). Used by the unique index below so the
    // database itself rejects a second vote from the same user in the same window.
    windowBucket: { type: Number, required: true },
    isSample: { type: Boolean, default: false }, // seeded historical demo data
  },
  { timestamps: true },
);
crowdReportSchema.index({ user: 1, trainInstance: 1, station: 1, windowBucket: 1 }, { unique: true });
crowdReportSchema.index({ trainInstance: 1, station: 1, reportedAt: -1 });
crowdReportSchema.index({ reportedAt: -1 });

export const CrowdReport = model('CrowdReport', crowdReportSchema);
