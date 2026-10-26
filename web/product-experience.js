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
    content.textContent = text()[id];
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
  function toggle(id) {
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
      sync();
    },
  };
}
