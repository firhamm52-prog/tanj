import { selectLookbookMedia } from '../shared/lookbook.js';
import { prepareCmsVideo } from '../web/cms-video-convert.js';
import { cropCmsVideo } from '../web/cms-video-crop.js';
import { siteSettingFields, defaultSiteSettings } from '../shared/site-settings.js?v=shipping-discount-28';
import { mountManualAdmin } from './manual-payments.js?v=owner-ui-3';
import { isAdmin, loginAdmin, logout, usesCloudAdmin } from '../web/admin-session.js?v=improve-2';
import { DEFAULT_PRODUCT_PRICE } from '../shared/seed.js';
import { uploadCmsImage, uploadCmsVideo } from '../web/cms-upload.js?v=mov-upload-1';
import { cropCmsImage } from '../web/cms-image-crop.js?v=media-upload-1';
import { mountProductGalleryEditor } from './product-gallery-editor.js?v=gallery-1';
let uploadingImage = false;
import {
  isApi,
  usesCloudCMS,
  request,
  loadAdmin,
  save,
  remove,
  publish,
  resetDemo,
} from '../web/data.js?v=detail-1';
const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const money = (value) => 'Rp' + Number(value).toLocaleString('id-ID');
const asset = (value) =>
  /^assets\/[\w.-]+$/.test(value) ? '../' + value : /^https:\/\//.test(value) ? value : '';
const image = (value) => `<img src="${esc(asset(value))}" alt="" loading="lazy">`;
let paymentCleanup = null;
let apiSigned = false;
const canAccess = () => (isApi && !usesCloudAdmin ? apiSigned : isAdmin());
function requireAdmin() {
  if (!canAccess()) throw Error('Akses admin TANJ diperlukan. Login dengan akun admin yang sama.');
}
let state,
  tab = location.hash === '#payments' ? 'payments' : 'overview',
  query = '',
  filter = 'all',
  editing = null;
const tabs = {
  site: ['Tampilan & fitur', 'Atur konten, kontak, dan batas pembelian website TANJ.'],
  payments: ['Pembayaran & QRIS', 'Kelola verifikasi pembayaran, QRIS, dan nomor resi.'],
  overview: ['Ringkasan', 'Ruang untuk mengelola setiap detail koleksimu.'],
  products: ['Produk', 'Atur varian, harga, stok, dan foto koleksi TANJ.'],
  hijabs: ['Hijab', 'Kelola harga dan ketersediaan Selcuk & Georgia.'],
  collections: ['Koleksi', 'Berikan tempat untuk setiap cerita dan siluet.'],
  content: ['Konten website', 'Susun tampilan beranda melalui video, banner, dan lookbook.'],
  settings: ['Pengaturan', 'Kelola sesi dan salinan data workspace.'],
};
function error(message, target = '#global-error') {
  const el = $(target);
  el.textContent = message;
  el.hidden = !message;
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('#toast').hidden = true), 4500);
}
async function busy(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    requireAdmin();
    await action();
  } catch (err) {
    error(err.message);
  } finally {
    button.disabled = false;
  }
}
async function refresh() {
  requireAdmin();
  state = await loadAdmin();
  requireAdmin();
  render();
  $('#workspace').setAttribute('aria-busy', 'false');
}
async function openApp() {
  requireAdmin();
  await refresh();
  $('#login-screen').hidden = true;
  $('#app').hidden = false;
}
$('#demo-credentials').hidden = true;
$('#login-form').elements.password.value = '';
$('#mode-label').textContent = usesCloudCMS
  ? 'CMS online'
  : isApi
    ? 'Backend terhubung'
    : 'Simulasi aktif';
$('#mode-banner').textContent = usesCloudCMS
  ? 'CMS ONLINE · Draf konten tersimpan di Supabase. Publikasikan untuk memperbarui semua perangkat. Stok produk berubah langsung saat disimpan.'
  : isApi
    ? 'Perubahan disimpan ke database sebagai draf. Klik Publikasikan untuk memperbarui website.'
    : 'MODE DEMO · Data dummy tersimpan di browser ini. Publikasi demo hanya mengubah website di browser yang sama.';
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  error('', '#login-error');
  const button = event.submitter;
  button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (isApi && !usesCloudAdmin) {
      await request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      apiSigned = true;
    } else await loginAdmin({ id: data.email, password: data.password });
    await openApp();
  } catch (err) {
    error(err.message, '#login-error');
  } finally {
    button.disabled = false;
  }
});
$('#logout').addEventListener('click', (event) =>
  busy(event.currentTarget, async () => {
    if (isApi && !usesCloudAdmin) {
      await request('/auth/logout', { method: 'POST', body: '{}' });
      apiSigned = false;
    } else await logout();
    $('#app').hidden = true;
    $('#login-screen').hidden = false;
    $('#login-form').elements.password.value = '';
  }),
);
$('#navigation').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tab]');
  if (button) {
    tab = button.dataset.tab;
    query = '';
    filter = 'all';
    error('');
    render();
  }
});
$('#publish').addEventListener('click', (event) =>
  busy(event.currentTarget, async () => {
    if (
      !confirm(
        usesCloudCMS || isApi
          ? 'Publikasikan seluruh perubahan draf ke website?'
          : 'Terapkan draf ke landing page demo di browser ini?',
      )
    )
      return;
    await publish();
    await refresh();
    toast(
      usesCloudCMS || isApi
        ? 'Website berhasil diperbarui.'
        : 'Demo dipublikasikan. Buka atau muat ulang website untuk melihat perubahan.',
    );
  }),
);
function badge(item) {
  return `<span class="badge ${item.status === 'draft' ? 'draft' : item.stock === 0 ? 'empty' : ''}">${item.status === 'draft' ? 'Draf' : item.stock === 0 ? 'Stok habis' : 'Aktif'}</span>`;
}
function collectionName(item) {
  return state.collections.find((c) => c.id === item.collectionId)?.name || item.collection || '';
}
function editButton(kind, id, label = 'Edit') {
  return `<button class="small-button" data-action="${label === 'Atur Diskon Produk' ? 'discount' : 'edit'}" data-kind="${kind}" data-id="${esc(id)}">${label}</button>`;
}
function actions(kind, item) {
  return `<div class="row-actions">${editButton(kind, item.id)}${['products', 'hijabs'].includes(kind) ? editButton(kind, item.id, 'Atur Diskon Produk') : ''}${kind === 'hijabs' ? '' : `<button class="small-button" data-action="delete" data-kind="${kind}" data-id="${esc(item.id)}" aria-label="Hapus ${esc(item.name || item.caption)}">Hapus</button>`}</div>`;
}
function render() {
  requireAdmin();
  if (paymentCleanup) {
    paymentCleanup();
    paymentCleanup = null;
  }
  $('#page-title').textContent = tabs[tab][0];
  $('#breadcrumb').textContent = tabs[tab][0];
  $('#page-subtitle').textContent = tabs[tab][1];
  document.querySelectorAll('#navigation button').forEach((button) => {
    if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const w = $('#workspace');
  if (tab === 'payments') {
    if (usesCloudCMS)
      w.innerHTML =
        '<iframe title="Pembayaran dan QRIS TANJ" src="./payments.html" style="width:100%;height:80vh;border:1px solid #e0d8cc;border-radius:12px"></iframe>';
    else paymentCleanup = mountManualAdmin(w);
  } else if (tab === 'site') {
    const settings = { ...defaultSiteSettings, ...state.settings };
    w.innerHTML = `<section class="panel settings"><p class="eyebrow">WEBSITE TANJ</p><h2>Tampilan & fitur</h2><p>Kelola teks editorial, kontak CS, sosial media, stok yang ditampilkan, batas qty, rekomendasi, lebar QRIS, dan batas pembayaran.</p><p>Batas qty: <strong>${settings.maxQty}</strong> per produk · QRIS: <strong>${settings.qrisWidth}px</strong> · Batas bayar: <strong>${settings.paymentHours} jam</strong></p>${editButton('settings', '', 'Edit tampilan & fitur')}</section>`;
    w.insertAdjacentHTML(
      'afterbegin',
      `<section class="panel"><p class="eyebrow">PROMO PENGIRIMAN</p><h2>Diskon Ongkir</h2><p>Status draf: <strong>${settings.shippingDiscountEnabled ? 'Aktif' : 'Nonaktif'}</strong> · Batas subsidi: <strong>${money(settings.shippingDiscountMax)}</strong> per pesanan.</p><p>TANJ menanggung ongkir sampai batas ini. Jika ongkir lebih rendah, subsidi mengikuti ongkir asli. Berlaku semua produk, tanpa minimum belanja. Harga baju tetap.</p><button class="primary" data-action="shipping-discount">Atur Diskon Ongkir</button><p>Simpan lalu Publikasikan untuk menerapkan perubahan ke pesanan baru.</p></section>`,
    );
  } else if (tab === 'overview') {
    const metrics = [
      ['Total produk', state.products.length + state.hijabs.length, 'Varian wear & hijab'],
      ['Koleksi', state.collections.length, 'Koleksi modest wear'],
      [
        'Stok tersedia',
        [...state.products, ...state.hijabs].reduce((n, p) => n + p.stock, 0),
        'Unit dalam katalog',
      ],
      [
        'Produk draf',
        state.products.filter((p) => p.status === 'draft').length,
        'Belum tampil di website',
      ],
    ];
    w.innerHTML = `<div class="stats">${metrics.map(([name, value, caption]) => `<article class="stat"><small>${name}</small><strong>${value}</strong><p>${caption}</p></article>`).join('')}</div><div class="overview-grid"><section class="panel"><div class="panel-head"><div><h2>Dalam koleksimu</h2><p>Beberapa produk di workspace saat ini</p></div><button class="small-button" data-action="goto" data-tab="products">Lihat semua ↗</button></div><div class="mini-list">${
      state.products
        .slice(0, 5)
        .map(
          (item) =>
            `<div class="mini-row">${image(item.model)}<div><strong>${esc(item.name)}</strong><small>${esc(collectionName(item))} · ${money(item.price)}</small></div>${badge(item)}</div>`,
        )
        .join('') || '<p>Belum ada produk. Tambahkan produk pertamamu.</p>'
    }</div></section><section class="panel"><div class="feature">${image('assets/campaign-beige.webp')}<div><p>THE TANJ EXPERIENCE</p><h2>Your story, beautifully told.</h2><a href="../" target="_blank" rel="noopener">Lihat website ↗</a></div></div><div class="tip"><strong>Mulai dari detail kecil.</strong>Tambahkan produk, sesuaikan foto, lalu publikasikan ketika semuanya sudah siap.</div></section></div>`;
  } else if (tab === 'products' || tab === 'hijabs') {
    w.innerHTML = `<div class="toolbar"><div class="filters"><input class="search" id="search" aria-label="Cari produk" placeholder="Cari nama atau koleksi…" value="${esc(query)}"><select id="filter" aria-label="Filter status"><option value="all">Semua status</option><option value="published">Aktif</option><option value="empty">Stok habis</option><option value="draft">Draf</option></select></div><button class="primary" data-action="new" data-kind="${tab}">+ Tambah ${tab === 'products' ? 'produk' : 'hijab'}</button></div><div id="list"></div>`;
    $('#filter').value = filter;
    renderList();
  } else if (tab === 'collections') {
    w.innerHTML = `<div class="toolbar"><span>${state.collections.length} koleksi</span><button class="primary" data-action="new" data-kind="collections">+ Tambah koleksi</button></div><div class="collection-cards">${state.collections.map((c) => `<article class="collection-card"><span class="eyebrow">${state.products.filter((p) => p.collectionId === c.id).length} PRODUK</span><h2>${esc(c.name)}</h2><p>${esc(c.description || 'Belum ada deskripsi.')}</p>${actions('collections', c)}</article>`).join('')}</div>${state.collections.length ? '' : '<p class="empty-state">Belum ada koleksi. Tambahkan koleksi pertama.</p>'}`;
  } else if (tab === 'content') {
    w.innerHTML = `<div class="content-cards"><article class="content-card"><video src="${esc(asset(state.hero.media))}" muted playsinline controls preload="metadata"></video><div><p class="eyebrow">FIRST IMPRESSION</p><h2>Video utama</h2><p>Video pembuka landing page TANJ.</p>${editButton('hero', '', 'Edit video')}</div></article><article class="content-card">${state.banner.mediaType === 'video' ? `<video src="${esc(asset(state.banner.media))}" controls muted playsinline preload="metadata"></video>` : image(state.banner.media)}<div><span class="badge ${state.banner.enabled ? '' : 'draft'}">${state.banner.enabled ? 'Ditampilkan' : 'Disembunyikan'}</span><h2>${esc(state.banner.title)}</h2><p>${esc(state.banner.subtitle)}</p>${editButton('banner', '', 'Edit banner')}</div></article></div>${renderMovingMedia()}`;
  } else {
    w.innerHTML = `<section class="panel settings"><p class="eyebrow">YOUR WORKSPACE</p><h2>${usesCloudCMS ? 'CMS online TANJ' : isApi ? 'CMS dengan database' : 'Simulasi TANJ Studio'}</h2><p>${usesCloudCMS ? 'Produk, stok, dan konten tersimpan online di Supabase.' : isApi ? 'Produk, koleksi, dan konten tersimpan di database layanan masing-masing. Publikasi membuat satu versi website yang utuh.' : 'Data awal berisi 12 produk wear, 6 hijab, 4 koleksi, dan 6 media lookbook. Tidak ada transaksi atau pelanggan sungguhan dalam simulasi ini.'}</p><p>${usesCloudCMS ? 'Sesi mengikuti autentikasi Supabase. Stok disimpan langsung; konten melalui Publikasikan.' : isApi ? 'Sesi admin berakhir setelah 8 jam.' : 'Draf dan hasil publikasi hanya tersimpan di browser ini. Pengunjung lain tetap melihat data awal.'}</p><div class="row-actions"><button class="secondary" data-action="export">Unduh salinan JSON</button>${isApi || usesCloudCMS ? '' : '<button class="secondary" data-action="reset">Reset data dummy</button>'}</div></section>`;
  }
}
function renderList() {
  const items = state[tab].filter(
    (item) =>
      `${item.name} ${collectionName(item)}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'empty' && item.stock === 0) ||
        (filter === 'draft' && item.status === 'draft') ||
        (filter === 'published' && item.status !== 'draft' && item.stock > 0)),
  );
  $('#list').innerHTML = items.length
    ? `<div class="table-wrap"><table><thead><tr><th>PRODUK</th><th>HARGA</th><th>STOK</th><th>STATUS</th><th>KELOLA</th></tr></thead><tbody>${items.map((item) => `<tr><td><div class="product-cell">${image(item.model || item.image)}<div><strong>${esc(item.name)}</strong><small>${esc(collectionName(item))}</small></div></div></td><td>${money(item.price)}</td><td>${item.stock} unit</td><td>${badge(item)}</td><td>${actions(tab, item)}</td></tr>`).join('')}</tbody></table></div><p class="eyebrow">${items.length} HASIL</p>`
    : '<div class="panel empty-state"><h2>Belum ada hasil.</h2><p>Coba kata kunci lain atau tambahkan produk baru.</p></div>';
}
$('#workspace').addEventListener('input', (event) => {
  if (event.target.id === 'search') {
    query = event.target.value;
    renderList();
  }
});
$('#workspace').addEventListener('change', (event) => {
  if (event.target.id === 'filter') {
    filter = event.target.value;
    renderList();
  }
});
$('#workspace').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  busy(button, async () => {
    error('');
    const { action, kind, id } = button.dataset;
    if (action === 'goto') {
      tab = button.dataset.tab;
      render();
    }
    if (action === 'new' || action === 'edit') openEditor(kind, id, button.dataset.placement);
    if (action === 'shipping-discount') {
      openEditor('settings');
      $('#edit-form [name=shippingDiscountEnabled]').focus();
    }
    if (action === 'discount') {
      openEditor(kind, id);
      $('#editor-fields details').open = true;
      $('#edit-form [name=discountAmount]').focus();
    }
    if (action === 'delete') {
      if (
        !confirm('Hapus konten ini dari draf? Perubahan tampil di website setelah dipublikasikan.')
      )
        return;
      await remove(kind, id);
      await refresh();
      toast('Konten dihapus dari draf.');
    }
    if (action === 'reset') {
      if (!confirm('Reset semua draf dan publikasi demo di browser ini?')) return;
      await resetDemo();
      await refresh();
      toast('Data dummy dikembalikan.');
    }
    if (action === 'export') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
        url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = 'tanj-content.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
});
function field(name, label, value = '', type = 'text', full = false, extra = '') {
  const upload = usesCloudCMS && ['model', 'product', 'image', 'media'].includes(name);
  return `<label class="${full ? 'full' : ''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required>${['media', 'model', 'product', 'image'].includes(name) ? '<span class="field-help">assets/nama.webp atau URL HTTPS foto/video yang sudah dihosting.</span>' : ''}</label>${upload ? `<div class="full upload-control"><label>Unggah ${label.toLowerCase().replace(/^url /, '')} dari perangkat<input type="file" accept="image/jpeg,image/png,image/webp" data-upload-target="${name}"></label><span class="field-help" role="status">JPG, PNG atau WebP, maksimal 5 MB. URL foto terisi otomatis.</span><img class="upload-preview" alt="Pratinjau foto yang diunggah" hidden></div>` : ''}`;
}
function select(name, label, value, options) {
  return `<label>${label}<select name="${name}" required>${options.map(([id, title]) => `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
}
function openEditor(kind, id, placement) {
  if (kind === 'products' && !state.collections.length)
    throw new Error('Tambahkan koleksi sebelum membuat produk.');
  const item = ['hero', 'banner', 'settings'].includes(kind)
    ? state[kind]
    : state[kind].find((x) => x.id === id) || {};
  editing = { kind, id };
  error('', '#editor-error');
  $('#editor-title').textContent =
    (id || ['hero', 'banner', 'settings'].includes(kind) ? 'Edit ' : 'Tambah ') +
    {
      products: 'produk',
      collections: 'koleksi',
      hijabs: 'hijab',
      hero: 'video utama',
      banner: 'banner',
      slides: 'media lookbook',
      settings: 'tampilan & fitur',
    }[kind];
  let fields = '';
  if (kind === 'settings') {
    const values = { ...defaultSiteSettings, ...item };
    fields = siteSettingFields
      .map(([key, label, type, min, max]) =>
        type === 'checkbox'
          ? `<label class="checkbox-label full"><input name="${key}" type="checkbox" ${values[key] ? 'checked' : ''}>${label}</label>`
          : type === 'textarea'
            ? `<label class="full">${label}<textarea name="${key}" maxlength="1000">${esc(values[key])}</textarea></label>`
            : type === 'theme'
              ? select(key, label, values[key], [
                  ['ivory', 'Warm ivory / cocoa'],
                  ['cocoa', 'Cocoa gelap'],
                ])
              : type === 'font'
                ? select(key, label, values[key], [
                    ['times', 'Times New Roman'],
                    ['sans', 'Manrope'],
                  ])
                : field(
                    key,
                    label,
                    values[key],
                    type,
                    true,
                    type === 'number' ? `min="${min}" max="${max}" step="1"` : '',
                  ),
      )
      .join('');
  }
  if (kind === 'products')
    fields =
      field('name', 'Nama produk / varian', item.name) +
      select(
        'collectionId',
        'Koleksi',
        item.collectionId || state.collections[0].id,
        state.collections.map((c) => [c.id, c.name]),
      ) +
      field('colorName', 'Nama warna', item.colorName) +
      field('color', 'Warna swatch', item.color || '#eee6d7', 'color') +
      field(
        'price',
        'Harga (Rp)',
        item.price ?? DEFAULT_PRODUCT_PRICE,
        'number',
        false,
        'min="0" max="1000000000" step="1"',
      ) +
      field(
        'stock',
        'Stok (unit)',
        item.stock ?? 0,
        'number',
        false,
        'min="0" max="1000000" step="1"',
      ) +
      field(
        'sold',
        'Jumlah terjual',
        item.sold ?? 0,
        'number',
        false,
        'min="0" max="1000000000" step="1"',
      ) +
      select('status', 'Status', item.status || 'draft', [
        ['draft', 'Draf — sembunyikan'],
        ['published', 'Aktif — tampil setelah publikasi'],
      ]) +
      field('model', 'Foto model', item.model || 'assets/campaign-beige.webp', 'text', true) +
      field('product', 'Foto produk', item.product || 'assets/look-2.webp', 'text', true);
  if (kind === 'hijabs')
    fields =
      field('name', 'Nama hijab', item.name) +
      field('collection', 'Koleksi hijab (contoh: selcuk)', item.collection || '') +
      field('color', 'Nama warna', item.color || '') +
      field(
        'price',
        'Harga (Rp)',
        item.price ?? 115000,
        'number',
        false,
        'min="0" max="1000000000" step="1"',
      ) +
      field(
        'stock',
        'Stok tersedia (unit)',
        item.stock ?? 0,
        'number',
        false,
        'min="0" max="1000000" step="1"',
      ) +
      select('status', 'Status', item.status || (id ? 'published' : 'draft'), [
        ['draft', 'Draf — sembunyikan'],
        ['published', 'Aktif — tampil setelah publikasi'],
      ]) +
      field('image', 'Foto hijab', item.image || '', 'text', true);
  if (kind === 'collections')
    fields =
      field('name', 'Nama koleksi', item.name, 'text', true) +
      `<label class="full">Deskripsi<textarea name="description" maxlength="1000">${esc(item.description || '')}</textarea></label>`;
  if (kind === 'hero') fields = field('media', 'URL video utama', item.media, 'text', true);
  if (kind === 'slides' || kind === 'banner') {
    if (kind === 'slides')
      fields =
        select('placement', 'Letak foto/video berjalan', item.placement || placement || 'lower', [
          ['upper', 'Atas — sebelum koleksi gamis'],
          ['lower', 'Bawah — setelah koleksi gamis'],
        ]) + field('caption', 'Keterangan', item.caption, 'text', true);
    else
      fields =
        `<label class="checkbox-label full"><input name="enabled" type="checkbox" ${item.enabled ? 'checked' : ''}>Tampilkan banner di website</label>` +
        field('title', 'Judul banner', item.title, 'text', true) +
        `<label class="full">Subjudul<input name="subtitle" value="${esc(item.subtitle)}" maxlength="400"></label>`;
    fields +=
      select('mediaType', 'Jenis media', item.mediaType || 'image', [
        ['image', 'Foto'],
        ['video', 'Video'],
      ]) + field('media', 'URL media', item.media || 'assets/campaign-beige.webp', 'text', true);
  }
  if (['products', 'hijabs'].includes(kind)) {
    fields += `<details class="full" ${item.discountAmount ? 'open' : ''}><summary>Atur Diskon Produk</summary>${field('discountAmount', 'Potongan per produk (Rp), 0 untuk nonaktif', item.discountAmount || 0, 'number', false, 'min="0" max="1000000000" step="1"')}<p>Harga asli tetap tampil dicoret. Simpan dan publikasikan untuk mengaktifkan harga diskon.</p></details>`;
  }
  if (['products', 'hijabs'].includes(kind)) {
    fields +=
      '<details class="full"><summary>Deskripsi & perawatan produk</summary>' +
      [
        ['description', 'Description'],
        ['careInstructions', 'Care Instructions'],
        ['shippingInfo', 'Shipping'],
      ]
        .map(
          ([key, label]) =>
            `<label class="full">${label}<textarea name="${key}" maxlength="2000" rows="4" placeholder="Isi detail ${label.toLowerCase()}…">${esc(item[key] || '')}</textarea></label>`,
        )
        .join('') +
      '</details>';
  }
  $('#editor-fields').innerHTML = fields;
  if (['products', 'hijabs'].includes(kind)) {
    const gallery = document.createElement('section');
    gallery.className = 'full cms-gallery-editor';
    $('#editor-fields').append(gallery);
    mountProductGalleryEditor(gallery, item, {
      requireAdmin,
      onBusy: (value) => {
        uploadingImage = value;
      },
      onDirty: () => {
        if (editing) editing.dirty = true;
      },
    });
  }
  syncMediaPicker();
  $('#editor').showModal();
}
function syncMediaPicker() {
  const picker = $('#edit-form [data-upload-target=media]');
  if (!picker) return;
  const video = editing?.kind === 'hero' || $('#edit-form [name=mediaType]')?.value === 'video';
  picker.dataset.uploadKind = video ? 'video' : 'image';
  picker.accept = video
    ? 'video/mp4,video/webm,video/quicktime,.mov'
    : 'image/jpeg,image/png,image/webp';
  picker.closest('.upload-control').querySelector('[role=status]').textContent = video
    ? 'Video MP4, WebM atau MOV, maksimal 50 MB.'
    : 'Foto JPG, PNG atau WebP, maksimal 5 MB. Bisa crop sebelum upload.';
  const control = picker.closest('.upload-control');
  let cropButton = control.querySelector('[data-crop-video]');
  if (!cropButton) {
    cropButton = document.createElement('button');
    cropButton.type = 'button';
    cropButton.className = 'secondary';
    cropButton.dataset.cropVideo = '';
    cropButton.textContent = 'Atur crop video';
    control.append(cropButton);
    cropButton.onclick = async () => {
      if (uploadingImage) return;
      const source = $('#edit-form [name=media]').value.trim();
      if (!source) {
        control.querySelector('[role=status]').textContent =
          'Pilih file video dari perangkat terlebih dahulu.';
        return;
      }
      const editor = editing;
      cropButton.disabled = true;
      try {
        requireAdmin();
        control.querySelector('[role=status]').textContent = 'Membuka video untuk crop…';
        const response = await fetch(asset(source), { signal: AbortSignal.timeout(30000) });
        if (!response.ok)
          throw Error('Video belum dapat dibuka. Pilih file video dari perangkat untuk crop.');
        if (Number(response.headers.get('content-length')) > 50 * 1024 * 1024)
          throw Error('Ukuran video maksimal 50 MB.');
        const blob = await response.blob();
        if (editing !== editor) return;
        const filename = source.split('/').pop().split('?')[0] || 'video.mp4';
        const files = new DataTransfer();
        files.items.add(new File([blob], filename, { type: blob.type || 'video/mp4' }));
        picker.files = files.files;
        picker.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (err) {
        if (editing === editor) control.querySelector('[role=status]').textContent = err.message;
      } finally {
        cropButton.disabled = false;
      }
    };
  }
  cropButton.hidden = !video;
  if (!control.querySelector('video')) {
    const preview = document.createElement('video');
    preview.className = 'upload-preview';
    preview.controls = true;
    preview.playsInline = true;
    preview.preload = 'metadata';
    preview.hidden = true;
    preview.addEventListener('error', () => {
      if (preview.getAttribute('src'))
        control.querySelector('[role=status]').textContent =
          'Video terunggah. Preview belum dapat diputar di browser ini; coba ekspor ke MP4 jika video tidak tampil.';
    });
    control.append(preview);
  }
}
function closeEditor() {
  if (uploadingImage) return toast('Tunggu sampai unggah media selesai.');
  if (editing?.dirty && !confirm('Tutup editor tanpa menyimpan perubahan?')) return;
  $('#editor').close();
  editing = null;
}
$('#edit-form').addEventListener('input', () => {
  if (editing) editing.dirty = true;
});
$('#edit-form').addEventListener('change', async (event) => {
  if (event.target.name === 'mediaType') syncMediaPicker();
  const picker = event.target.closest('[data-upload-target]');
  if (!picker?.files?.length || uploadingImage) return;
  const editor = editing;
  const field = $('#edit-form').elements.namedItem(picker.dataset.uploadTarget);
  const status = picker.closest('.upload-control').querySelector('[role=status]');
  const preview = picker.closest('.upload-control').querySelector('img');
  const videoPreview = picker.closest('.upload-control').querySelector('video');
  const controls = [...$('#edit-form').querySelectorAll('[type=submit],[type=file]')];
  const disabled = controls.map((control) => control.disabled);
  uploadingImage = true;
  controls.forEach((control) => (control.disabled = true));
  status.textContent = 'Mengunggah foto…';
  error('', '#editor-error');
  try {
    requireAdmin();
    const isVideo = picker.dataset.uploadKind === 'video';
    status.textContent = isVideo
      ? 'Menyiapkan video. MOV dikonversi otomatis; biarkan tab ini tetap terbuka selama durasi video…'
      : 'Atur posisi foto sebelum diunggah.';
    const videoCrop = isVideo
      ? await cropCmsVideo(picker.files[0], { ratio: editing?.kind === 'slides' ? 9 / 16 : 16 / 9 })
      : null;
    if (isVideo && !videoCrop) {
      status.textContent = 'Upload dibatalkan.';
      return;
    }
    if (isVideo)
      status.textContent =
        'Memproses crop video. Biarkan tab terbuka sampai selesai (sekitar durasi video).';
    const prepared = isVideo
      ? await prepareCmsVideo(picker.files[0], videoCrop)
      : await cropCmsImage(picker.files[0], {
          initialRatio:
            editing?.kind === 'slides'
              ? 9 / 16
              : picker.dataset.uploadTarget === 'media'
                ? 16 / 9
                : 3 / 4,
        });
    if (!prepared) {
      status.textContent = 'Upload dibatalkan.';
      return;
    }
    status.textContent = isVideo
      ? 'Mengunggah video, tunggu sampai selesai…'
      : 'Mengunggah hasil crop…';
    const url = await (isVideo ? uploadCmsVideo(prepared) : uploadCmsImage(prepared));
    if (editing !== editor || !field.isConnected) return;
    field.value = url;
    field.dispatchEvent(new Event('change', { bubbles: true }));
    preview.hidden = isVideo;
    if (videoPreview) {
      videoPreview.hidden = !isVideo;
      if (isVideo) videoPreview.src = url;
      else {
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.load();
      }
    }
    if (!isVideo) preview.src = url;
    editing.dirty = true;
    status.textContent = isVideo
      ? 'Video terunggah. Simpan & publikasikan untuk menayangkannya.'
      : 'Foto terunggah. Simpan perubahan untuk menggunakan foto ini.';
  } catch (err) {
    if (editing === editor) {
      status.textContent = 'Unggah belum berhasil. Pilih foto untuk mencoba lagi.';
      error(err.message, '#editor-error');
    }
  } finally {
    uploadingImage = false;
    picker.value = '';
    controls.forEach((control, i) => (control.disabled = disabled[i]));
  }
});
$('#close-editor').addEventListener('click', closeEditor);
$('#cancel-editor').addEventListener('click', closeEditor);
$('#editor').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeEditor();
});
$('#editor').addEventListener('close', () =>
  $('#editor')
    .querySelectorAll('video')
    .forEach((video) => video.pause()),
);
$('#edit-form').addEventListener('submit', async (event) => {
  if (uploadingImage) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  const button = event.submitter;
  const publishNow = button?.name === 'publish';
  if (publishNow && !confirm('Simpan perubahan ini dan publikasikan seluruh draf ke website?'))
    return;
  const submitButtons = [...event.currentTarget.querySelectorAll('[type="submit"]')];
  submitButtons.forEach((b) => (b.disabled = true));
  error('', '#editor-error');
  try {
    requireAdmin();
    const { kind, id } = editing;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (kind === 'slides') {
      const candidate = [
        ...state.slides.filter(
          (slide) => slide.id !== id && (slide.placement || 'lower') === data.placement,
        ),
        data,
      ];
      if (selectLookbookMedia(candidate).length !== candidate.length)
        throw Error(
          'Foto berjalan maksimal 5 foto dan 1 video. Edit atau hapus media lama untuk menggantinya.',
        );
    }
    if (['products', 'hijabs'].includes(kind)) {
      data.price = Number(data.price);
      data.discountAmount = Number(data.discountAmount || 0);
      data.gallery = JSON.parse(data.gallery || '[]');
      data.stock = Number(data.stock);
      if (kind === 'products') data.sold = Number(data.sold);
    }
    if (kind === 'banner') data.enabled = !!data.enabled;
    if (kind === 'settings')
      for (const [key, , type] of siteSettingFields) {
        if (type === 'checkbox') data[key] = !!data[key];
        if (type === 'number') data[key] = Number(data[key]);
      }
    const saved = await save(kind, id, data);
    if (usesCloudCMS && ['products', 'hijabs'].includes(kind) && id) {
      if (saved[kind]?.find((p) => p.id === id)?.price !== data.price)
        throw Error(
          'Harga draf belum sesuai. Jalankan pembaruan database 202610200011_cms_publish_prices.sql, lalu simpan lagi.',
        );
      if (saved[kind]?.find((p) => p.id === id)?.stock !== data.stock)
        throw Error(
          'Stok belum tersimpan. Jalankan pembaruan database 202610220016_cms_hijab_stock.sql, lalu muat ulang CMS.',
        );
    }
    if (publishNow) await publish();
    await refresh();
    $('#editor').close();
    editing = null;
    toast(
      publishNow
        ? 'Perubahan tersimpan dan sudah dipublikasikan ke website.'
        : usesCloudCMS && ['products', 'hijabs'].includes(kind)
          ? 'Draf tersimpan. Stok online sudah diperbarui; publikasikan untuk konten/harga.'
          : 'Draf tersimpan. Publikasikan untuk menampilkan perubahan.',
    );
  } catch (err) {
    error(err.message, '#editor-error');
  } finally {
    submitButtons.forEach((b) => (b.disabled = false));
  }
});
function guardSession() {
  if (canAccess()) return;
  if (paymentCleanup) {
    paymentCleanup();
    paymentCleanup = null;
  }
  $('#app').hidden = true;
  $('#login-screen').hidden = false;
  $('#editor').close();
  $('#workspace').replaceChildren();
  state = null;
}
window.addEventListener('tanj-customer-change', guardSession);
window.addEventListener('focus', guardSession);
setInterval(guardSession, 15000);
try {
  if (isApi && !usesCloudAdmin) {
    await request('/auth/session');
    apiSigned = true;
    await openApp();
  } else if (isAdmin()) await openApp();
} catch (err) {
  if (!err.message.includes('Sesi berakhir')) error(err.message, '#login-error');
}

function renderMovingMedia() {
  return ['upper', 'lower']
    .map((placement) => {
      const items = state.slides.filter((s) => (s.placement || 'lower') === placement);
      const title =
        placement === 'upper' ? 'Atas — sebelum koleksi gamis' : 'Bawah — setelah koleksi gamis';
      return (
        '<section class="panel"><div class="toolbar"><h2>Foto &amp; video berjalan: ' +
        title +
        '</h2><button class="primary" data-action="new" data-kind="slides" data-placement="' +
        placement +
        '">+ Upload foto / video</button></div><p>Maksimal 5 foto dan 1 video per bagian. Portrait 9:16. Simpan lalu Publikasikan.</p><div class="collection-cards">' +
        items
          .map(
            (s) =>
              '<article class="collection-card">' +
              (s.mediaType === 'video'
                ? '<video src="' +
                  esc(asset(s.media)) +
                  '" controls muted playsinline preload="metadata" style="width:100%;max-height:220px"></video>'
                : image(s.media)) +
              '<strong>' +
              esc(s.caption) +
              '</strong>' +
              actions('slides', s) +
              '</article>',
          )
          .join('') +
        '</div>' +
        (!items.length
          ? '<p>Belum ada upload. Bagian atas memakai foto bawaan sampai kamu menambahkan media.</p>'
          : '') +
        '</section>'
      );
    })
    .join('');
}
