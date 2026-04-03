import { supabaseAdmin } from '../supabaseAdmin.js';
import { processAvatarJob } from './processAvatarJob.js';

export async function pollJobs() {
  const { data: jobs, error } = await supabaseAdmin
    .from('avatar_generation_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('POLL JOBS ERROR', error);
    return;
  }

  if (!jobs?.length) {
    console.log('NO PENDING JOBS');
    return;
  }

  await processAvatarJob(jobs[0]);
}