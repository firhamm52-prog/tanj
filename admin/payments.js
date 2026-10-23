import { cloudEnabled } from '../web/supabase-payments.js?v=improve-2';
import { customerWhatsAppLink } from '../shared/customer-whatsapp.js';
import { emailConfig } from '../web/email-config.js?v=tracking-email-6';
import { notifyPayment } from '../web/payment-notifications.js?v=shipping-subsidy-1';
import {
  readPayments,
  refreshPayments,
  subscribePayments,
  orderStatus,
  paymentLabels,
  decidePayment,
  saveTracking,
  completeOrder,
  savePaymentQR,
  money,
  escapeHTML as esc,
} from '../web/manual-payment-store.js?v=order-completion-1';
import { isAdmin } from '../web/admin-session.js?v=improve-2';
const $ = (id) => document.getElementById(id);
if (!isAdmin()) location.replace('../#admin-login');
$('email-delivery-state').textContent =
  emailConfig.enabled && emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey
    ? 'EmailJS dikonfigurasi. Lakukan uji Order dan periksa Email History serta Inbox/Spam admin dan customer.'
    : 'Belum aktif: akun EmailJS TANJ belum dihubungkan. Buat layanan pengirim, template, dan Public Key melalui panduan di bawah.';
let authenticated = isAdmin(),
  selected = null,
  filter = 'CHECKING',
  query = '',
  reviewing = false;
const filters = {
  CHECKING: 'Menunggu verifikasi',
  WAITING_PAYMENT: 'Menunggu pembayaran',
  PAID: 'Payment berhasil',
  COMPLETED: 'Selesai',
  REJECTED: 'Pembayaran ditolak',
  CANCELLED: 'Dibatalkan',
  all: 'Semua',
};
function group(order) {
  if (order.status === 'PAID' && order.completedAt) return 'COMPLETED';
  const status = orderStatus(order);
  return status === 'REVIEW_DUE'
    ? 'WAITING_PAYMENT'
    : status === 'NEEDS_HELP'
      ? 'CHECKING'
      : status;
}
function render() {
  if (!isAdmin()) {
    location.replace('../#admin-login');
    return;
  }
  if (reviewing) return;
  try {
    const state = readPayments();
    const qr = state.settings.qris;
    $('qris-preview').hidden = !qr;
    $('qris-preview').src = qr?.data || '';
    $('filters').innerHTML = Object.entries(filters)
      .map(
        ([id, label]) =>
          `<button data-filter="${id}" aria-pressed="${filter === id}">${label} &middot; ${state.orders.filter((o) => id === 'all' || group(o) === id).length}</button>`,
      )
      .join('');
    $('filters')
      .querySelectorAll('button')
      .forEach(
        (b) =>
          (b.onclick = () => {
            filter = b.dataset.filter;
            selected = null;
            render();
          }),
      );
    const orders = state.orders
      .filter(
        (o) =>
          (filter === 'all' || group(o) === filter) &&
          `${o.id} ${o.customer.name}`.toLowerCase().includes(query),
      )
      .sort((a, b) => a.createdAt - b.createdAt);
    if (!orders.some((o) => o.id === selected)) selected = orders[0]?.id;
    $('orders').innerHTML =
      orders
        .map(
          (o) =>
            `<button class="order" data-order="${esc(o.id)}" aria-pressed="${selected === o.id}"><strong>${esc(o.id)}</strong><span>${esc(o.customer.name)}</span><strong>${money(o.total)}</strong><small>${esc(filters[group(o)])} &middot; ${o.proofs.length ? 'Bukti tersedia' : 'Belum ada bukti'}</small></button>`,
        )
        .join('') || '<p>Belum ada pesanan pada status ini.</p>';
    $('orders')
      .querySelectorAll('button')
      .forEach(
        (b) =>
          (b.onclick = () => {
            selected = b.dataset.order;
            render();
          }),
      );
    detail(state.orders.find((o) => o.id === selected));
  } catch (err) {
    $('review-error').textContent = err.message;
  }
}
function detail(o) {
  if (!o) {
    $('detail').innerHTML =
      '<h2>Detail pesanan</h2><p>Pilih pesanan untuk memeriksa pembayaran.</p>';
    return;
  }
  const automatic = o.payment?.provider === 'midtrans';
  $('detail').innerHTML =
    `<p>DETAIL ORDER</p><h2>${esc(o.id)}</h2><p>${esc(paymentLabels[orderStatus(o)])}</p><div class="amount">${money(o.total)}</div><p>Subtotal ${money(o.subtotal)} + ongkir ${money(o.shipping.fee)} + kode ${money(o.adjustment)}</p><p>${esc(o.customer.name)} &middot; ${esc(o.customer.phone)}<br>${esc(o.customer.address)}, ${esc(o.customer.district)}, ${esc(o.customer.city)} ${esc(o.customer.zip)}</p><ul>${o.items.map((i) => `<li>${esc(i.name)} / ${esc(i.color)} &times; ${i.qty}</li>`).join('')}</ul>${o.shipping.subsidy ? `<p>Ongkir kurir ${money(o.shipping.originalFee)} / subsidi TANJ ${money(o.shipping.subsidy)} / ongkir dibayar customer ${money(o.shipping.fee)}</p>` : ''}<h3>Bukti pembayaran</h3>${
      o.proofs.length
        ? o.proofs
            .slice()
            .reverse()
            .map(
              (p) =>
                `<p>${esc(p.name)} &middot; ${new Date(p.at).toLocaleString('id-ID')}</p><a href="${esc(p.data)}" target="_blank" rel="noopener"><img class="proof" src="${esc(p.data)}" alt="Bukti pembayaran; klik untuk memperbesar"></a>`,
            )
            .join('')
        : '<p>Belum ada bukti upload.</p>'
    }${!['PAID', 'CANCELLED'].includes(o.status) ? '<div class="actions"><button class="primary" id="approve">Approve pembayaran</button><button class="reject" id="reject">Reject</button></div><div id="review-form"></div>' : ''}<h3>Riwayat</h3><ol>${o.logs.map((l) => `<li>${new Date(l.at).toLocaleString('id-ID')} &middot; ${esc(l.note)}</li>`).join('')}</ol>`;
  $('approve')?.addEventListener('click', () => review(o, 'approve'));
  $('reject')?.addEventListener('click', () => review(o, 'reject'));
  if (automatic) {
    $('approve')?.closest('.actions')?.remove();
    $('review-form')?.remove();
    const notice = document.createElement('p');
    notice.id = 'automatic-payment-notice';
    notice.textContent =
      'Pembayaran ini diverifikasi otomatis oleh Midtrans. Approve dan Reject manual tidak tersedia. Untuk membatalkan tagihan yang belum dibayar, periksa transaksi di dashboard Midtrans. Status TANJ diperbarui setelah konfirmasi Midtrans diterima.';
    $('detail').querySelector('h3')?.before(notice);
  }
  if (o.status === 'PAID' && !o.completedAt) trackingForm(o);
  if (o.completedAt) {
    const note = document.createElement('p');
    note.textContent =
      'Selesai — diterima customer. Dikonfirmasi admin pada ' +
      new Date(o.completedAt).toLocaleString('id-ID');
    $('detail').prepend(note);
  } else if (o.status === 'PAID' && o.tracking?.number) {
    const complete = document.createElement('button');
    complete.type = 'button';
    complete.id = 'complete-order';
    complete.className = 'primary';
    complete.textContent = 'Tandai sudah diterima customer';
    complete.onclick = async () => {
      if (
        !window.confirm('Pesanan ini sudah diterima customer? Pesanan akan dipindahkan ke Selesai.')
      )
        return;
      complete.disabled = true;
      reviewing = true;
      try {
        await completeOrder(o.id, o.version);
        filter = 'COMPLETED';
        reviewing = false;
        render();
      } catch (error) {
        reviewing = false;
        complete.disabled = false;
        $('review-error').textContent = error.message;
      }
    };
    $('detail').append(complete);
  }
  customerWhatsApp(o);
}
function review(o, action) {
  if (o.payment?.provider === 'midtrans') return;
  if (action === 'approve' && o.status !== 'CHECKING') {
    $('review-error').textContent =
      'Customer belum mengonfirmasi pembayaran. Tunggu status Menunggu verifikasi.';
    return;
  }
  reviewing = true;
  const approval = action === 'approve';
  $('review-form').innerHTML =
    `<form><h3>${approval ? 'Konfirmasi pembayaran' : 'Tolak pembayaran?'}</h3><p>${approval ? 'Pastikan dana untuk tagihan di atas sudah masuk ke rekening TANJ.' : 'Customer akan melihat status Pembayaran ditolak dan dapat menghubungi CS.'}</p>${approval ? '<label><input name="checked" type="checkbox" required> Dana masuk sudah dicocokkan dengan tagihan.</label>' : ''}<p id="form-error" role="alert"></p><div class="actions"><button type="submit" class="primary">${approval ? 'Konfirmasi persetujuan' : 'Konfirmasi penolakan'}</button><button type="button" id="back">Batal</button></div></form>`;
  $('back').onclick = () => {
    reviewing = false;
    render();
  };
  $('review-form').querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const b = e.submitter;
    b.disabled = true;
    try {
      await decidePayment(
        o.id,
        o.version,
        action,
        e.currentTarget.elements.checked?.checked === true,
      );
      reviewing = false;
      if (approval) filter = 'PAID';
      render();
    } catch (err) {
      $('form-error').textContent = err.message;
      b.disabled = false;
    }
  };
}
function trackingForm(o) {
  const form = document.createElement('form');
  form.id = 'tracking-form';
  form.innerHTML = `<h3>Pengiriman</h3><label>Kurir<input name="courier" maxlength="80" required></label><label>Nomor resi<input name="number" maxlength="80" required placeholder="Masukkan nomor resi pengiriman"></label><p id="tracking-error" role="status"></p><div class="actions"><button class="primary" type="submit">Simpan nomor resi</button><button type="button" id="tracking-cancel">Batal</button></div>`;
  form.elements.courier.value = o.tracking?.courier || o.shipping.methodName || '';
  form.elements.number.value = o.tracking?.number || '';
  form.addEventListener('focusin', () => {
    reviewing = true;
  });
  form.querySelector('#tracking-cancel').onclick = () => {
    reviewing = false;
    render();
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const button = e.submitter;
    button.disabled = true;
    reviewing = true;
    try {
      const saved = await saveTracking(
        o.id,
        o.version,
        form.elements.courier.value,
        form.elements.number.value,
      );
      // Saving is the explicit send action. Keep the form disabled until the
      // email attempt finishes, including when this order was emailed before.
      await sendTrackingEmail(saved, true);
      reviewing = false;
      render();
    } catch (error) {
      form.querySelector('#tracking-error').textContent = error.message;
      button.disabled = false;
    }
  };
  $('detail').insertBefore(form, $('detail').querySelector('h3'));
}
async function sendTrackingEmail(order, resend = false) {
  const status = $('tracking-email-status');
  status.textContent = 'Mengirim email resi...';
  try {
    await notifyPayment(order, { resend });
    status.textContent = '';
  } catch (error) {
    status.textContent = 'Nomor resi tetap tersimpan. Email resi belum berhasil: ' + error.message;
  }
}
$('search').oninput = (e) => {
  query = e.target.value.toLowerCase();
  render();
};
subscribePayments(render);
window.addEventListener('focus', () => {
  if (!isAdmin()) location.replace('../#admin-login');
  $('email-delivery-state').textContent =
    emailConfig.enabled && emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey
      ? 'EmailJS dikonfigurasi. Lakukan uji Order dan periksa Email History serta Inbox/Spam admin dan customer.'
      : 'Belum aktif: akun EmailJS TANJ belum dihubungkan. Buat layanan pengirim, template, dan Public Key melalui panduan di bawah.';
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});
if (authenticated) {
  $('dashboard').hidden = false;
  if (cloudEnabled) {
    try {
      await refreshPayments();
    } catch (error) {
      $('review-error').textContent = error.message;
    }
  }
  render();
}

let uploadingQR = false;
async function uploadQR() {
  if (!isAdmin() || uploadingQR) return;
  if (!$('qris-file').files.length) {
    $('qris-message').textContent = readPayments().settings.qris
      ? 'QRIS sudah tersimpan. Pilih gambar baru jika ingin menggantinya.'
      : 'Pilih gambar QRIS terlebih dahulu.';
    return;
  }
  const button = $('qris-form').querySelector('[type=submit]');
  uploadingQR = true;
  button.disabled = true;
  button.textContent = 'Menyimpan...';
  $('qris-file').disabled = true;
  $('qris-message').textContent = 'Mengunggah QRIS...';
  try {
    const file = $('qris-file').files[0];
    if (
      !file ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    )
      throw Error('Pilih JPG, PNG, atau WebP maksimal 10 MB.');
    const source = URL.createObjectURL(file);
    const bitmap = new Image();
    try {
      bitmap.src = source;
      await bitmap.decode();
    } finally {
      URL.revokeObjectURL(source);
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/png');
    if (data.length > 1450000) data = canvas.toDataURL('image/jpeg', 0.98);
    if (data.length > 1450000)
      throw Error(
        'Gambar terlalu besar untuk disimpan dengan jelas. Potong area kosong di sekitar QRIS lalu upload kembali.',
      );
    if (!isAdmin()) throw Error('Sesi berakhir. Login ulang.');
    await savePaymentQR({ data, name: file.name });
    $('qris-message').textContent =
      'QRIS berhasil tersimpan dan langsung tampil di halaman pembayaran untuk semua perangkat.';
    $('qris-file').value = '';
    render();
  } catch (err) {
    $('qris-message').textContent = err.message;
  } finally {
    uploadingQR = false;
    button.disabled = false;
    button.textContent = 'Simpan QRIS';
    $('qris-file').disabled = false;
  }
}
$('qris-form').onsubmit = (e) => {
  e.preventDefault();
  uploadQR();
};
$('qris-file').onchange = () => {
  const file = $('qris-file').files[0];
  $('qris-form').querySelector('[type=submit]').disabled = uploadingQR;
  $('qris-message').textContent = file ? 'Gambar dipilih. Tekan Simpan QRIS untuk menyimpan.' : '';
};
$('qris-remove').onclick = async () => {
  if (!isAdmin()) return;
  try {
    await savePaymentQR(null);
    $('qris-message').textContent = 'Gambar QRIS dihapus.';
    render();
  } catch (err) {
    $('qris-message').textContent = err.message;
  }
};

if (cloudEnabled) {
  document.querySelector('.trial-tag').textContent = 'Pembayaran manual';
  document.querySelector('details>p').textContent =
    'Pilih gambar, lalu tekan Simpan QRIS. Gambar disimpan online dan tampil di checkout semua perangkat.';
}

function customerWhatsApp(order) {
  if (order.status !== 'CHECKING' && $('approve')) {
    $('approve').disabled = true;
    $('approve').style.cursor = 'not-allowed';
    $('approve').title = 'Customer belum mengonfirmasi pembayaran';
  }
  const section = document.createElement('section');
  section.id = 'customer-whatsapp';
  const href = customerWhatsAppLink(
    order,
    paymentLabels[orderStatus(order)],
    new URL('../', location.href).href,
  );
  const help = document.createElement('p');
  help.textContent = href
    ? 'Membuka chat customer dengan pesan siap kirim. Tekan Kirim di WhatsApp untuk mengirimkannya.'
    : 'Nomor WhatsApp customer belum valid. Periksa nomor pada pesanan.';
  if (href) {
    const link = document.createElement('a');
    link.id = 'customer-whatsapp-send';
    link.className = 'primary';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Kirim detail pesanan ke WhatsApp customer ↗';
    section.append(link);
  }
  section.append(help);
  $('detail').insertBefore(section, $('detail').querySelector('ul'));
}
