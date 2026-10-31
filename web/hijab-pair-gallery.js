export function mountHijabPairGallery(
  root,
  { resolveImage = (value) => value, openProduct = () => {} } = {},
) {
  root.classList.add('hijab-pair-gallery');
  root.innerHTML =
    '<header><p class="eyebrow">TANJ / HIJAB EDIT</p><h2>Everyday, beautifully framed.</h2></header><div class="hijab-pair-stage" tabindex="0" aria-label="Galeri hijab, geser kiri atau kanan"><figure><img data-model draggable="false"><figcaption>On the model</figcaption></figure><figure><img data-mockup draggable="false"><span data-placeholder hidden>Mockup belum tersedia</span><figcaption>The hijab</figcaption></figure></div><div class="hijab-pair-controls"><button type="button" data-prev aria-label="Hijab sebelumnya">‹</button><div><p data-name aria-live="polite"></p><span data-count></span></div><button type="button" data-next aria-label="Hijab berikutnya">›</button></div><button type="button" class="hijab-pair-detail">Lihat hijab</button>';
  const model = root.querySelector('[data-model]');
  const mockup = root.querySelector('[data-mockup]');
  const stage = root.querySelector('.hijab-pair-stage');
  let items = [],
    selected = 0,
    pointer;
  function show(index) {
    if (!items.length) return;
    selected = (index + items.length) % items.length;
    const item = items[selected];
    root.dataset.productId = item.id;
    const left = item.image || item.model || item.gallery?.[0];
    const right = item.product || item.gallery?.find((photo) => photo !== left);
    model.src = resolveImage(left);
    model.alt = item.name + ' — foto model';
    mockup.hidden = !right;
    root.querySelector('[data-placeholder]').hidden = Boolean(right);
    if (right) mockup.src = resolveImage(right);
    else mockup.removeAttribute('src');
    mockup.alt = item.name + ' — mockup hijab';
    root.querySelector('[data-name]').textContent = item.name;
    root.querySelector('[data-count]').textContent = `${selected + 1} / ${items.length}`;
    for (const button of root.querySelectorAll('[data-prev],[data-next]'))
      button.disabled = items.length < 2;
  }
  root.querySelector('[data-prev]').onclick = () => show(selected - 1);
  root.querySelector('[data-next]').onclick = () => show(selected + 1);
  root.querySelector('.hijab-pair-detail').onclick = () => {
    if (items[selected]) openProduct(items[selected]);
  };
  stage.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    show(selected + (event.key === 'ArrowRight' ? 1 : -1));
  });
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointer = { x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup', (event) => {
    if (!pointer) return;
    const dx = event.clientX - pointer.x,
      dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(selected + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => {
    pointer = null;
  });
  return {
    set(next) {
      const previous = items[selected]?.id;
      items = next.filter(
        (item) => item.status !== 'draft' && (item.image || item.model || item.gallery?.[0]),
      );
      root.hidden = !items.length;
      const index = items.findIndex((item) => item.id === previous);
      show(index < 0 ? 0 : index);
    },
  };
}
