import mongoose from 'mongoose';

export async function connectDB(uri: string) {
  await mongoose.connect(uri);
  // Make sure unique indexes (e.g. duplicate-vote protection) exist before we accept traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  console.log(`[db] connected to ${mongoose.connection.name}`);
}
