# Dua template email TANJ

| Email                               | Template ID      | HTML                             | Subject                                 |
| ----------------------------------- | ---------------- | -------------------------------- | --------------------------------------- |
| Order berhasil disimpan             | template_9x2zs4s | emailjs-order-only-template.html | TANJ ? Menunggu pembayaran {{order_id}} |
| Admin berhasil menyimpan nomor resi | template_nc0i08l | emailjs-tracking-template.html   | TANJ ? Pembayaran Berhasil {{order_id}} |

Tempel seluruh HTML masing-masing file ke template EmailJS yang sesuai, kemudian Save.
Email resi menggunakan To Email: {{customer_email}}, From Name: TANJ Indonesia,
From Email default layanan Gmail TANJ, Reply-To: tanj.indonesia@gmail.com.

Konfirmasi customer dan persetujuan pembayaran admin tidak mengirim email tambahan.
Tombol email resi membuka pesanan customer di website utama, tempat customer dapat
menyalin resi dan membuka situs resmi kurir. Customer login jika sesinya sudah habis.

Kode memilih templateId untuk Order dan trackingTemplateId untuk resi. Pengiriman
ulang email yang telah diterima layanan dicegah per pesanan dan jenis email di browser
sama. Ini belum merupakan deduplikasi lintas perangkat.
