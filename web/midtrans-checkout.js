import { midtransRequest } from './midtrans.js';

let snapScript;
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
    redirect = (url) => location.assign(url),
  } = {},
) {
  let stopped = false,
    busy = false,
    verifying = false;
  container.innerHTML =
    '<p role="status">Menyiapkan QRIS dan Virtual Account…</p><div class="midtrans-embed"></div><p data-verification role="status" hidden></p><button type="button" class="shop-outline" hidden>Muat ulang pembayaran</button>';
  const message = container.querySelector('[role=status]');
  const frame = container.querySelector('.midtrans-embed');
  frame.id = 'midtrans-' + crypto.randomUUID();
  const retry = container.querySelector('button');
  const verification = container.querySelector('[data-verification]');
  const active = () => !stopped && container.isConnected;
  async function verify() {
    if (!active() || document.hidden || container.closest('[hidden]') || verifying) return;
    verifying = true;
    try {
      const result = await request('status', orderId);
      if (active()) verification.hidden = true;
      if (active() && ['PAID', 'CANCELLED'].includes(result.status)) await onVerified();
    } catch {
      if (active()) {
        verification.textContent =
          'Status pembayaran akan diperiksa kembali otomatis saat koneksi tersedia.';
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
      snap.embed(data.snapToken, {
        embedId: frame.id,
        onSuccess: verify,
        onPending: verify,
        onError: () => {
          if (active()) {
            message.textContent = 'Pembayaran belum selesai. Status akan diperiksa otomatis.';
            retry.hidden = false;
          }
        },
      });
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
    clearInterval(timer);
    window.removeEventListener('focus', resume);
    document.removeEventListener('visibilitychange', resume);
  };
}
