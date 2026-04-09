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

export async function getFreeCatalogPuzzles() {
  const { data, error } = await supabase
    .from('avatar_variants')
    .select('*')
    .eq('variant_type', 'free_catalog')
    .eq('is_public', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPremiumStubState() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium, premium_expires_at, premium_plan')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  const expiresAt = data?.premium_expires_at || null;
  const isPremium = !!data?.is_premium;

  return {
    isPremium,
    premiumExpiresAt: expiresAt,
    premiumPlan: data?.premium_plan || 'premium_monthly',
  };
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
  if (existing) {
    return {
      alreadyUnlocked: true,
      completed: false,
      openedPieces: null,
      totalPieces: null,
    };
  }

  const { data: variant, error: variantError } = await supabase
    .from('avatar_variants')
    .select('id, pieces_count')
    .eq('id', variantId)
    .single();

  if (variantError) throw variantError;

  const earned = await getEarnedFlamesCount(user.id);
  const spent = await getSpentFlamesCount(user.id);

  if (earned - spent <= 0) {
    throw new Error('Недостатньо вогників для відкриття пазла');
  }

  const { error: insertError } = await supabase
    .from('avatar_puzzle_unlocks')
    .insert({
      user_id: user.id,
      variant_id: variant.id,
      piece_index: pieceIndex,
    });

  if (insertError) throw insertError;

  const { count, error: countError } = await supabase
    .from('avatar_puzzle_unlocks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('variant_id', variant.id);

  if (countError) throw countError;

  const openedPieces = count || 0;
  const totalPieces = variant.pieces_count || 0;

  return {
    alreadyUnlocked: false,
    completed: openedPieces >= totalPieces,
    openedPieces,
    totalPieces,
  };
}

export function getPublicImageUrl(bucket, path) {
  if (!bucket || !path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}