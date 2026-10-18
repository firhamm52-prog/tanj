# Email setelah pembayaran diterima

Di dashboard EmailJS, buat template khusus menggunakan `emailjs-paid-template.html`.
Subject: `TANJ — Pembayaran diterima {{order_id}}`.
To Email: `{{customer_email}}`. Gunakan layanan pengirim TANJ yang sudah terhubung.
Isi `paidTemplateId` di `web/email-config.js` dengan ID template tersebut, lalu deploy.

Template pembayaran awal tetap digunakan hanya untuk pesanan yang belum dibayar.
Saat admin menyetujui pembayaran, aplikasi menggunakan template terima kasih terpisah.
Jika template terima kasih belum dikonfigurasi, pembayaran tetap tersimpan dan admin
mendapat pesan bahwa email belum dikirim. Aplikasi tidak mengirim template instruksi
pembayaran sebagai pengganti.
