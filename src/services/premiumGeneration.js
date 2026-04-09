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

export async function createPremiumAvatarJob({ sourceImagePath, prompt }) {
  const { data, error } = await supabase.functions.invoke(
    'create-premium-avatar-job',
    {
      body: {
        sourceImagePath,
        prompt,
      },
    }
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data;
}

export async function getMyLatestPremiumJob() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('premium_generation_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getMyPremiumGenerationLimit() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('premium_generation_limits')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function restorePremiumStatus({
  productId,
  originalTransactionId,
  expiresAt,
  isPremium,
}) {
  const { data, error } = await supabase.functions.invoke(
    'restore-premium-status',
    {
      body: {
        productId,
        originalTransactionId,
        expiresAt,
        isPremium,
      },
    }
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data;
}