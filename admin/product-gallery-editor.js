import { cropCmsImage } from '../web/cms-image-crop.js?v=crop-1';
import { uploadCmsImage } from '../web/cms-upload.js';

export function mountProductGalleryEditor(host, item, { onBusy, onDirty, requireAdmin }) {
  const form = host.closest('form');
  let photos = [
    ...new Set(
      item.gallery?.length
        ? item.gallery
        : ['model', 'product', 'image']
            .map((name) => form.elements.namedItem(name)?.value)
            .filter(Boolean),
    ),
  ];
  host.innerHTML = `<h3>Galeri foto produk</h3><p>Foto pertama tampil saat produk dibuka. Geser urutan dengan tombol maju/mundur. Maksimal 10 foto.</p><input type="hidden" name="gallery"><div class="cms-gallery-list"></div><label>Tambah beberapa foto<input type="file" data-gallery-upload accept="image/jpeg,image/png,image/webp" multiple></label><p data-gallery-status role="status"></p>`;
  const field = host.querySelector('[name=gallery]');
  const list = host.querySelector('.cms-gallery-list');
  const picker = host.querySelector('[data-gallery-upload]');
  const status = host.querySelector('[data-gallery-status]');
  let busy = false;
  const render = () => {
    field.value = JSON.stringify(photos);
    list.replaceChildren();
    photos.forEach((url, index) => {
      const row = document.createElement('div');
      row.className = 'cms-gallery-item';
      const image = document.createElement('img');
      image.src = url.startsWith('assets/') ? '../' + url : url;
      image.alt = 'Foto ' + (index + 1);
      image.loading = 'lazy';
      const label = document.createElement('span');
      label.textContent = index === 0 ? '1 · Foto utama' : String(index + 1);
      row.append(image, label);
      for (const [text, title, disabled, action] of [
        [
          '←',
          'Majukan foto ' + (index + 1),
          index === 0,
          () => {
            [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
          },
        ],
        [
          '→',
          'Mundurkan foto ' + (index + 1),
          index === photos.length - 1,
          () => {
            [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]];
          },
        ],
        ['Hapus', 'Hapus foto ' + (index + 1), photos.length === 1, () => photos.splice(index, 1)],
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary';
        button.textContent = text;
        button.setAttribute('aria-label', title);
        button.disabled = busy || disabled;
        button.onclick = () => {
          if (busy) return;
          action();
          render();
          onDirty();
        };
        row.append(button);
      }
      list.append(row);
    });
    picker.disabled = busy || photos.length >= 10;
  };
  for (const name of ['model', 'product', 'image']) {
    const source = form.elements.namedItem(name);
    if (!source) continue;
    let previous = source.value;
    source.addEventListener('change', () => {
      photos = photos.map((url) => (url === previous ? source.value : url)).filter(Boolean);
      if (!previous && source.value && !photos.includes(source.value)) photos.push(source.value);
      photos = [...new Set(photos)];
      previous = source.value;
      render();
    });
  }
  picker.addEventListener('change', async () => {
    const files = [...picker.files];
    if (!files.length || busy) return;
    if (photos.length + files.length > 10) {
      status.textContent = 'Maksimal 10 foto. Hapus foto atau pilih lebih sedikit.';
      picker.value = '';
      return;
    }
    const controls = [...form.querySelectorAll('[type=submit],[type=file]')];
    const disabled = controls.map((el) => el.disabled);
    busy = true;
    onBusy(true);
    controls.forEach((el) => {
      el.disabled = true;
    });
    render();
    let uploaded = 0;
    try {
      requireAdmin();
      for (const [index, file] of files.entries()) {
        status.textContent = `Atur foto ${index + 1} dari ${files.length}…`;
        const cropped = await cropCmsImage(file);
        if (!cropped) {
          status.textContent = `Dibatalkan. ${uploaded} foto sudah ditambahkan ke galeri.`;
          return;
        }
        status.textContent = `Mengunggah foto ${index + 1} dari ${files.length}…`;
        const url = await uploadCmsImage(cropped);
        photos.push(url);
        uploaded++;
        render();
        onDirty();
      }
      status.textContent = `${uploaded} foto ditambahkan. Simpan dan publikasikan agar tampil di website.`;
    } catch (err) {
      status.textContent = `${err.message} ${uploaded ? uploaded + ' foto sebelumnya tetap ada di galeri.' : ''}`;
    } finally {
      busy = false;
      onBusy(false);
      picker.value = '';
      controls.forEach((el, index) => {
        el.disabled = disabled[index];
      });
      render();
    }
  });
  render();
}
