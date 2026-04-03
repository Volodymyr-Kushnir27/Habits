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

export async function deleteHistoryEntry({ habitId, doneDate }) {
  const user = await getCurrentUser();

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('habit_id', habitId)
    .eq('done_date', doneDate);

  if (error) throw error;

  return true;
}