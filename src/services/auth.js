import { supabase } from '../lib/supabase';

export async function signUpWithEmail({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data?.user;

  if (user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: name || '',
    });

    if (profileError) throw profileError;
  }

  return data;
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const user = data?.user;
  if (user) {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
    });
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('User not found');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
    })
    .select()
    .single();

  if (createError) throw createError;
  return created;
}

export async function updateMyProfile({ name, avatar_url, avatar_path }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('User not found');

  const payload = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof name === 'string') payload.name = name.trim();
  if (typeof avatar_url === 'string') payload.avatar_url = avatar_url;
  if (typeof avatar_path === 'string') payload.avatar_path = avatar_path;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}