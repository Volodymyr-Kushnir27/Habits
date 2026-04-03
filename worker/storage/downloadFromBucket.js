export async function downloadFromBucket(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;

  return Buffer.from(await data.arrayBuffer());
}
