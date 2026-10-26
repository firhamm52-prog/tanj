const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export async function uploadCmsVideo(
  file,
  {
    getClient = async () => (await import('./supabase-customer.js?v=improve-2')).cloudClient(),
  } = {},
) {
  const contentType =
    (!file?.type || file.type === 'application/octet-stream') && /\.mov$/i.test(file?.name || '')
      ? 'video/quicktime'
      : file?.type;
  const extension = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }[
    contentType
  ];
  if (!extension) throw Error('Pilih video MP4, WebM atau MOV.');
  if (!file.size || file.size > 50 * 1024 * 1024) throw Error('Ukuran video maksimal 50 MB.');
  const client = await getClient();
  const bucket = client.storage.from('cms-videos');
  const path = 'content/' + crypto.randomUUID() + '.' + extension;
  const { error } = await bucket.upload(path, file, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error)
    throw Error(
      'Video gagal diunggah. Pastikan sesi admin aktif serta SQL 026 dan 027 untuk upload video sudah dijalankan.',
    );
  const { data } = bucket.getPublicUrl(path);
  if (!data?.publicUrl?.startsWith('https://'))
    throw Error('URL video belum tersedia. Coba unggah lagi.');
  return data.publicUrl;
}
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
