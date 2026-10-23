import { midtransRequest } from './midtrans.js?v=change-feedback-12';

let snapScript;
let snapOwner;
export function loadSnap(production, clientKey) {
  return (snapScript ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = production
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.dataset.clientKey = clientKey;
    script.onload = () =>
      window.snap?.embed ? resolve(window.snap) : reject(Error('Pembayaran belum dapat dimuat.'));
    script.onerror = () => {
      script.remove();
      snapScript = null;
      reject(Error('Koneksi pembayaran terputus. Coba muat ulang pembayaran.'));
    };
    document.head.append(script);
  }));
}

export function mountMidtransCheckout(
  container,
  orderId,
  {
    request = midtransRequest,
    load = loadSnap,
    onVerified = async () => {},
    canChangeMethod = false,
    redirect = (url) => location.assign(url),
  } = {},
) {
  let stopped = false,
    busy = false,
    verifying = false;
  const owner = {};
  let mountedSnap;
  function closeSnap() {
    if (snapOwner === owner) {
      snapOwner = null;
      mountedSnap?.hide?.();
    }
  }
  container.innerHTML =
    '<p role="status">Menyiapkan QRIS dan Virtual Account…</p><div class="midtrans-embed"></div><p data-verification role="status" hidden></p><button type="button" class="shop-outline" hidden>Muat ulang pembayaran</button>';
  const message = container.querySelector('[role=status]');
  const frame = container.querySelector('.midtrans-embed');
  frame.id = 'midtrans-' + crypto.randomUUID();
  const retry = container.querySelector('button');
  if (canChangeMethod) {
    const change = document.createElement('button');
    change.type = 'button';
    change.className = 'shop-outline';
    change.textContent = 'Ubah metode pembayaran';
    const changeNotice = document.createElement('p');
    changeNotice.dataset.methodChange = '';
    changeNotice.setAttribute('role', 'status');
    changeNotice.hidden = true;
    change.onclick = async () => {
      if (
        busy ||
        !active() ||
        !window.confirm(
          'Ubah pembayaran QRIS menjadi Virtual Account? Server akan memeriksa apakah tagihan masih dapat diubah.',
        )
      )
        return;
      busy = true;
      change.disabled = true;
      changeNotice.hidden = false;
      changeNotice.textContent = 'Memeriksa tagihan dan mengubah metode pembayaran…';
      verification.hidden = true;
      let reopen = false;
      try {
        const result = await request('change-method', orderId);
        if (!active()) return;
        if (result.changed || result.status === 'PAID') {
          closeSnap();
          if (result.changed) {
            change.hidden = true;
            reopen = true;
            changeNotice.textContent =
              'Metode pembayaran diubah menjadi Virtual Account. Menyiapkan pembayaran…';
          }
          await onVerified();
        } else throw Error('Perubahan metode pembayaran belum dikonfirmasi. Coba kembali.');
      } catch (error) {
        if (active()) changeNotice.textContent = error.message;
      } finally {
        busy = false;
        change.disabled = false;
        if (reopen && active()) void start();
      }
    };
    container.append(change, changeNotice);
  }
  const verification = container.querySelector('[data-verification]');
  const active = () => !stopped && container.isConnected;
  async function verify() {
    if (!active() || busy || document.hidden || container.closest('[hidden]') || verifying) return;
    verifying = true;
    try {
      const result = await request('status', orderId);
      if (active()) verification.hidden = true;
      if (active() && ['PAID', 'CANCELLED'].includes(result.status)) await onVerified();
    } catch (error) {
      if (active()) {
        verification.textContent = error.status
          ? 'Pengecekan status belum berhasil: ' + error.message
          : 'Status pembayaran akan diperiksa kembali otomatis saat koneksi tersedia.';
        verification.hidden = false;
      }
    } finally {
      verifying = false;
    }
  }
  async function start() {
    if (busy || !active()) return;
    busy = true;
    retry.hidden = true;
    message.textContent = 'Menyiapkan QRIS dan Virtual Account…';
    try {
      const data = await request('start', orderId);
      if (!active()) return;
      if (['PAID', 'CANCELLED'].includes(data.status)) {
        await onVerified();
        return;
      }
      if (data.paymentPending)
        throw Error(
          'Tagihan sebelumnya sudah aktif. Gunakan QRIS/VA dari pembayaran sebelumnya atau hubungi admin dengan nomor pesanan.',
        );
      const url = new URL(data.redirectUrl);
      if (
        url.protocol !== 'https:' ||
        !['app.midtrans.com', 'app.sandbox.midtrans.com'].includes(url.hostname) ||
        !url.pathname.startsWith('/snap/')
      )
        throw Error('Tautan pembayaran tidak valid.');
      // Hosted checkout remains available while the merchant configures the public Client Key.
      if (!data.snapToken || !data.clientKey) {
        redirect(url.href);
        return;
      }
      const snap = await load(data.production, data.clientKey);
      if (!active()) return;
      if (snapOwner) snap.hide?.();
      mountedSnap = snap;
      snapOwner = owner;
      try {
        await snap.embed(data.snapToken, {
          embedId: frame.id,
          onSuccess: verify,
          onPending: verify,
          onError: () => {
            if (active()) {
              message.textContent = 'Pembayaran belum selesai. Status akan diperiksa otomatis.';
              retry.hidden = false;
            }
          },
          onClose: () => {
            if (active()) {
              retry.hidden = false;
              message.textContent = 'Pembayaran belum selesai. Buka kembali untuk melanjutkan.';
            }
          },
        });
      } catch (error) {
        if (!/invalid state transition|not allowed to be called in this state/i.test(error.message))
          throw error;
        closeSnap();
        redirect(url.href);
        return;
      }
      message.textContent = 'Pilih QRIS atau Virtual Account untuk membayar.';
    } catch (error) {
      if (active()) {
        message.textContent = error.message;
        retry.hidden = false;
      }
    } finally {
      busy = false;
    }
  }
  retry.onclick = start;
  const timer = setInterval(() => {
    if (!active()) clearInterval(timer);
    else void verify();
  }, 5000);
  const resume = () => {
    void verify();
  };
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', resume);
  void start();
  return () => {
    stopped = true;
    closeSnap();
    clearInterval(timer);
    window.removeEventListener('focus', resume);
    document.removeEventListener('visibilitychange', resume);
  };
}
