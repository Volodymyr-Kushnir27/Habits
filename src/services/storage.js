import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export async function uploadAvatar(userId, imageUri) {
  try {
    if (!userId) throw new Error('No userId provided');
    if (!imageUri) throw new Error('No imageUri provided');

    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const normalizedExt = fileExt === 'png' ? 'png' : 'jpg';
    const mimeType = normalizedExt === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${userId}/avatar.${normalizedExt}`;

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return {
      publicUrl: data.publicUrl,
      storagePath: filePath,
    };
  } catch (error) {
    console.error('AVATAR UPLOAD ERROR:', error);
    throw error;
  }
}