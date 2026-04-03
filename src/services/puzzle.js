import { supabase } from '../lib/supabase';
import { getCurrentSession } from './auth';

export const DEFAULT_PUZZLE_YEAR = 2026;
export const DEFAULT_PUZZLE_PIECES_COUNT = 30;

async function getCurrentUser() {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}

export function getPuzzlePiecePublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from('puzzles-pieces').getPublicUrl(path);
  return data.publicUrl;
}

export async function getFlameStats() {
  const user = await getCurrentUser();

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const todayStr = today.toISOString().slice(0, 10);

  const { count, error } = await supabase
    .from('habit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_done', true)
    .gte('done_date', startOfMonth)
    .lte('done_date', todayStr);

  if (error) throw error;

  return {
    flames: count || 0,
  };
}

export async function getPuzzleUnlocks() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('puzzle_unlocks')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data || [];
}

export async function unlockPuzzlePiece({ puzzleKey, pieceIndex }) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('puzzle_unlocks')
    .insert({
      user_id: user.id,
      puzzle_key: puzzleKey,
      piece_index: pieceIndex,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
    .select('*')
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

export async function getMyLatestPuzzleSet() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('user_puzzle_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getPuzzlesBySetId(setId) {
  if (!setId) return [];

  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('set_id', setId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPuzzlesByYear(year = DEFAULT_PUZZLE_YEAR) {
  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('year', year)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function clearTodayHistory() {
  const user = await getCurrentUser();
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('done_date', today);

  if (error) throw error;
  return true;
}