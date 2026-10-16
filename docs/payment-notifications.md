# Status integrasi email pembayaran

Checkout menyimpan email customer. Kontak email membuka aplikasi email dengan tujuan admin dan CC customer; pengunjung tetap menekan Kirim di aplikasi tersebut.

Konfigurasi publik EmailJS dari pemilik TANJ sudah dipasang dan diaktifkan pada `web/email-config.js` untuk Service `service_awd6ej5` dan Template `template_9x2zs4s`. Website mencoba mengirim otomatis setelah Order tersimpan, tanpa menunggu payment gateway/backend sendiri. Pengiriman nyata tetap bergantung pada koneksi Gmail, template To/Cc, izin origin, dan kuota di dashboard EmailJS. Tes otomatis memakai provider tiruan dan tidak membuktikan email nyata masuk Inbox.

Pastikan template To Email adalah `tanj.indonesia@gmail.com`, Cc `{{customer_email}}`, serta origin `https://firhamm52-prog.github.io` diizinkan. Ikuti [panduan EmailJS](emailjs-setup.md) dan gunakan [template siap-pasang](emailjs-order-template.html). Tidak ada password Gmail/private key di frontend.

Backend yang akan digunakan harus menyediakan endpoint pada domain yang sama, dikonfigurasi melalui `window.TANJ_CONFIG.paymentNotificationEndpoint`. Kontrak: POST JSON `{orderId}`; server mengambil pesanan dari database bersama, memvalidasi pemilik pesanan, mengirim ke `tanj.indonesia@gmail.com` dan email customer yang tersimpan, membatasi pengiriman, dan mencegah duplikasi. Respons `{sent:true}` hanya setelah kedua pengiriman diterima penyedia email. Frontend tidak mengirim nominal atau alamat penerima sebagai sumber kebenaran.

Endpoint backend di atas merupakan pilihan lanjutan, bukan prasyarat EmailJS. Jangan mengaktifkan endpoint tersebut sebelum penyimpanan pesanan bersama, validasi akses, dan layanan pengiriman email tersedia. Ledger pembayaran dan QRIS saat ini tetap disimpan pada browser dan origin yang sama; upload admin tidak mempublikasikan gambar ke semua perangkat. Email yang dikirim dari browser tidak membuktikan dana masuk.
