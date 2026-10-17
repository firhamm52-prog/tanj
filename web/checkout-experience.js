import {
  customerSession,
  requireCustomer,
  addresses,
  loadAddresses,
  saveAddress,
  deleteAddress,
} from './customer-account.js?v=owner-ui-3';
import { getShippingEstimate, validateShippingDestination } from './shipping.js?v=districts-1';
import { shippingConfiguration, shippingRates } from './biteship.js';
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const money = (value) => 'Rp' + Number(value).toLocaleString('id-ID');
export const deliveryMethods = [
  { id: 'jt-regular', name: 'J&T', service: 'Reguler' },
  { id: 'jne-regular', name: 'JNE', service: 'Reguler' },
  { id: 'lion-regpack', name: 'Lion Parcel', service: 'Reg Pack' },
];
export const paymentMethods = [
  {
    id: 'qris-manual',
    name: 'QRIS',
    detail: 'Pembayaran manual · diverifikasi admin',
    enabled: true,
  },
  { id: 'permata-va', name: 'Permata Virtual Account' },
  { id: 'permata-syariah-va', name: 'Permata Syariah Virtual Account' },
  { id: 'danamon-va', name: 'Danamon Virtual Account' },
  { id: 'bsi-va', name: 'Bank Syariah Indonesia Virtual Account' },
  { id: 'cimb-va', name: 'CIMB Niaga Virtual Account' },
  { id: 'ovo', name: 'OVO' },
  { id: 'alfamart', name: 'Alfamart' },
  { id: 'card', name: 'Kartu kredit / debit' },
];

export function mountCheckoutExperience({ form, locations, getItems, getSubtotal, getCatalog }) {
  let selectedAddress = null,
    editing = null,
    shipping = deliveryMethods[0],
    payment = paymentMethods[0];
  let liveShipping = false,
    quote = null;
  const shippingSignature = () =>
    JSON.stringify([
      selectedAddress?.id,
      selectedAddress?.zip,
      selectedAddress?.provinceId,
      selectedAddress?.cityId,
      selectedAddress?.districtId,
      getItems().map(({ id, qty }) => ({ id, qty })),
    ]);
  shippingConfiguration().then((config) => {
    liveShipping = config.enabled;
    if (liveShipping && rateNote)
      rateNote.textContent = 'Ongkir dihitung berdasarkan kode pos dan perkiraan berat barang.';
    render().catch(() => {});
  });
  const addressDialog = document.createElement('dialog');
  addressDialog.className = 'checkout-dialog';
  addressDialog.id = 'address-dialog';
  addressDialog.setAttribute('aria-labelledby', 'address-dialog-title');
  addressDialog.innerHTML =
    '<button type="button" class="customer-close" aria-label="Tutup alamat">&times;</button><p class="checkout-eyebrow">TANJ / DELIVERY</p><h2 id="address-dialog-title">Alamat pengiriman</h2><div id="address-list"></div><form id="address-editor"><div id="address-fields"></div><p id="address-error" role="alert"></p><div class="checkout-dialog-actions"><button type="submit" class="shop-primary">Simpan alamat</button><button type="button" class="customer-text" id="address-editor-back">Kembali ke daftar alamat</button></div></form><button type="button" class="shop-primary" id="address-create">+ Buat Baru</button>';
  document.body.append(addressDialog);
  const fields = $('address-fields');
  for (const id of ['checkout-name', 'checkout-phone', 'checkout-email']) {
    const el = $(id);
    fields.append(form.querySelector(`label[for="${id}"]`), el);
  }
  $('checkout-email').readOnly = true;
  $('checkout-email').setAttribute('aria-describedby', 'checkout-account-email-note');
  fields.querySelector('label[for="checkout-email"]').textContent = 'Email akun yang login';
  const emailNote = document.createElement('p');
  emailNote.id = 'checkout-account-email-note';
  emailNote.textContent = 'Notifikasi pesanan dikirim ke email akun ini.';
  $('checkout-email').after(emailNote);
  fields.append(locations);
  const street = $('checkout-address');
  fields.append(form.querySelector('label[for="checkout-address"]'), street);
  const surface = document.createElement('div');
  surface.className = 'checkout-selections';
  surface.innerHTML =
    '<section class="checkout-section"><div class="checkout-section-heading"><h3>Detail alamat</h3><button type="button" class="customer-text" id="address-change">Ubah</button></div><button type="button" class="checkout-choice" id="address-summary">+ Tambahkan alamat pengiriman <span>→</span></button></section><section class="checkout-section"><h3>Metode pengiriman</h3><button type="button" class="checkout-choice" id="shipping-choice"></button></section><section class="checkout-section"><h3>Metode pembayaran</h3><button type="button" class="checkout-choice" id="payment-choice"></button></section>';
  form.prepend(surface);
  const summary = document.createElement('section');
  summary.className = 'checkout-order-summary';
  summary.innerHTML =
    '<p class="checkout-eyebrow">YOUR SELECTION</p><div id="checkout-selected-items"></div><div id="checkout-price-summary"></div>';
  surface.after(summary);
  const note = $('checkout-note');
  summary.append(form.querySelector('label[for="checkout-note"]'), note);
  for (const el of [...form.children]) if (el !== surface && el !== summary) summary.append(el);
  const submit = form.querySelector('[type=submit]');
  submit.textContent = 'Order';
  submit.id = 'checkout-order';
  const rateNote = $('manual-checkout-error')?.previousElementSibling;
  if (rateNote)
    rateNote.textContent =
      'Tarif wilayah untuk paket 1 kg. Admin mengonfirmasi layanan pengiriman.';
  const oldTotal = form.querySelector('.checkout-total');
  if (oldTotal) oldTotal.hidden = true;
  form.querySelector('.manual-breakdown')?.setAttribute('hidden', '');
  form.classList.add('checkout-grid');
  form.noValidate = true;
  $('checkout-back').textContent = '← Kembali ke tas';
  $('bag-checkout-view').querySelector('h3').textContent = 'Selesaikan pesananmu.';
  $('address-summary').onclick = $('address-change').onclick = () =>
    requireCustomer(() => openAddresses());
  addressDialog.querySelector('.customer-close').onclick = () => addressDialog.close();
  addressDialog.addEventListener('click', (e) => {
    if (e.target === addressDialog) addressDialog.close();
  });
  $('address-create').onclick = () => editAddress();
  $('address-editor-back').onclick = () => openAddresses();
  function showError(error) {
    $('address-error').textContent = error.message;
  }
  async function openAddresses() {
    if (!addressDialog.open) addressDialog.showModal();
    try {
      await loadAddresses();
    } catch (error) {
      showError(error);
      return;
    }
    $('address-error').textContent = '';
    $('address-editor').hidden = true;
    $('address-create').hidden = false;
    $('address-list').hidden = false;
    $('address-list').innerHTML =
      addresses()
        .map(
          (a) =>
            `<article class="saved-address ${selectedAddress?.id === a.id ? 'selected' : ''}"><button class="address-select" type="button" data-address="${esc(a.id)}"><strong>${esc(a.name)}</strong><span>${esc(a.phone)} · ${esc(a.email)}</span><span>${esc(a.address)}, ${esc(a.district)}, ${esc(a.city)}, ${esc(a.province)} ${esc(a.zip)}</span></button><div><button type="button" class="customer-text" data-edit="${esc(a.id)}">Ubah</button><button type="button" class="customer-text" data-delete="${esc(a.id)}">Hapus</button></div></article>`,
        )
        .join('') || '<p>Belum ada alamat tersimpan. Tambahkan alamat pertamamu.</p>';
    $('address-list')
      .querySelectorAll('[data-address]')
      .forEach(
        (b) =>
          (b.onclick = async () => {
            try {
              await applyAddress(addresses().find((a) => a.id === b.dataset.address));
              addressDialog.close();
            } catch (e) {
              editAddress(addresses().find((a) => a.id === b.dataset.address));
              showError(e);
            }
          }),
      );
    $('address-list')
      .querySelectorAll('[data-edit]')
      .forEach(
        (b) => (b.onclick = () => editAddress(addresses().find((a) => a.id === b.dataset.edit))),
      );
    $('address-list')
      .querySelectorAll('[data-delete]')
      .forEach(
        (b) =>
          (b.onclick = async () => {
            try {
              await deleteAddress(b.dataset.delete);
              if (selectedAddress?.id === b.dataset.delete) {
                selectedAddress = null;
                render();
              }
              openAddresses();
            } catch (e) {
              showError(e);
            }
          }),
      );
    if (!addressDialog.open) addressDialog.showModal();
  }
  async function applyAddress(a) {
    if (!a) throw Error('Pilih alamat yang tersedia.');
    a = { ...a, email: customerSession()?.email || '' };
    for (const [key, id] of Object.entries({
      name: 'checkout-name',
      phone: 'checkout-phone',
      email: 'checkout-email',
      address: 'checkout-address',
    }))
      $(id).value = a[key] || '';
    $('checkout-province').value = a.provinceId;
    $('checkout-province').onchange();
    $('checkout-city').value = a.cityId;
    await $('checkout-city').onchange();
    $('checkout-district').value = a.districtId;
    $('checkout-district').onchange();
    $('checkout-zip').value = a.zip;
    $('checkout-zip').onchange();
    await validateShippingDestination(a.provinceId, a.cityId, a.districtId, a.zip);
    selectedAddress = a;
    render();
  }
  async function editAddress(a = null) {
    editing = a?.id || null;
    $('address-error').textContent = '';
    $('address-list').hidden = true;
    $('address-create').hidden = true;
    $('address-editor').hidden = false;
    if (a) {
      try {
        await applyAddress(a);
      } catch (e) {
        showError(e);
      }
    } else {
      for (const id of ['checkout-name', 'checkout-phone', 'checkout-email', 'checkout-address'])
        $(id).value = '';
      $('checkout-name').value = customerSession()?.name || '';
      $('checkout-email').value = customerSession()?.email || '';
      $('checkout-province').value = '';
      $('checkout-province').onchange();
    }
    if (!addressDialog.open) addressDialog.showModal();
    $('checkout-name').focus();
  }
  $('address-editor').onsubmit = async (e) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    const button = e.submitter;
    button.disabled = true;
    try {
      const delivery = await validateShippingDestination(
        $('checkout-province').value,
        $('checkout-city').value,
        $('checkout-district').value,
        $('checkout-zip').value,
      );
      const a = await saveAddress({
        id: editing,
        name: $('checkout-name').value.trim(),
        phone: $('checkout-phone').value.trim(),
        email: customerSession()?.email || '',
        address: $('checkout-address').value.trim(),
        provinceId: $('checkout-province').value,
        cityId: $('checkout-city').value,
        districtId: delivery.districtId,
        district: delivery.district,
        city: delivery.shipping.city,
        province: delivery.shipping.province,
        zip: delivery.zip,
      });
      selectedAddress = a;
      render();
      addressDialog.close();
    } catch (e) {
      showError(e);
    } finally {
      button.disabled = false;
    }
  };
  async function choose(kind) {
    if (kind === 'shipping') {
      const config = await shippingConfiguration();
      liveShipping = config.enabled;
      if (liveShipping) {
        if (!selectedAddress) {
          openAddresses();
          return;
        }
        $('shipping-choice').disabled = true;
        $('manual-checkout-error').textContent = 'Memuat ongkir...';
        try {
          const signature = shippingSignature();
          const result = await shippingRates(selectedAddress, getItems());
          if (signature !== shippingSignature())
            throw Error('Tas atau alamat berubah. Cek ongkir kembali.');
          if (!result.options.length) throw Error('Belum ada kurir tersedia untuk alamat ini.');
          quote = { ...result, signature };
          $('manual-checkout-error').textContent = result.quoteId
            ? ''
            : 'Tarif tersedia. Pemesanan pengiriman belum siap. Hubungi admin TANJ.';
        } catch (error) {
          quote = null;
          $('manual-checkout-error').textContent = error.message;
          render().catch(() => {});
          return;
        } finally {
          $('shipping-choice').disabled = false;
        }
      }
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'checkout-dialog';
    dialog.setAttribute(
      'aria-label',
      kind === 'shipping' ? 'Metode pengiriman' : 'Metode pembayaran',
    );
    const shippingMode = kind === 'shipping',
      options = shippingMode ? (liveShipping ? quote.options : deliveryMethods) : paymentMethods,
      selected = shippingMode ? shipping : payment;
    dialog.innerHTML = `<button type="button" class="customer-close" aria-label="Tutup pilihan">&times;</button><p class="checkout-eyebrow">TANJ / CHECKOUT</p><h2>${shippingMode ? 'Metode pengiriman' : 'Metode pembayaran'}</h2><p>${shippingMode ? (liveShipping ? 'Pilih layanan pengiriman. Tarif berdasarkan kode pos dan perkiraan berat paket.' : 'Tarif uji mengikuti master kota untuk 1 kg. Layanan dan jadwal kurir akan dikonfirmasi admin.') : 'QRIS manual tersedia. Metode gateway berikut disiapkan dan belum menerima transaksi.'}</p><form>${options.map((o) => `<label class="checkout-method ${!shippingMode && !o.enabled ? 'unavailable' : ''}"><input type="radio" name="method" value="${esc(o.id)}" ${selected.id === o.id ? 'checked' : ''} ${!shippingMode && !o.enabled ? 'disabled' : ''}><span><strong>${esc(o.name)}</strong><small>${shippingMode ? esc(o.service) + ' - ' + (liveShipping ? esc(o.duration) : 'tarif wilayah') : esc(o.detail || 'Belum aktif — menunggu integrasi gateway')}</small></span>${shippingMode ? `<strong>${selectedAddress ? money(liveShipping ? o.fee : getShippingEstimate(selectedAddress.provinceId, selectedAddress.cityId).fee) : 'Pilih alamat'}</strong>` : ''}</label>`).join('')}<button type="submit" class="shop-primary">Konfirmasi</button></form>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('.customer-close').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const choice = options.find((o) => o.id === new FormData(e.currentTarget).get('method'));
      if (!choice || (!shippingMode && !choice.enabled)) return;
      if (shippingMode) shipping = choice;
      else payment = choice;
      render();
      dialog.close();
    };
  }
  $('shipping-choice').onclick = () => choose('shipping');
  $('payment-choice').onclick = () => choose('payment');
  async function render() {
    if (
      quote &&
      (quote.signature !== shippingSignature() || Date.parse(quote.expiresAt) <= Date.now())
    )
      quote = null;
    const liveChoice = liveShipping && quote?.options.find((o) => o.id === shipping.id);

    if (selectedAddress)
      $('address-summary').innerHTML =
        `<span><strong>${esc(selectedAddress.name)}</strong><small>${esc(selectedAddress.phone)} · ${esc(selectedAddress.email)}</small><small>${esc(selectedAddress.address)}, ${esc(selectedAddress.district)}, ${esc(selectedAddress.city)} ${esc(selectedAddress.zip)}</small></span><span>→</span>`;
    else $('address-summary').innerHTML = '+ Tambahkan alamat pengiriman <span>→</span>';
    $('shipping-choice').innerHTML =
      `<span class="method-mark">${esc(liveShipping && !liveChoice ? 'Pilih kurir' : shipping.name)}</span><span><strong>${esc(liveShipping && !liveChoice ? 'Cek ongkir' : shipping.service)}</strong><small>${liveShipping ? (liveChoice ? esc(shipping.duration) + ' - ' + money(shipping.fee) : 'Sesuai alamat dan berat barang') : 'Tarif wilayah - 1 kg'}</small></span><span>&rarr;</span>`;
    $('payment-choice').innerHTML =
      `<span class="method-mark">QRIS</span><span><strong>${esc(payment.name)}</strong><small>${esc(payment.detail)}</small></span><span>→</span>`;
    let fee = 0;
    if (selectedAddress)
      fee = liveShipping
        ? liveChoice?.fee || 0
        : getShippingEstimate(selectedAddress.provinceId, selectedAddress.cityId).fee;
    $('checkout-price-summary').innerHTML =
      `<p><span>Subtotal · ${getItems().reduce((n, i) => n + i.qty, 0)} barang</span><strong>${money(getSubtotal())}</strong></p><p><span>Ongkir · ${esc(shipping.name)}</span><strong>${selectedAddress ? (liveShipping && !liveChoice ? 'Pilih kurir' : money(fee)) : 'Pilih alamat'}</strong></p><p class="checkout-grand-total"><span>Total sebelum kode unik</span><strong>${liveShipping && !liveChoice ? 'Pilih kurir untuk total' : money(getSubtotal() + fee)}</strong></p><small>Kode unik dihitung saat Order dan tercantum pada tagihan.</small>`;
    const catalog = await getCatalog();
    $('checkout-selected-items').innerHTML = getItems()
      .map((line) => {
        const item = catalog.find((i) => i.id === line.id);
        return item
          ? `<article class="checkout-summary-item"><div><strong>${esc(item.name)}</strong><small>${esc(item.colorName || '')} · All Size · ${line.qty} barang</small></div><strong>${money(line.qty * item.price)}</strong></article>`
          : '';
      })
      .join('');
  }
  $('bag-next').addEventListener('click', async () => {
    $('bag-modal').classList.add('checkout-surface');
    try {
      const list = await loadAddresses();
      if (!selectedAddress && list.length) await applyAddress(list[0]);
      else await render();
    } catch (err) {
      $('manual-checkout-error').textContent = err.message;
    }
  });
  for (const id of ['bag-open', 'checkout-back'])
    $(id).addEventListener('click', () => $('bag-modal').classList.remove('checkout-surface'));
  window.addEventListener('tanj-customer-change', () => {
    selectedAddress = null;
    render().catch(() => {});
  });
  return {
    async validate() {
      if (!customerSession()) {
        requireCustomer(() => {});
        throw Error('Login untuk melanjutkan pesanan.');
      }
      if (!selectedAddress) {
        openAddresses();
        throw Error('Pilih atau buat alamat pengiriman terlebih dahulu.');
      }
      await applyAddress(selectedAddress);
      await validateShippingDestination(
        selectedAddress.provinceId,
        selectedAddress.cityId,
        selectedAddress.districtId,
        selectedAddress.zip,
      );
      liveShipping = (await shippingConfiguration()).enabled;
      if (
        liveShipping &&
        (!quote ||
          quote.signature !== shippingSignature() ||
          Date.parse(quote.expiresAt) <= Date.now() ||
          !quote.options.some((o) => o.id === shipping.id))
      )
        throw Error('Pilih kurir dan cek ongkir terlebih dahulu.');
      if (liveShipping && !quote.quoteId)
        throw Error('Pemesanan pengiriman belum siap. Hubungi admin TANJ.');
      return {
        ...(liveShipping ? { shippingQuoteId: quote.quoteId } : {}),
        shippingMethod: shipping.id,
        shippingName: shipping.name + ' ' + shipping.service,
        paymentMethod: payment.id,
        customerId: customerSession().id,
      };
    },
    reset() {
      selectedAddress = null;
    },
    render,
  };
}
