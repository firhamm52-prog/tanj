import { midtransRequest } from './midtrans.js?v=change-feedback-12';

let snapOwner;
let activeSnap;
export async function loadSnap(production, clientKey) {
  let iframe, sdk, cancelLoad;
  return {
    async embed(token, options) {
      // Each session gets its own SDK window; removing it cannot hide a newer session.
      const host = document.getElementById(options.embedId);
      iframe = document.createElement('iframe');
      iframe.title = 'QRIS dan VA';
      iframe.style.cssText = 'display:block;width:100%;height:700px;min-height:560px;border:0';
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error('Pembayaran belum dapat dimuat. Coba lagi.')),
          20000,
        );
        cancelLoad = () => {
          clearTimeout(timer);
          reject(Error('Tampilan pembayaran ditutup.'));
        };
        iframe.onload = () => {
          if (!iframe.isConnected) return;
          const doc = iframe.contentDocument;
          const script = doc.createElement('script');
          script.src = production
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';
          script.dataset.clientKey = clientKey;
          script.onload = () => {
            clearTimeout(timer);
            cancelLoad = null;
            sdk = iframe.contentWindow.snap;
            sdk?.embed ? resolve() : reject(Error('Pembayaran belum dapat dimuat.'));
          };
          script.onerror = () => {
            clearTimeout(timer);
            cancelLoad = null;
            reject(Error('Koneksi pembayaran terputus. Coba lagi.'));
          };
          doc.head.append(script);
        };
        iframe.srcdoc =
          '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%}#snap-root{width:100%;height:100%}</style></head><body><div id="snap-root"></div></body></html>';
        host.replaceChildren(iframe);
      });
      await sdk.embed(token, { ...options, embedId: 'snap-root' });
    },
    hide() {
      cancelLoad?.();
      cancelLoad = null;
      sdk?.hide?.();
      iframe?.remove();
    },
  };
}

export function mountMidtransCheckout(
  container,
  orderId,
  {
    request = midtransRequest,
    load = loadSnap,
    onVerified = async () => {},
    canChangeMethod = false,
    canChangeBank = false,
    deadline = null,
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
      activeSnap = null;
      mountedSnap?.hide?.();
    }
  }
  container.innerHTML =
    '<p role="status">Menyiapkan QRIS dan Virtual Account…</p><div class="midtrans-embed"></div><p data-verification role="status" hidden></p><button type="button" class="shop-outline" hidden>Muat ulang pembayaran</button>';
  const message = container.querySelector('[role=status]');
  const frame = container.querySelector('.midtrans-embed');
  frame.id = 'midtrans-' + crypto.randomUUID();
  const retry = container.querySelector('button');
  let expired =
    Number.isFinite(Number(deadline)) && Number(deadline) > 0 && Number(deadline) <= Date.now();
  function showExpired() {
    expired = true;
    message.hidden = true;
    retry.hidden = true;
    frame.hidden = true;
    if (!container.querySelector('.payment-expired')) {
      const notice = document.createElement('div');
      notice.className = 'payment-expired';
      notice.setAttribute('role', 'status');
      notice.innerHTML =
        '<span class="payment-expired-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 6 12 12M18 6 6 18"/></svg></span><h4>Pembayaran kedaluwarsa</h4>';
      container.prepend(notice);
    }
  }
  if (expired) showExpired();
  const checkStatus = document.createElement('button');
  checkStatus.type = 'button';
  checkStatus.className = 'shop-outline';
  checkStatus.textContent = 'Cek status pembayaran';
  container.append(checkStatus);
  if (!expired && (canChangeMethod || canChangeBank)) {
    const change = document.createElement('button');
    change.type = 'button';
    change.className = 'shop-outline';
    change.textContent = canChangeMethod ? 'Ubah metode pembayaran' : 'Ubah bank account';
    const changeNotice = document.createElement('p');
    changeNotice.dataset.methodChange = '';
    changeNotice.setAttribute('role', 'status');
    changeNotice.hidden = true;
    change.onclick = async () => {
      if (busy || !active()) return;
      busy = true;
      change.disabled = true;
      changeNotice.hidden = false;
      changeNotice.textContent = canChangeMethod
        ? 'Memeriksa tagihan dan mengubah metode pembayaran…'
        : 'Mengganti bank pembayaran. Jangan bayar VA lama selama proses ini…';
      verification.hidden = true;
      let reopen = false;
      try {
        const result = await request(canChangeMethod ? 'change-method' : 'change-bank', orderId);
        if (!active()) return;
        if (result.changed || result.bankSelectionReady || result.status === 'PAID') {
          closeSnap();
          if (result.changed || result.bankSelectionReady) {
            changeNotice.textContent = 'Menampilkan pilihan bank kembali pada pesanan ini…';
            reopen = true;
            change.hidden = canChangeMethod;
            await onVerified();
          } else await onVerified();
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
    checkStatus.disabled = true;
    verification.textContent = 'Memeriksa status langsung ke Midtrans…';
    verification.hidden = false;
    try {
      const result = await request('status', orderId);
      if (!active()) return;
      if (['PAID', 'CANCELLED'].includes(result.status)) {
        verification.textContent =
          result.status === 'PAID'
            ? 'Pembayaran sudah diterima.'
            : 'Transaksi sudah berakhir. Memperbarui pesanan…';
        await onVerified();
      } else {
        verification.textContent = expired
          ? result.notStarted
            ? 'Status belum tersedia.'
            : 'Status belum tersinkron.'
          : result.notStarted
            ? 'Transaksi tidak ditemukan di Midtrans pada konfigurasi saat ini. Status pesanan dan stok belum diubah. Hubungi admin dengan nomor pesanan untuk memeriksa mode Sandbox/Production dan transaksi lama.'
            : 'Midtrans masih melaporkan pembayaran belum selesai. Status pesanan belum berubah.';
      }
    } catch (error) {
      if (active()) {
        verification.textContent = expired
          ? 'Belum bisa dicek. Coba lagi.'
          : error.status
            ? 'Pengecekan status belum berhasil: ' + error.message
            : 'Status pembayaran akan diperiksa kembali otomatis saat koneksi tersedia.';
        verification.hidden = false;
      }
    } finally {
      verifying = false;
      checkStatus.disabled = false;
    }
  }
  async function start() {
    if (busy || !active()) return;
    busy = true;
    retry.hidden = true;
    message.textContent = 'Menyiapkan QRIS dan Virtual Account…';
    let failed = false;
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
      if (snapOwner) activeSnap?.hide?.();
      mountedSnap = snap;
      activeSnap = snap;
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
        message.textContent =
          'Pembayaran belum dapat ditampilkan. Tekan Muat ulang pembayaran untuk mencoba kembali.';
        retry.hidden = false;
        return;
      }
      message.textContent = 'Pilih QRIS atau Virtual Account untuk membayar.';
    } catch (error) {
      failed = true;
      if (active()) {
        message.textContent = error.message;
        retry.hidden = false;
        if (/batas pembayaran.*lewat|kedaluwarsa|expired/i.test(error.message)) showExpired();
      }
    } finally {
      busy = false;
      if (failed && active()) void verify();
    }
  }
  retry.onclick = start;
  checkStatus.onclick = () => void verify();
  const timer = setInterval(() => {
    if (!active()) clearInterval(timer);
    else void verify();
  }, 5000);
  const resume = () => {
    void verify();
  };
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', resume);
  if (expired) void verify();
  else void start();
  return () => {
    stopped = true;
    closeSnap();
    clearInterval(timer);
    window.removeEventListener('focus', resume);
    document.removeEventListener('visibilitychange', resume);
  };
}
