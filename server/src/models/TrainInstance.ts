import { Schema, model } from 'mongoose';

// A running copy of a train in the simulation. The simulation engine owns this state
// and writes it back to MongoDB on every tick.
const trainInstanceSchema = new Schema(
  {
    train: { type: Schema.Types.ObjectId, ref: 'Train', required: true, unique: true },
    status: { type: String, enum: ['running', 'at-station', 'completed'], default: 'at-station' },
    segmentIndex: { type: Number, default: 0 }, // index of the station the train last left / is at
    segmentProgress: { type: Number, default: 0 }, // 0..1 along the segment to the next station
    dwellTicks: { type: Number, default: 0 },
    lat: Number,
    lng: Number,
    speedKmph: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  { timestamps: true },
);

export const TrainInstance = model('TrainInstance', trainInstanceSchema);
