import { pollJobs } from './jobs/pollJobs.js';

async function start() {
  console.log('WORKER STARTED');

  while (true) {
    try {
      await pollJobs();
    } catch (e) {
      console.error('WORKER ERROR', e);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
}

start();