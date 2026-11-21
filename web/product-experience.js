import { productLikes } from './product-likes.js?v=likes-20261121';
import { shipmentTracking } from '../shared/shipment-tracking.js?v=hero-ios-20261118';
const heart =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/></svg>';
const key = 'tanj-liked-products-v1';
export function mountProductExperience({ getProducts, openProduct, money, resolveImage }) {
  const read = () => {
    try {
      const ids = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(
        Array.isArray(ids)
          ? ids.filter((id) => typeof id === 'string' && id.length <= 160).slice(0, 300)
          : [],
      );
    } catch {
      return new Set();
    }
  };
  let liked = read(),
    current = null,
    collection = null,
    activeTab = 'description',
    lastId = null;
  const title = document.getElementById('product-modal-title');
  const heading = document.createElement('div');
  heading.className = 'product-title-row';
  title.before(heading);
  heading.append(title);
  const like = document.createElement('button');
  like.type = 'button';
  like.id = 'product-like';
  like.className = 'product-like';
  like.innerHTML = heart;
  heading.append(like);
  const rating = document.createElement('div');
  rating.className = 'product-rating';
  rating.innerHTML =
    '<span class="product-rating-stars" aria-hidden="true">&#9734;&#9734;&#9734;&#9734;&#9734;</span><span>0 suka</span>';
  heading.after(rating);
  let ratingVersion = 0,
    likeCount = 0;
  function drawLikes() {
    rating.querySelector('.product-rating-stars').textContent = (
      liked.has(current?.id) ? '\u2605' : '\u2606'
    ).repeat(5);
    rating.lastElementChild.textContent = likeCount.toLocaleString('id-ID') + ' suka';
  }
  async function loadLikes() {
    const version = ++ratingVersion;
    likeCount = 0;
    drawLikes();
    try {
      const data = await productLikes(current.id);
      if (version !== ratingVersion) return;
      likeCount = Number(data.count) || 0;
      if (data.mine) {
        liked.add(current.id);
        try {
          localStorage.setItem(key, JSON.stringify([...liked]));
        } catch {}
      }
      drawLikes();
      sync();
    } catch {
      if (version === ratingVersion) rating.lastElementChild.textContent = 'Produk disukai';
    }
  }
  const likeRequests = new Set();

  const message = document.createElement('p');
  message.className = 'product-like-message';
  message.setAttribute('role', 'status');
  message.hidden = true;
  document.getElementById('product-modal-price').after(message);
  const tabs = document.createElement('section');
  tabs.className = 'product-details-tabs';
  tabs.innerHTML =
    '<div role="tablist" aria-label="Informasi produk"></div><div class="product-tab-content" role="tabpanel" tabindex="0"></div>';
  message.after(tabs);
  const tablist = tabs.querySelector('[role=tablist]'),
    content = tabs.querySelector('[role=tabpanel]');
  const options = [
    ['description', 'Description'],
    ['careInstructions', 'Care Instructions'],
    ['details', 'Details'],
    ['shippingInfo', 'Shipping'],
  ];
  const text = () => ({
    description:
      current.description || collection?.description || 'Detail produk akan ditambahkan oleh TANJ.',
    careInstructions:
      current.careInstructions || 'Petunjuk perawatan produk ini akan segera ditambahkan.',
    details: `${current.name}\nWarna: ${current.colorName || current.color || '-'}\nUkuran: All Size`,
    shippingInfo:
      current.shippingInfo ||
      'Pilihan kurir, estimasi pengiriman, dan ongkos kirim tersedia saat checkout sesuai alamat tujuan.',
  });
  function showTab(id, focus = false) {
    activeTab = id;
    for (const button of tablist.children) {
      const selected = button.dataset.tab === id;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    }
    content.id = 'product-tab-panel';
    content.setAttribute('aria-labelledby', 'product-tab-' + id);
    content.classList.toggle('shipping-tab-content', id === 'shippingInfo');
    if (id === 'shippingInfo') renderShipping();
    else content.textContent = text()[id];
  }
  function renderShipping() {
    content.innerHTML = `<p class="product-shipping-note">Kurir dan resi pesananmu tersedia di Pesanan saya setelah admin mengisi resi.</p><form class="product-tracking-form"><label for="product-tracking-courier">Kurir</label><select id="product-tracking-courier" name="courier" required><option value="">Pilih kurir</option><option value="jne">JNE</option><option value="j&t">J&T</option><option value="lion">Lion Parcel</option></select><label for="product-tracking-number">Nomor resi</label><input id="product-tracking-number" name="number" required maxlength="80" autocomplete="off" placeholder="Masukkan nomor resi"><button type="submit">Lacak &#8599;</button><p class="product-tracking-status" role="status"></p></form><p class="product-tracking-hint">Resi disalin saat menekan Lacak. Tempel di situs kurir yang terbuka.</p>`;
    const form = content.querySelector('form');
    form.onsubmit = (event) => {
      event.preventDefault();
      const number = form.elements.number.value.trim();
      const courier = shipmentTracking(form.elements.courier.value);
      if (!courier || !number) return;
      const status = form.querySelector('[role=status]');
      // Open synchronously from the gesture; do not lose popup permission awaiting clipboard.
      window.open(courier.url, '_blank', 'noopener,noreferrer');
      status.textContent = 'Resi: ' + number + '. Tempel di situs ' + courier.name + '.';
      navigator.clipboard
        ?.writeText(number)
        .then(() => {
          if (form.isConnected)
            status.textContent = 'Resi disalin. Tempel di situs ' + courier.name + '.';
        })
        .catch(() => {});
    };
  }
  for (const [id, label] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tab = id;
    button.id = 'product-tab-' + id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'product-tab-panel');
    button.textContent = label;
    button.onclick = () => showTab(id);
    tablist.append(button);
  }
  tablist.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const i = options.findIndex(([id]) => id === activeTab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (i + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    showTab(options[next][0], true);
  });
  const nav = document.createElement('button');
  nav.type = 'button';
  nav.id = 'wishlist-open';
  nav.className = 'icon-button';
  nav.setAttribute('aria-label', 'Produk disukai');
  nav.title = 'Produk disukai';
  nav.innerHTML = heart + '<span class="wishlist-badge" hidden></span>';
  document.getElementById('bag-open').before(nav);
  const dialog = document.createElement('dialog');
  dialog.className = 'wishlist-dialog';
  dialog.setAttribute('aria-labelledby', 'wishlist-title');
  dialog.innerHTML =
    '<div class="wishlist-heading"><div><p class="eyebrow">YOUR EDIT</p><h2 id="wishlist-title">Produk disukai</h2></div><button type="button" class="wishlist-close" aria-label="Tutup produk disukai">×</button></div><p class="wishlist-note">Simpan pilihan favoritmu di sini.</p><div class="wishlist-list"></div>';
  document.body.append(dialog);
  const list = dialog.querySelector('.wishlist-list');
  function sync() {
    const badge = nav.querySelector('span');
    badge.textContent = String(liked.size);
    badge.hidden = !liked.size;
    if (current) {
      const selected = liked.has(current.id);
      like.setAttribute('aria-pressed', String(selected));
      like.setAttribute('aria-label', selected ? 'Hapus dari produk disukai' : 'Sukai produk');
    }
  }
  async function toggle(id) {
    if (likeRequests.has(id)) return;
    const next = new Set(liked);
    if (next.has(id)) next.delete(id);
    else {
      if (next.size >= 300) return;
      next.add(id);
    }
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
      liked = next;
      message.hidden = true;
    } catch {
      message.textContent = 'Daftar suka belum dapat disimpan di browser ini.';
      message.hidden = false;
    }
    sync();
    if (dialog.open) renderList();
    if (current?.id === id) drawLikes();
    likeRequests.add(id);
    if (current?.id === id) like.disabled = true;
    const version = current?.id === id ? ++ratingVersion : ratingVersion;
    try {
      const data = await productLikes(id, liked.has(id));
      if (current?.id === id && version === ratingVersion) {
        likeCount = Number(data.count) || 0;
        drawLikes();
      }
    } catch (error) {
      if (current?.id === id && version === ratingVersion) {
        message.hidden = false;
        message.textContent = error.message;
      }
    } finally {
      likeRequests.delete(id);
      if (current?.id === id) like.disabled = false;
    }
  }
  function renderList() {
    list.replaceChildren();
    const products = getProducts().filter((item) => liked.has(item.id));
    if (!products.length) {
      const empty = document.createElement('p');
      empty.className = 'wishlist-empty';
      empty.textContent =
        'Belum ada produk disukai. Tekan ikon hati pada detail produk untuk menyimpannya.';
      list.append(empty);
      return;
    }
    for (const item of products) {
      const row = document.createElement('article');
      row.className = 'wishlist-item';
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'wishlist-product';
      const image = document.createElement('img');
      image.src = resolveImage(item.gallery?.[0] || item.model || item.image || item.product);
      image.alt = item.name;
      image.loading = 'lazy';
      const detail = document.createElement('span'),
        name = document.createElement('strong'),
        price = document.createElement('small');
      name.textContent = item.name;
      price.textContent = money(item.price);
      detail.append(name, price);
      view.append(image, detail);
      view.onclick = () => {
        dialog.close();
        openProduct(item);
      };
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'wishlist-remove';
      remove.setAttribute('aria-label', 'Hapus ' + item.name + ' dari produk disukai');
      remove.innerHTML = heart;
      remove.onclick = () => toggle(item.id);
      row.append(view, remove);
      list.append(row);
    }
  }
  like.onclick = () => {
    if (current) toggle(current.id);
  };
  nav.onclick = () => {
    liked = read();
    sync();
    renderList();
    dialog.showModal();
  };
  dialog.querySelector('.wishlist-close').onclick = () => dialog.close();
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) {
      liked = read();
      sync();
      drawLikes();
      if (dialog.open) renderList();
    }
  });
  sync();
  return {
    set(item, group) {
      current = item;
      collection = group;
      if (lastId !== item.id) {
        activeTab = 'description';
        lastId = item.id;
        message.hidden = true;
      }
      showTab(activeTab);
      like.disabled = likeRequests.has(item.id);
      loadLikes();
      sync();
    },
  };
}
