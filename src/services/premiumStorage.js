import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { getCurrentSession } from './auth';

function guessExt(asset) {
  if (asset?.fileName && asset.fileName.includes('.')) {
    return asset.fileName.split('.').pop().toLowerCase();
  }
  if (asset?.mimeType === 'image/png') return 'png';
  if (asset?.mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function getCurrentUser() {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}

export async function uploadPremiumSourceImage(asset) {
  const user = await getCurrentUser();

  if (!asset) {
    throw new Error('Asset is required');
  }

  const contentType = asset.mimeType || 'image/jpeg';
  const ext = guessExt(asset);
  const storagePath = `${user.id}/premium-source/source_${Date.now()}.${ext}`;

  let fileBody;

  if (asset.file) {
    fileBody = asset.file;
  } else if (asset.base64) {
    fileBody = decode(asset.base64);
  } else if (asset.uri) {
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error('Не вдалося прочитати premium source image');
    }
    fileBody = await response.arrayBuffer();
  } else {
    throw new Error('У asset немає file/base64/uri');
  }

  const { data, error } = await supabase.storage
    .from('premium-source-images')
    .upload(storagePath, fileBody, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });

  if (error) throw error;

  return {
    storagePath: data.path,
    contentType,
  };
}