export async function cropCmsVideo(file, { ratio = 9 / 16 } = {}) {
  if (!file.size || file.size > 50 * 1024 * 1024) throw Error('Ukuran video maksimal 50 MB.');
  const url = URL.createObjectURL(file);
  const dialog = document.createElement('dialog');
  dialog.className = 'cms-video-crop';
  dialog.setAttribute('aria-label', 'Atur posisi video');
  dialog.innerHTML = `<h2>Atur posisi video</h2><p>Geser video atau atur posisi dan zoom. Seluruh durasi video tetap digunakan.</p><div class="video-crop-stage" tabindex="0" aria-label="Geser untuk mengatur posisi video"><video muted playsinline loop></video></div><label>Format<select><option value="${ratio}">Ukuran bagian website (${ratio < 1 ? '9:16' : '16:9'})</option><option value="1">Kotak 1:1</option><option value="original">Ukuran asli</option></select></label><label>Zoom<input data-control="zoom" type="range" min="1" max="3" step="0.01" value="1"></label><label>Posisi horizontal<input data-control="x" type="range" min="0" max="1" step="0.01" value="0.5"></label><label>Posisi vertikal<input data-control="y" type="range" min="0" max="1" step="0.01" value="0.5"></label><p role="status">Memuat preview…</p><div class="row-actions"><button type="button" data-action="reset">Reset</button><button type="button" data-action="cancel">Batal</button><button type="button" class="primary" data-action="apply" disabled>Gunakan crop & upload</button></div>`;
  document.body.append(dialog);
  const video = dialog.querySelector('video');
  const stage = dialog.querySelector('.video-crop-stage');
  const controls = Object.fromEntries(
    [...dialog.querySelectorAll('[data-control]')].map((el) => [el.dataset.control, el]),
  );
  const apply = dialog.querySelector('[data-action=apply]');
  const status = dialog.querySelector('[role=status]');
  let selectedRatio = ratio,
    pointer;
  const update = () => {
    stage.style.aspectRatio = String(selectedRatio);
    stage.style.width = `min(100%, 360px, ${52 * selectedRatio}dvh)`;
    video.style.objectPosition = `${controls.x.value * 100}% ${controls.y.value * 100}%`;
    video.style.transformOrigin = video.style.objectPosition;
    video.style.transform = `scale(${controls.zoom.value})`;
  };
  dialog.addEventListener('input', update);
  dialog.querySelector('select').onchange = (event) => {
    selectedRatio =
      event.target.value === 'original'
        ? video.videoWidth / video.videoHeight
        : Number(event.target.value);
    update();
  };
  stage.onpointerdown = (event) => {
    pointer = {
      x: event.clientX,
      y: event.clientY,
      px: Number(controls.x.value),
      py: Number(controls.y.value),
    };
    stage.setPointerCapture(event.pointerId);
  };
  stage.onpointermove = (event) => {
    if (!pointer) return;
    controls.x.value = Math.min(
      1,
      Math.max(0, pointer.px - (event.clientX - pointer.x) / stage.clientWidth),
    );
    controls.y.value = Math.min(
      1,
      Math.max(0, pointer.py - (event.clientY - pointer.y) / stage.clientHeight),
    );
    update();
  };
  stage.onpointerup = stage.onpointercancel = () => {
    pointer = null;
  };
  dialog.querySelector('[data-action=reset]').onclick = () => {
    controls.x.value = controls.y.value = '0.5';
    controls.zoom.value = '1';
    update();
  };
  video.onloadeddata = () => {
    apply.disabled = false;
    status.textContent =
      'Preview siap. Hasil upload berupa video tanpa suara, sesuai pemutaran website.';
    video.play().catch(() => {});
  };
  video.onerror = () => {
    status.textContent = 'Video tidak dapat dibaca. Ekspor sebagai MP4 H.264, lalu coba lagi.';
  };
  update();
  video.src = url;
  dialog.showModal();
  try {
    return await new Promise((resolve) => {
      apply.onclick = () =>
        resolve({
          ratio: selectedRatio,
          zoom: Number(controls.zoom.value),
          x: Number(controls.x.value),
          y: Number(controls.y.value),
        });
      dialog.querySelector('[data-action=cancel]').onclick = () => resolve(null);
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        resolve(null);
      });
    });
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    dialog.close();
    dialog.remove();
    URL.revokeObjectURL(url);
  }
}
