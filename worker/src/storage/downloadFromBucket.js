import { supabaseAdmin } from '../supabaseAdmin.js';

export async function downloadAvatar(path) {
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .download(path);

  if (error) throw error;

  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer;
}