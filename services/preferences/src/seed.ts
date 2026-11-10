import { config } from './config.js';
import { connectToDatabase, disconnectFromDatabase } from './db.js';
import { PreferenceModel } from './preferences/preference.model.js';

const users = [
  { _id: 'u1', optedOut: false },
  { _id: 'u2', optedOut: true },
];

try {
  await connectToDatabase(config.MONGO_URL);
  for (const user of users) {
    // $set resets optedOut, so a repeated run returns each user to this state.
    await PreferenceModel.updateOne(
      { _id: user._id },
      { $set: { optedOut: user.optedOut } },
      { upsert: true },
    );
  }
  console.log(`Seeded ${users.length} users: ${users.map((user) => user._id).join(', ')}`);
} catch (err) {
  console.error('Seed failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectFromDatabase();
}
