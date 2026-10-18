# Email TANJ hanya saat Order

Email otomatis dikirim satu kali per pesanan setelah customer menekan Order dan pesanan berhasil disimpan.
Konfirmasi pembayaran customer serta persetujuan admin tidak mengirim email lagi.
Template email terima kasih terpisah dan paidTemplateId tidak diperlukan.

Template di dashboard EmailJS tetap menentukan isi email yang diterima. Gunakan template Order yang sudah disimpan. File lokal emailjs-order-template.html tidak otomatis memperbarui dashboard EmailJS.

Catatan pengiriman mencegah pengiriman ulang di browser yang sama setelah layanan menerima email. Ini bukan jaminan deduplikasi lintas perangkat; bila koneksi putus, periksa Inbox/Spam sebelum membuat pesanan baru.
