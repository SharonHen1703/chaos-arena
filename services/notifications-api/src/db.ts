import mongoose from 'mongoose';

// The database name comes from the path in MONGO_URL (…/notifications).
export async function connectToDatabase(url: string): Promise<void> {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 2000 });
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}

// Pings through the native driver, so Mongoose command buffering does not apply.
// When Mongo is down, the ping fails after serverSelectionTimeoutMS.
export async function isDatabaseHealthy(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) {
    return false;
  }
  try {
    await db.admin().ping();
    return true;
  } catch (err) {
    console.error('Mongo ping failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
