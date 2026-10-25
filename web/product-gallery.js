export function mountProductGallery(root, { resolveImage = (value) => value } = {}) {
  root.classList.add('has-product-gallery');
  const image = root.querySelector('img');
  const main = document.createElement('div');
  main.className = 'product-gallery-main';
  root.insertBefore(main, image);
  main.append(image);
  image.draggable = false;
  const thumbs = document.createElement('div');
  thumbs.className = 'product-gallery-thumbs';
  thumbs.setAttribute('role', 'group');
  thumbs.setAttribute('aria-label', 'Pilih foto produk');
  root.append(thumbs);
  const previous = document.createElement('button'),
    next = document.createElement('button');
  for (const [button, label, text] of [
    [previous, 'Foto sebelumnya', '‹'],
    [next, 'Foto berikutnya', '›'],
  ]) {
    button.type = 'button';
    button.className = 'product-gallery-arrow';
    button.setAttribute('aria-label', label);
    button.textContent = text;
    main.append(button);
  }
  previous.classList.add('previous');
  next.classList.add('next');
  const count = document.createElement('span');
  count.className = 'product-gallery-count';
  count.setAttribute('aria-live', 'polite');
  main.append(count);
  let photos = [],
    selected = 0,
    signature = '',
    name = '',
    pointer = null;
  function show(index) {
    if (!photos.length) return;
    selected = (index + photos.length) % photos.length;
    image.src = photos[selected];
    image.alt = `${name} — foto ${selected + 1} dari ${photos.length}`;
    count.textContent = `${selected + 1} / ${photos.length}`;
    [...thumbs.children].forEach((button, i) =>
      button.setAttribute('aria-pressed', String(i === selected)),
    );
  }
  previous.onclick = () => show(selected - 1);
  next.onclick = () => show(selected + 1);
  root.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    show(selected + (event.key === 'ArrowRight' ? 1 : -1));
  });
  main.addEventListener('pointerdown', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
  });
  main.addEventListener('pointerup', (event) => {
    if (!pointer) return;
    const dx = event.clientX - pointer.x,
      dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(selected + (dx < 0 ? 1 : -1));
  });
  main.addEventListener('pointercancel', () => {
    pointer = null;
  });
  return {
    set(item) {
      const sources = item.gallery?.length ? item.gallery : [item.model, item.product, item.image];
      const resolved = [...new Set(sources.filter(Boolean).map(resolveImage).filter(Boolean))];
      const key = JSON.stringify([item.id, resolved]);
      if (key === signature) return;
      signature = key;
      photos = resolved;
      selected = 0;
      name = item.name || 'Produk TANJ';
      root.classList.toggle('single-photo', photos.length < 2);
      thumbs.replaceChildren();
      photos.forEach((url, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Lihat foto ' + (index + 1));
        const preview = document.createElement('img');
        preview.src = url;
        preview.alt = '';
        preview.loading = 'lazy';
        button.append(preview);
        button.onclick = () => show(index);
        thumbs.append(button);
      });
      for (const el of [previous, next, count, thumbs]) el.hidden = photos.length < 2;
      show(0);
    },
  };
}
