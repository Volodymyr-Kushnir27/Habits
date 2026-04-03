import { supabaseAdmin } from '../supabaseAdmin.js';

export async function uploadOriginal(buffer, path) {
  const contentType = path.endsWith('.png')
    ? 'image/png'
    : 'image/jpeg';

  const { error } = await supabaseAdmin.storage
    .from('puzzles-original')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('UPLOAD ERROR:', error);
    throw error;
  }

  return path;
}