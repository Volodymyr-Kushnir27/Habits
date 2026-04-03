export async function uploadToBucket(supabase, bucket, path, buffer, contentType = 'image/png') {
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
  return path;
}
