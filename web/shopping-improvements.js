import { mountScreenHistory } from './screen-history.js';
import { sitePreferences } from './site-preferences.js';
export function mountShoppingImprovements({
  getCatalog,
  getHijabs = () => [],
  getItems,
  openProduct,
  productModal,
}) {
  mountScreenHistory({ getCatalog, openProduct });
  const bagPanel = document.querySelector('#bag-modal .bag-panel');
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'bag-expand';
  expand.textContent = 'Perbesar';
  expand.setAttribute('aria-expanded', 'false');
  expand.onclick = () => {
    const full = document.getElementById('bag-modal').classList.toggle('bag-expanded');
    expand.textContent = full ? 'Perkecil' : 'Perbesar';
    expand.setAttribute('aria-expanded', String(full));
  };
  bagPanel.prepend(expand);
  const contact = document.createElement('a');
  contact.className = 'tanj-chat';
  contact.href = 'https://wa.me/6281363661703';
  contact.target = '_blank';
  contact.rel = 'noopener noreferrer';
  contact.setAttribute('aria-label', 'Chat CS TANJ lewat WhatsApp');
  contact.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a9 9 0 0 1-13.2 8L3 21l1.5-4.6A9 9 0 1 1 21 11.5Z"/><path d="M8 7c0 4.5 2.5 7 7 7l1-2-3-1-1 1-2-2 1-1-1-3Z"/></svg><span>Chat CS</span>';
  document.body.append(contact);
  function gallery(parent, id) {
    const section = document.createElement('section');
    section.className = 'shopping-recommendations';
    section.id = id;
    section.innerHTML =
      '<p class="checkout-eyebrow">COMPLETE YOUR LOOK</p><h3>Rekomendasi untukmu</h3><div class="recommended-products"></div>';
    parent.append(section);
    return section;
  }
  const product = gallery(productModal.querySelector('.product-panel'), 'product-recommendations');
  const checkout = gallery(
    document.getElementById('bag-checkout-view'),
    'checkout-recommendations',
  );
  const empty = document.getElementById('bag-empty');
  const illustration = document.createElement('div');
  illustration.className = 'bag-empty-art';
  illustration.innerHTML =
    '<svg viewBox="0 0 64 72" fill="none" aria-hidden="true"><path d="M13 24h38l4 39H9l4-39Z"/><path d="M23 27V17a9 9 0 0 1 18 0v10"/><path d="m27 44 4 4 8-9"/></svg><span>T</span>';
  const heading = document.createElement('h3');
  heading.textContent = 'Temukan pilihan pertamamu.';
  const caption = document.createElement('span');
  caption.className = 'bag-empty-caption';
  caption.textContent = 'CURATED FOR YOUR EVERYDAY';
  empty.prepend(illustration, caption, heading);
  const suggestions = gallery(document.getElementById('bag-cart-view'), 'cart-recommendations');
  suggestions.querySelector('.checkout-eyebrow').textContent = 'THE TANJ EDIT';
  suggestions.querySelector('h3').textContent = 'Mungkin kamu suka';
  const updateCart = () => {
    const limit = sitePreferences().recommendations;
    draw(suggestions, new Set(getItems().map((p) => p.id)));
    [...suggestions.querySelector('.recommended-products').children]
      .slice(limit)
      .forEach((node) => node.remove());
    suggestions.hidden = !limit || !suggestions.querySelector('[data-recommended-id]');
  };
  document.getElementById('bag-open').addEventListener('click', updateCart);
  new MutationObserver(updateCart).observe(document.getElementById('bag-items'), {
    childList: true,
  });
  updateCart();
  contact.href = 'https://wa.me/' + sitePreferences().whatsapp;
  window.addEventListener('tanj-site-preferences', updateCart);
  function draw(section, excluded) {
    const available = (p) =>
      p.status !== 'draft' && p.inStock !== false && p.stock > 0 && !excluded.has(p.id);
    const clothes = getCatalog().filter(available);
    const hijabs = getHijabs()
      .filter(available)
      .map((p) => ({ ...p, isHijab: true }));
    const featured = hijabs.find((p) => p.collection === 'georgia' && p.color === 'cream');
    const remaining = hijabs.filter((p) => p !== featured);
    const products = [];
    if (featured) products.push(featured);
    while (products.length < 4 && (clothes.length || remaining.length)) {
      if (clothes.length) products.push(clothes.shift());
      if (products.length < 4 && remaining.length) products.push(remaining.shift());
    }
    section.hidden = !products.length;
    const grid = section.querySelector('.recommended-products');
    grid.replaceChildren();
    grid.classList.remove('recommendation-marquee');
    grid.style.setProperty('--recommendation-count', String(products.length || 1));
    for (const item of products) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'recommended-product';
      button.dataset.recommendedId = item.id;
      const isVideo = item === featured;
      const img = document.createElement(isVideo ? 'video' : 'img');
      if (isVideo) {
        img.src = 'assets/hijab-georgia-cream.mp4';
        img.poster = item.image;
        img.autoplay = true;
        img.muted = true;
        img.defaultMuted = true;
        img.loop = true;
        img.playsInline = true;
        img.preload = 'metadata';
        img.setAttribute('aria-label', item.name);
      } else {
        img.src = item.image || item.model || item.product;
        img.alt = item.name;
        img.loading = 'lazy';
      }
      const title = document.createElement('strong');
      title.textContent = item.name;
      const detail = document.createElement('small');
      detail.textContent = [
        item.colorName || (item.isHijab ? item.color : ''),
        Number(item.price).toLocaleString('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }),
      ]
        .filter(Boolean)
        .join(' · ');
      button.append(img, title, detail);
      button.onclick = () => {
        if (item.isHijab) {
          const link = document.querySelector(
            `[data-hijab-category="${item.collection}"][data-hijab-color="${item.color}"] a`,
          );
          link?.click();
          return;
        }
        const bag = document.getElementById('bag-modal');
        bag.hidden = true;
        openProduct(item);
        productModal.querySelector('.product-panel').scrollTop = 0;
      };
      grid.append(button);
    }
    if (section !== suggestions && products.length > 1) {
      const track = document.createElement('div');
      track.className = 'recommendation-track';
      track.append(...grid.children);
      const copy = track.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('button').forEach((button, index) => {
        button.tabIndex = -1;
        button.onclick = track.children[index].onclick;
      });
      grid.classList.add('recommendation-marquee');
      grid.append(track, copy);
    }
  }
  const updateProduct = () => {
    if (!productModal.hidden) draw(product, new Set([productModal.dataset.activeProduct]));
  };
  new MutationObserver(updateProduct).observe(productModal, {
    attributes: true,
    attributeFilter: ['hidden', 'data-active-product'],
  });
  document
    .getElementById('bag-next')
    .addEventListener('click', () => draw(checkout, new Set(getItems().map((p) => p.id))));
  const updateContact = () => {
    const hidden =
      !productModal.hidden ||
      !document.getElementById('bag-modal').hidden ||
      !!document.querySelector('dialog[open]') ||
      !document.getElementById('account-modal').hidden;
    if (contact.hidden !== hidden) contact.hidden = hidden;
  };
  new MutationObserver(updateContact).observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['hidden', 'open'],
  });
  updateContact();
}
