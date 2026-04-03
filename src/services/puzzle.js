import { supabase } from '../lib/supabase';
import { getCurrentSession } from './auth';

async function getCurrentUser() {
  const session = await getCurrentSession();
  const user = session?.user;

  console.log('PUZZLE:getCurrentUser session:', session);
  console.log('PUZZLE:getCurrentUser user:', user);

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}

async function getEarnedFlamesCount(userId) {
  console.log('PUZZLE:getEarnedFlamesCount input:', { userId });

  const { count, error } = await supabase
    .from('habit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_done', true);

  console.log('PUZZLE:getEarnedFlamesCount response:', { count, error });

  if (error) throw error;
  return count || 0;
}

async function getSpentFlamesCount(userId) {
  console.log('PUZZLE:getSpentFlamesCount input:', { userId });

  const { count, error } = await supabase
    .from('puzzle_unlocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log('PUZZLE:getSpentFlamesCount response:', { count, error });

  if (error) {
    if (
      error.message?.includes('relation') ||
      error.message?.includes('does not exist') ||
      error.message?.includes('puzzle_unlocks')
    ) {
      console.log('PUZZLE:getSpentFlamesCount fallback to 0 because table is missing');
      return 0;
    }
    throw error;
  }

  return count || 0;
}

export async function getFlameStats() {
  const user = await getCurrentUser();

  console.log('PUZZLE:getFlameStats user:', user.id);

  const earned = await getEarnedFlamesCount(user.id);
  const spent = await getSpentFlamesCount(user.id);
  const available = Math.max(0, earned - spent);

  const result = {
    earned,
    spent,
    available,
  };

  console.log('PUZZLE:getFlameStats result:', result);

  return result;
}

export async function enqueueAvatarGenerationJob({ avatarPath }) {
  const user = await getCurrentUser();

  console.log('PUZZLE:enqueueAvatarGenerationJob input:', {
    user_id: user.id,
    avatar_path: avatarPath,
  });

  if (!avatarPath) {
    throw new Error('avatarPath is required');
  }

  const payload = {
    user_id: user.id,
    avatar_path: avatarPath,
    status: 'pending',
    progress_stage: 'queued',
    progress_percent: 0,
  };

  console.log('PUZZLE:enqueueAvatarGenerationJob payload:', payload);

  const { data, error } = await supabase
    .from('avatar_generation_jobs')
    .insert(payload)
    .select()
    .single();

  console.log('PUZZLE:enqueueAvatarGenerationJob response:', { data, error });

  if (error) throw error;
  return data;
}

export async function getMyLatestAvatarJob() {
  const user = await getCurrentUser();

  console.log('PUZZLE:getMyLatestAvatarJob user:', user.id);

  const { data, error } = await supabase
    .from('avatar_generation_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('PUZZLE:getMyLatestAvatarJob response:', { data, error });

  if (error) throw error;
  return data || null;
}

export async function getMyAvatarVariants(jobId) {
  const user = await getCurrentUser();

  console.log('PUZZLE:getMyAvatarVariants input:', {
    user_id: user.id,
    jobId,
  });

  if (!jobId) {
    console.log('PUZZLE:getMyAvatarVariants no jobId, return []');
    return [];
  }

  const { data, error } = await supabase
    .from('avatar_variants')
    .select('*')
    .eq('user_id', user.id)
    .eq('job_id', jobId)
    .order('idx', { ascending: true });

  console.log('PUZZLE:getMyAvatarVariants response:', { data, error });

  if (error) throw error;
  return data || [];
}

export async function getUnlockedPieceIndexes(variantId) {
  const user = await getCurrentUser();

  console.log('PUZZLE:getUnlockedPieceIndexes input:', {
    user_id: user.id,
    variantId,
  });

  if (!variantId) {
    console.log('PUZZLE:getUnlockedPieceIndexes no variantId, return []');
    return [];
  }

  const { data, error } = await supabase
    .from('puzzle_unlocks')
    .select('piece_index')
    .eq('user_id', user.id)
    .eq('variant_id', variantId);

  console.log('PUZZLE:getUnlockedPieceIndexes response:', { data, error });

  if (error) throw error;

  const result = (data || []).map((x) => x.piece_index);
  console.log('PUZZLE:getUnlockedPieceIndexes result:', result);

  return result;
}

export async function unlockPuzzlePiece({ variantId, pieceIndex }) {
  const user = await getCurrentUser();

  console.log('PUZZLE:unlockPuzzlePiece input:', {
    user_id: user.id,
    variantId,
    pieceIndex,
  });

  const { data: existing, error: existingError } = await supabase
    .from('puzzle_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('variant_id', variantId)
    .eq('piece_index', pieceIndex)
    .maybeSingle();

  console.log('PUZZLE:unlockPuzzlePiece existing response:', {
    existing,
    existingError,
  });

  if (existingError) throw existingError;
  if (existing) {
    console.log('PUZZLE:unlockPuzzlePiece already exists');
    return existing;
  }

  const insertPayload = {
    user_id: user.id,
    variant_id: variantId,
    piece_index: pieceIndex,
  };

  console.log('PUZZLE:unlockPuzzlePiece insert payload:', insertPayload);

  const { data, error } = await supabase
    .from('puzzle_unlocks')
    .insert(insertPayload)
    .select()
    .single();

  console.log('PUZZLE:unlockPuzzlePiece insert response:', { data, error });

  if (error) throw error;
  return data;
}

export async function markVariantCompleted({ variantId, generatedPath, generatedUrl }) {
  const user = await getCurrentUser();

  console.log('PUZZLE:markVariantCompleted input:', {
    user_id: user.id,
    variantId,
    generatedPath,
    generatedUrl,
  });

  const variantPatch = {
    is_completed: true,
    completed_at: new Date().toISOString(),
  };

  const { error: variantError } = await supabase
    .from('avatar_variants')
    .update(variantPatch)
    .eq('id', variantId)
    .eq('user_id', user.id);

  console.log('PUZZLE:markVariantCompleted variant update:', {
    variantPatch,
    variantError,
  });

  if (variantError) throw variantError;

  const profilePatch = {
    completed_avatar_variant_id: variantId,
    completed_avatar_path: generatedPath,
    completed_avatar_url: generatedUrl,
    updated_at: new Date().toISOString(),
  };

  const { data, error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', user.id)
    .select()
    .single();

  console.log('PUZZLE:markVariantCompleted profile update:', {
    profilePatch,
    data,
    profileError,
  });

  if (profileError) throw profileError;
  return data;
}