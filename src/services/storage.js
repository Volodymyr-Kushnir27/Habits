import { supabase } from '../lib/supabase';

export async function uploadAvatar(userId, imageUri) {
  try {
    if (!userId) throw new Error('No userId provided');
    if (!imageUri) throw new Error('No imageUri provided');

    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = ext.includes('?') ? ext.split('?')[0] : ext;
    const filePath = `${userId}/avatar-${Date.now()}.${cleanExt}`;

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: blob.type || 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('AVATAR UPLOAD ERROR:', error);
    throw error;
  }
}