import type { Express } from 'express';
import { createApp } from './app.js';
import { config } from './config.js';

let app: Express;
try {
  app = await createApp(config);
} catch (err) {
  console.error('Failed to start:', err);
  process.exit(1);
}

app.listen(config.PORT, (err) => {
  if (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
  console.log(`notifications-api listening on port ${config.PORT}`);
});
