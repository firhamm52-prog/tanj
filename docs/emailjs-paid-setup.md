# Dua email TANJ: Order dan nomor resi

1. Buka dashboard EmailJS, Email Templates, edit template_9x2zs4s.
2. Ganti seluruh HTML dengan emailjs-order-template.html di folder ini.
3. Subject: TANJ ? {{#has_tracking}}Nomor resi pesanan{{/has_tracking}}{{^has_tracking}}Menunggu pembayaran{{/has_tracking}} {{order_id}}
4. Pertahankan penerima To/Cc yang sudah berjalan, lalu Save.
5. Setelah tersimpan, beri tahu pengembang untuk mengaktifkan trackingEmailEnabled di web/email-config.js dan deploy.

Email pertama dikirim setelah Order tersimpan: detail pesanan dan Cek Cara Membayar.
Email kedua dikirim setelah admin menyimpan nomor resi pada pesanan PAID: detail pesanan, kurir, nomor resi, dan tautan Lihat Resi & Lacak Pengiriman.
Tautan membuka pesanan customer di website utama, termasuk bila email dikirim dari halaman admin. Customer login jika sesinya habis, lalu dapat menyalin resi dan membuka situs resmi kurir.
Konfirmasi customer dan persetujuan pembayaran admin tidak mengirim email.
Pengiriman ulang setelah layanan menerima email dicegah per pesanan dan jenis email di browser yang sama; ini belum merupakan deduplikasi lintas perangkat.

Email kedua belum aktif sampai template dashboard diperbarui. Jangan memakai template dashboard lama untuk email resi.
