# Status integrasi email pembayaran

Checkout menyimpan email customer. Kontak email membuka aplikasi email dengan tujuan admin dan CC customer; pengunjung tetap menekan Kirim di aplikasi tersebut.

Pengiriman otomatis **belum aktif** karena akun EmailJS TANJ belum dibuat/dihubungkan. EmailJS kini dapat mengirim dari GitHub Pages tanpa payment gateway atau backend sendiri. Ikuti [panduan EmailJS](emailjs-setup.md) dan gunakan [template siap-pasang](emailjs-order-template.html). `web/email-config.js` berisi konfigurasi publik yang masih kosong dan dinonaktifkan. Tidak ada password Gmail/private key di frontend.

Backend yang akan digunakan harus menyediakan endpoint pada domain yang sama, dikonfigurasi melalui `window.TANJ_CONFIG.paymentNotificationEndpoint`. Kontrak: POST JSON `{orderId}`; server mengambil pesanan dari database bersama, memvalidasi pemilik pesanan, mengirim ke `tanj.indonesia@gmail.com` dan email customer yang tersimpan, membatasi pengiriman, dan mencegah duplikasi. Respons `{sent:true}` hanya setelah kedua pengiriman diterima penyedia email. Frontend tidak mengirim nominal atau alamat penerima sebagai sumber kebenaran.

Endpoint backend di atas merupakan pilihan lanjutan, bukan prasyarat EmailJS. Jangan mengaktifkan endpoint tersebut sebelum penyimpanan pesanan bersama, validasi akses, dan layanan pengiriman email tersedia. Ledger pembayaran dan QRIS saat ini tetap disimpan pada browser dan origin yang sama; upload admin tidak mempublikasikan gambar ke semua perangkat. Email yang dikirim dari browser tidak membuktikan dana masuk.
