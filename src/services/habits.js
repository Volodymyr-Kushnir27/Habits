import { supabase } from '../lib/supabase';

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

  if (error) {
    if (
      error.message?.includes('relation') ||
      error.message?.includes('does not exist') ||
      error.message?.includes('puzzle_unlocks')
    ) {
      return 0;
    }

    throw error;
  }

  return count || 0;
}

export async function getHabits({ fromDate, toDate }) {
  const user = await getCurrentUser();

  const monthEndIso = `${toDate}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .lte('created_at', monthEndIso)
    .or(`archived_at.is.null,archived_at.gt.${monthEndIso}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createHabit({
  title,
  description = '',
  color = '#67A8FF',
  icon = null,
}) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      color,
      icon,
      is_archived: false,
      archived_at: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHabitTitle({ habitId, title }) {
  const { data, error } = await supabase
    .from('habits')
    .update({ title: title.trim() })
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHabitDescription({ habitId, description }) {
  const { data, error } = await supabase
    .from('habits')
    .update({ description: description.trim() })
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHabitColor({ habitId, color }) {
  const { data, error } = await supabase
    .from('habits')
    .update({ color })
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHabit(habitId) {
  const archivedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('habits')
    .update({
      is_archived: true,
      archived_at: archivedAt,
    })
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function restoreHabit(habitId) {
  const { data, error } = await supabase
    .from('habits')
    .update({
      is_archived: false,
      archived_at: null,
    })
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleHabitDay({ habitId, doneDate, isDone }) {
  const user = await getCurrentUser();

  const { data: existing, error: selectError } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('done_date', doneDate)
    .maybeSingle();

  if (selectError) throw selectError;

  if (!existing) {
    const { error } = await supabase.from('habit_logs').insert({
      user_id: user.id,
      habit_id: habitId,
      done_date: doneDate,
      is_done: true,
    });

    if (error) throw error;
    return true;
  }

  if (existing.is_done === isDone) {
    return true;
  }

  if (existing.is_done === true && isDone === false) {
    const earned = await getEarnedFlamesCount(user.id);
    const spent = await getSpentFlamesCount(user.id);

    if (earned - 1 < spent) {
      throw new Error(
        'Цей вогник вже витрачений на пазл. Спочатку зароби ще вогники, щоб зняти позначку.'
      );
    }
  }

  const { error } = await supabase
    .from('habit_logs')
    .update({ is_done: isDone })
    .eq('id', existing.id);

  if (error) throw error;
  return true;
}

export async function getMonthHabitLogs({ fromDate, toDate }) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('done_date', fromDate)
    .lte('done_date', toDate);

  if (error) throw error;
  return data || [];
}

export async function getHabitLogsForStreak({ toDate }) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('habit_logs')
    .select('habit_id, done_date, is_done')
    .eq('user_id', user.id)
    .eq('is_done', true)
    .lte('done_date', toDate);

  if (error) throw error;
  return data || [];
}

export async function getAllHistoryLogs() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('habit_logs')
    .select(`
      id,
      habit_id,
      done_date,
      is_done,
      created_at,
      habits (
        id,
        title,
        description,
        color,
        created_at,
        archived_at
      )
    `)
    .eq('user_id', user.id)
    .eq('is_done', true)
    .order('done_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getHistoryByRange({ fromDate, toDate }) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('habit_logs')
    .select(`
      id,
      habit_id,
      done_date,
      is_done,
      created_at,
      habits (
        id,
        title,
        description,
        color,
        created_at,
        archived_at
      )
    `)
    .eq('user_id', user.id)
    .eq('is_done', true)
    .gte('done_date', fromDate)
    .lte('done_date', toDate)
    .order('done_date', { ascending: false });

  if (error) throw error;
  return data || [];
}