export const defaultSiteSettings = Object.freeze({
  lookbookTitle: 'Must be have combination.',
  storyTitle: 'Grace in\nevery detail.',
  storyText:
    'Siluet yang mengalir, warna yang menenangkan. Temani setiap langkah dengan anggun, dalam caramu sendiri.',
  instagram: 'https://www.instagram.com/tanj.idn?mdxt=MXJ1OTlhOHQzMG9leA==',
  tiktok: 'https://www.tiktok.com/@tanj.co.id',
  whatsapp: '6281363661703',
  email: 'tanj.indonesia@gmail.com',
  showStock: true,
  showSold: true,
  maxQty: 99,
  qrisWidth: 180,
  recommendations: 2,
  paymentHours: 2,
  storyTheme: 'ivory',
  headingFont: 'times',
});
export const siteSettingFields = [
  ['lookbookTitle', 'Judul lookbook', 'text'],
  ['storyTitle', 'Judul cerita (baris baru diperbolehkan)', 'textarea'],
  ['storyText', 'Deskripsi cerita', 'textarea'],
  ['instagram', 'URL Instagram', 'url'],
  ['tiktok', 'URL TikTok', 'url'],
  ['whatsapp', 'WhatsApp (kode negara, contoh 628...)', 'text'],
  ['email', 'Email CS', 'email'],
  ['maxQty', 'Maksimal qty per produk dalam satu pesanan', 'number', 1, 99],
  ['qrisWidth', 'Lebar maksimal QRIS (px)', 'number', 120, 600],
  ['recommendations', 'Jumlah rekomendasi keranjang', 'number', 0, 4],
  ['paymentHours', 'Batas pembayaran (jam)', 'number', 1, 72],
  ['showStock', 'Tampilkan jumlah stok', 'checkbox'],
  ['showSold', 'Tampilkan jumlah terjual', 'checkbox'],
  ['storyTheme', 'Warna bagian cerita', 'theme'],
  ['headingFont', 'Font judul editorial', 'font'],
];
export function validateSiteSettings(raw) {
  const result = {};
  for (const [key, label, type, min, max] of siteSettingFields) {
    const value = raw[key];
    if (type === 'checkbox') {
      if (typeof value !== 'boolean') throw Error(label + ' tidak valid.');
      result[key] = value;
    } else if (type === 'number') {
      if (!Number.isInteger(value) || value < min || value > max)
        throw Error(`${label} harus ${min}–${max}.`);
      result[key] = value;
    } else if (type === 'theme' || type === 'font') {
      if (!(type === 'theme' ? ['ivory', 'cocoa'] : ['times', 'sans']).includes(value))
        throw Error(label + ' tidak valid.');
      result[key] = value;
    } else {
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.length > (type === 'textarea' ? 1000 : 250)
      )
        throw Error(label + ' wajib diisi.');
      result[key] = value.trim();
    }
  }
  if (!/^\d{7,15}$/.test(result.whatsapp) || !/^\S+@\S+\.\S+$/.test(result.email))
    throw Error('Kontak CS tidak valid.');
  for (const [key, host] of [
    ['instagram', 'www.instagram.com'],
    ['tiktok', 'www.tiktok.com'],
  ]) {
    const u = new URL(result[key]);
    if (
      u.protocol !== 'https:' ||
      !['www.' + host.replace(/^www\./, ''), host.replace(/^www\./, '')].includes(u.hostname) ||
      u.username ||
      u.password
    )
      throw Error('URL ' + key + ' tidak valid.');
  }
  return result;
}
