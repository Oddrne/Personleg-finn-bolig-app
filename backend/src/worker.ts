import { processNextJob } from './services/jobQueue.js';

const interval = setInterval(async () => {
  try {
    await processNextJob();
  } catch (error) {
    console.error('Worker error', error);
  }
}, 2000);

process.on('SIGINT', () => {
  clearInterval(interval);
  process.exit(0);
});
