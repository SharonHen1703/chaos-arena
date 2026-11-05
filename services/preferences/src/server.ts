import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.PORT, (err) => {
  if (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
  console.log(`preferences listening on port ${config.PORT}`);
});
