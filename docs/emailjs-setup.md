# Aktivasi email Order TANJ — tanpa payment gateway

Kode dapat mengirim lewat EmailJS dari GitHub Pages; gateway pembayaran tidak diperlukan. Akun EmailJS dan hubungan ke email pengirim belum tersedia, sehingga konfigurasi sengaja dinonaktifkan. Kode yang siap dipasang bukan berarti email sudah aktif.

## Langkah pemilik akun

1. Buat akun di https://dashboard.emailjs.com/sign-up. Pilih layanan **Gmail** di **Email Services → Add New Service**, lalu hubungkan akun Google pengirim dan selesaikan otorisasinya. Jangan berikan password Gmail kepada pengembang. Catat **Service ID**.
2. Di **Email Templates**, buat satu template. Isi **To Email** dengan alamat tetap `tanj.indonesia@gmail.com`, **Cc** dengan `{{customer_email}}`, **From Name** dengan `TANJ Indonesia`, **From Email** memakai default email service, **Reply-To** dengan `{{customer_email}}`. Subject: `TANJ — Menunggu pembayaran {{order_id}}`.
3. Buka editor HTML template dan salin isi `docs/emailjs-order-template.html`. Gunakan placeholder dua kurung kurawal seperti yang disediakan; jangan mengubahnya menjadi injeksi HTML tiga kurung kurawal. Catat **Template ID**.
4. Ambil **Public Key** di pengaturan Account. Service ID, Template ID, dan Public Key adalah konfigurasi publik; tidak perlu private key/access token.
5. Pada pengaturan domain EmailJS, izinkan origin `https://firhamm52-prog.github.io` (tanpa `/tanj/`). Jika memakai domain TANJ lain, tambahkan origin HTTPS domain tersebut. Jangan membiarkan semua situs bebas menggunakan template.
6. Isi `web/email-config.js` dengan ketiga nilai tersebut dan ubah `enabled` menjadi `true`. Push/deploy konfigurasi publik ini. Jangan memasukkan password, private key, atau Gmail app password ke repository/frontend.
7. Uji satu Order dengan email customer yang Anda miliki. Periksa Email History EmailJS, Inbox/Spam admin, dan Inbox/Spam customer. Template To/Cc harus benar; kode tidak dapat memeriksa pengaturan penerima yang tersimpan di dashboard EmailJS.

## Perilaku website

- Setelah Order tersimpan, website otomatis mencoba mengirim detail pesanan. Jika gagal, pesanan dan status pembayaran tidak dibatalkan atau diubah.
- Satu permintaan provider mengirim ke alamat tetap admin dan salinan customer lewat Cc. Tidak ada secret pengirim di browser.
- Tombol kirim manual menggunakan fungsi yang sama untuk mencoba ulang. Pengiriman yang telah diterima provider dicatat di browser dan tidak dikirim ulang lewat konfirmasi pembayaran atau klik ganda.
- Permintaan berurutan diberi jeda mengikuti batas API. Catatan browser dan Web Locks membantu mengurangi duplikasi; ini bukan jaminan idempotensi server atau pencegah penyalahgunaan.
- Timeout/koneksi putus dapat terjadi setelah provider menerima permintaan. UI meminta memeriksa Inbox/Spam sebelum mencoba ulang; pengiriman ulang berisiko menghasilkan salinan tambahan.
- Respons sukses berarti provider menerima email, bukan jaminan masuk Inbox. Penolakan, kuota, template salah, koneksi, dan penyaringan Spam tetap dapat memengaruhi hasil.
- Data pesanan dan nilai pada email berasal dari prototipe browser. Email bukan bukti dana masuk dan bukan otorisasi pembayaran. Penyimpanan pesanan serta akses lintas perangkat tetap memerlukan backend bersama.
- Tautan **Cek cara membayar** membuka order di origin website yang sama dan memerlukan akun/pesanan pada browser tersebut. Tautan lintas perangkat belum tersedia tanpa backend bersama.

Dokumentasi resmi: https://www.emailjs.com/docs/rest-api/send/ ; https://www.emailjs.com/docs/tutorial/creating-email-template/ ; https://www.emailjs.com/docs/faq/can-i-add-my-domain-to-allowlist/ ; https://www.emailjs.com/docs/user-guide/dynamic-variables-templates/
