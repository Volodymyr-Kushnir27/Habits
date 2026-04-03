import { supabase } from '../lib/supabase';

export async function createAvatarGenerationJob({ userId, avatarPath }) {
  if (!userId) throw new Error('Missing userId');
  if (!avatarPath) throw new Error('Missing avatarPath');

  const { data, error } = await supabase
    .from('avatar_generation_jobs')
    .insert({
      user_id: userId,
      avatar_path: avatarPath,
      status: 'pending',
      progress_stage: 'queued',
      progress_percent: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyLatestAvatarJob() {
  const { data, error } = await supabase
    .from('avatar_generation_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}