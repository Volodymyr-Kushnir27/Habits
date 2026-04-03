import { supabaseAdmin } from '../supabaseAdmin.js';

export async function uploadOriginal({ buffer, path }) {
  const { error } = await supabaseAdmin.storage
    .from('puzzles-originals')
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  return path;
}