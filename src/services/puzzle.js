import { supabase } from '../lib/supabase';

export const DEFAULT_PUZZLE_YEAR = 2026;
export const DEFAULT_PUZZLE_PIECES_COUNT = 30;

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('User not found');

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
    .from('puzzle_unlocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function getFlameStats() {
  const user = await getCurrentUser();

  const earned = await getEarnedFlamesCount(user.id);
  const spent = await getSpentFlamesCount(user.id);
  const available = Math.max(earned - spent, 0);

  return {
    earned,
    spent,
    available,
  };
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

export async function getPuzzleUnlocks({ puzzleKey }) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('puzzle_unlocks')
    .select('id, piece_index, unlocked_at')
    .eq('user_id', user.id)
    .eq('puzzle_key', puzzleKey)
    .order('piece_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function unlockPuzzlePiece({ puzzleKey, pieceIndex, piecesCount = 30 }) {
  const user = await getCurrentUser();

  if (
    typeof pieceIndex !== 'number' ||
    pieceIndex < 0 ||
    pieceIndex >= piecesCount
  ) {
    throw new Error('Некоректний індекс пазла');
  }

  const { data: existing, error: existingError } = await supabase
    .from('puzzle_unlocks')
    .select('id')
    .eq('user_id', user.id)
    .eq('puzzle_key', puzzleKey)
    .eq('piece_index', pieceIndex)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    return existing;
  }

  const stats = await getFlameStats();

  if (stats.available < 1) {
    throw new Error('Недостатньо вогників для відкриття пазла');
  }

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

export function getPuzzlePiecePublicUrl(piecePath, version = '') {
  const { data } = supabase.storage.from('puzzles-pieces').getPublicUrl(piecePath);
  const baseUrl = data?.publicUrl || '';
  if (!baseUrl) return '';
  return version ? `${baseUrl}?v=${encodeURIComponent(version)}` : baseUrl;
}

export function getPuzzlePreviewPublicUrl(previewPath, version = '') {
  const { data } = supabase.storage.from('puzzles-originals').getPublicUrl(previewPath);
  const baseUrl = data?.publicUrl || '';
  if (!baseUrl) return '';
  return version ? `${baseUrl}?v=${encodeURIComponent(version)}` : baseUrl;
}