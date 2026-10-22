const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export async function uploadCmsImage(
  file,
  {
    getClient = async () => (await import('./supabase-customer.js?v=improve-2')).cloudClient(),
  } = {},
) {
  if (!file || !extensions[file.type]) throw Error('Pilih foto JPG, PNG atau WebP.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw Error('Ukuran foto maksimal 5 MB.');
  const client = await getClient();
  const bucket = client.storage.from('cms-media');
  const path = 'products/' + crypto.randomUUID() + '.' + extensions[file.type];
  const { error } = await bucket.upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error)
    throw Error(
      'Foto gagal diunggah. Pastikan sesi admin aktif dan pengaturan unggah foto sudah dipasang di Supabase.',
    );
  const { data } = bucket.getPublicUrl(path);
  if (!data?.publicUrl?.startsWith('https://'))
    throw Error('URL foto belum tersedia. Coba unggah lagi.');
  return data.publicUrl;
}
