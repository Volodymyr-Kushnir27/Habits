import { supabase } from '../lib/supabase';
import { getCurrentSession } from './auth';

async function getCurrentUser() {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}

async function getEarnedFlamesCount(userId) {
  const { count, error } = await supabase
    .from('habit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_done', true);

  if (error) throw error;
  return count || 0;
}

async function getSpentFlamesCount(userId) {
  const { count, error } = await supabase
    .from('avatar_puzzle_unlocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function getFlameStats() {
  const user = await getCurrentUser();

  const earned = await getEarnedFlamesCount(user.id);
  const spent = await getSpentFlamesCount(user.id);
  const available = Math.max(0, earned - spent);

  return { earned, spent, available };
}

export async function enqueueAvatarGenerationJob({ avatarPath }) {
  const user = await getCurrentUser();

  if (!avatarPath) {
    throw new Error('avatarPath is required');
  }

  const { data, error } = await supabase
    .from('avatar_generation_jobs')
    .insert({
      user_id: user.id,
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
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('avatar_generation_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getMyAvatarVariants(jobId) {
  const user = await getCurrentUser();

  if (!jobId) return [];

  const { data, error } = await supabase
    .from('avatar_variants')
    .select('*')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .order('idx', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUnlockedPieceIndexes(variantId) {
  const user = await getCurrentUser();

  if (!variantId) return [];

  const { data, error } = await supabase
    .from('avatar_puzzle_unlocks')
    .select('piece_index')
    .eq('user_id', user.id)
    .eq('variant_id', variantId);

  if (error) throw error;
  return (data || []).map((x) => x.piece_index);
}

export async function unlockPuzzlePiece({ variantId, pieceIndex }) {
  const user = await getCurrentUser();

  const { data: existing, error: existingError } = await supabase
    .from('avatar_puzzle_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('variant_id', variantId)
    .eq('piece_index', pieceIndex)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return { alreadyUnlocked: true, completed: false };

  const { error } = await supabase
    .from('avatar_puzzle_unlocks')
    .insert({
      user_id: user.id,
      variant_id: variantId,
      piece_index: pieceIndex,
    });

  if (error) throw error;

  const { data: variant, error: variantError } = await supabase
    .from('avatar_variants')
    .select('pieces_count')
    .eq('id', variantId)
    .single();

  if (variantError) throw variantError;

  const { count, error: countError } = await supabase
    .from('avatar_puzzle_unlocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('variant_id', variantId);

  if (countError) throw countError;

  let completed = false;

  if ((count || 0) >= (variant?.pieces_count || 0)) {
    const { error: updateError } = await supabase
      .from('avatar_variants')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', variantId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;
    completed = true;
  }

  return {
    alreadyUnlocked: false,
    completed,
  };
}

export async function markVariantCompleted({ variantId, generatedPath, generatedUrl }) {
  const user = await getCurrentUser();

  const { error: variantError } = await supabase
    .from('avatar_variants')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', variantId)
    .eq('user_id', user.id);

  if (variantError) throw variantError;

  const { data, error: profileError } = await supabase
    .from('profiles')
    .update({
      completed_avatar_variant_id: variantId,
      completed_avatar_path: generatedPath,
      completed_avatar_url: generatedUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (profileError) throw profileError;
  return data;
}

export function getPublicImageUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}