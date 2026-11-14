# Membuka email pesanan tanpa akun

Penyebab masalah lama: email hanya berisi nomor internal pesanan. Browser baru tidak memiliki sesi tamu asal, sehingga website meminta login.

## Pengaktifan di Supabase

Jalankan `supabase/migrations/202611150031_guest_order_email_access.sql` sekali melalui SQL Editor, setelah 030. Anonymous Sign-Ins tetap aktif. Tidak perlu secret baru atau redeploy Midtrans Edge Function.

Email baru untuk pesanan tamu membawa tautan khusus. Membukanya otomatis membuat sesi tamu jika diperlukan dan memberikan akses hanya ke satu pesanan. Pemilik akun dan pesanan tidak dipindahkan. Nominal, metode pembayaran, stok dan verifikasi Midtrans tetap diperiksa server.

Tautan berlaku 90 hari dan dapat dipakai untuk pembayaran/status/resi. Rahasia akses berada di fragment URL, tidak dikirim sebagai query URL ke hosting. Simpan tautan seperti informasi pribadi; orang yang menerima tautannya dapat membuka pesanan tersebut.

## Email lama

Email yang sudah terkirim tidak dapat diperbarui. SQL menyiapkan tautan baru untuk pesanan tamu lama. Buka Admin ? Pesanan ? Menunggu pembayaran, pilih pesanan, lalu klik **Kirim ulang tautan pembayaran**. Pengujian ini tidak mengirim email sungguhan secara otomatis.

## Teks template EmailJS

Tombol yang memakai `{{order_url}}` / `{{payment_url}}` otomatis menerima tautan baru. Agar kalimat lama yang meminta login juga hilang, salin ulang isi file berikut ke template EmailJS yang sesuai:

- `docs/emailjs-order-only-template.html`: template email order.
- `docs/emailjs-tracking-template.html`: template email resi.

Tidak perlu mengganti template ID, service ID atau public key.

Tes memeriksa tautan dari browser mobile baru, refresh, token salah/kedaluwarsa, pembatasan satu pesanan, proteksi admin dan reservasi stok. Semua respons penyedia/email disimulasikan.
