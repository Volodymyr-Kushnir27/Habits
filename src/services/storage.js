import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

function guessExt(asset) {
  if (asset?.fileName && asset.fileName.includes('.')) {
    return asset.fileName.split('.').pop().toLowerCase();
  }
  if (asset?.mimeType === 'image/png') return 'png';
  if (asset?.mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadAvatarToStorage({ userId, asset }) {
  if (!userId) throw new Error('uploadAvatarToStorage: userId is required');
  if (!asset) throw new Error('uploadAvatarToStorage: asset is required');

  const contentType = asset.mimeType || 'image/jpeg';
  const ext = guessExt(asset);
  const storagePath = `${userId}/source/avatar_${Date.now()}.${ext}`;

  let fileBody;

  if (asset.file) {
    fileBody = asset.file;
  } else if (asset.base64) {
    fileBody = decode(asset.base64);
  } else if (asset.uri) {
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error('Не вдалося прочитати файл аватара');
    }
    fileBody = await response.arrayBuffer();
  } else {
    throw new Error('У asset немає file/base64/uri');
  }

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(storagePath, fileBody, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });

  if (error) throw error;

  const { data: publicData } = supabase.storage
    .from('avatars')
    .getPublicUrl(data.path);

  return {
    storagePath: data.path,
    publicUrl: publicData.publicUrl,
    contentType,
  };
}

export async function uploadAvatar(userId, asset) {
  return uploadAvatarToStorage({ userId, asset });
}