export async function cropCmsImage(file, { initialRatio = 3 / 4 } = {}) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error('Pilih foto JPG, PNG atau WebP.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw Error('Ukuran foto maksimal 5 MB.');
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = sourceUrl;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(sourceUrl);
    throw Error('Foto tidak dapat dibuka. Pilih foto lain.');
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'cms-crop-dialog';
  dialog.setAttribute('aria-labelledby', 'cms-crop-title');
  dialog.innerHTML = `<h2 id="cms-crop-title">Atur foto sebelum upload</h2>
    <p>Geser foto untuk mengatur posisi. Gunakan zoom untuk memperbesar atau memperkecil.</p>
    <div class="cms-crop-stage"><canvas tabindex="0" aria-label="Geser foto, atau gunakan tombol panah untuk mengatur posisi"></canvas></div>
    <div class="cms-crop-controls"><label>Bentuk foto<select data-ratio><option value="0.75">Potret 3:4</option><option value="0.8">Potret 4:5</option><option value="1">Persegi 1:1</option><option value="1.7777777777777777">Lanskap 16:9</option><option value="original">Ukuran asli</option></select></label>
    <label>Zoom<input data-zoom type="range" min="0.5" max="4" step="0.01" value="1"></label></div>
    <button type="button" class="secondary" data-reset>Atur ulang</button>
    <p data-error role="alert" hidden></p>
    <div class="dialog-actions"><button type="button" class="secondary" data-cancel>Batal</button><button type="button" class="primary" data-apply>Pakai foto &amp; upload</button></div>`;
  document.body.append(dialog);
  const canvas = dialog.querySelector('canvas');
  const zoom = dialog.querySelector('[data-zoom]');
  const ratioControl = dialog.querySelector('[data-ratio]');
  ratioControl.value = String(initialRatio);
  let ratio = 3 / 4,
    x = 0,
    y = 0,
    drag = null,
    encoding = false;
  function draw(target = canvas, scale = 1) {
    const ctx = target.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, target.width, target.height);
    const fit = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const size = fit * Number(zoom.value) * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      target.width / 2 + x * scale - (image.naturalWidth * size) / 2,
      target.height / 2 + y * scale - (image.naturalHeight * size) / 2,
      image.naturalWidth * size,
      image.naturalHeight * size,
    );
  }
  function reset() {
    ratio =
      ratioControl.value === 'original'
        ? image.naturalWidth / image.naturalHeight
        : Number(ratioControl.value);
    canvas.width = Math.max(1, Math.round(Math.min(360, 480 * ratio)));
    canvas.height = Math.max(1, Math.round(Math.min(480, 360 / ratio)));
    x = y = 0;
    zoom.value = '1';
    draw();
  }
  function move(dx, dy) {
    x = Math.max(-canvas.width, Math.min(canvas.width, x + dx));
    y = Math.max(-canvas.height, Math.min(canvas.height, y + dy));
    draw();
  }
  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || encoding) return;
    const rect = canvas.getBoundingClientRect();
    move(
      ((event.clientX - drag.x) * canvas.width) / rect.width,
      ((event.clientY - drag.y) * canvas.height) / rect.height,
    );
    drag = { x: event.clientX, y: event.clientY };
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(name, () => {
      drag = null;
    });
  canvas.addEventListener('keydown', (event) => {
    const directions = {
      ArrowLeft: [-5, 0],
      ArrowRight: [5, 0],
      ArrowUp: [0, -5],
      ArrowDown: [0, 5],
    };
    if (!directions[event.key] || encoding) return;
    event.preventDefault();
    move(...directions[event.key]);
  });
  zoom.addEventListener('input', () => draw());
  ratioControl.addEventListener('change', reset);
  dialog.querySelector('[data-reset]').onclick = reset;
  reset();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      URL.revokeObjectURL(sourceUrl);
      resolve(value);
    };
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (!encoding) finish(null);
    });
    dialog.querySelector('[data-cancel]').onclick = () => finish(null);
    dialog.querySelector('[data-apply]').onclick = async () => {
      if (encoding) return;
      encoding = true;
      dialog.querySelectorAll('button,input,select').forEach((el) => {
        el.disabled = true;
      });
      const error = dialog.querySelector('[data-error]');
      error.hidden = true;
      try {
        const output = document.createElement('canvas');
        const scale = Math.min(1200 / canvas.width, 2000 / canvas.height);
        output.width = Math.round(canvas.width * scale);
        output.height = Math.round(canvas.height * scale);
        draw(output, scale);
        const blob = await new Promise((resolve) => output.toBlob(resolve, 'image/webp', 0.92));
        if (!blob || blob.size > 5 * 1024 * 1024)
          throw Error('Foto belum dapat diproses. Coba atur ulang.');
        finish(
          new File([blob], 'cms-cropped.' + (blob.type === 'image/webp' ? 'webp' : 'png'), {
            type: blob.type,
          }),
        );
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
      } finally {
        encoding = false;
        dialog.querySelectorAll('button,input,select').forEach((el) => {
          el.disabled = false;
        });
      }
    };
    dialog.showModal();
  });
}
