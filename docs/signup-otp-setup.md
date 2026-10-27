# Verifikasi pendaftaran dengan OTP TANJ

Alur: daftar dengan nama/email/password → kode verifikasi dikirim → masukkan kode → akun terverifikasi dan masuk ke beranda. Login pada akun yang belum terverifikasi juga membuka layar kode dan tombol kirim ulang. Password dan OTP tidak disimpan oleh formulir di localStorage.

## Pengaturan Supabase (wajib agar aktif online)

1. **Authentication → Sign In / Providers → Email**: aktifkan **Confirm email**. Jangan gunakan auto-confirm untuk customer.
2. **Authentication → Email → Templates → Confirm signup**:
   - Subject: `TANJ — Kode verifikasi akun kamu`
   - Body: salin seluruh [signup-otp.html](../supabase/templates/signup-otp.html), lalu simpan.
   - Pertahankan `{{ .Token }}` persis seperti di file; itulah kode resmi Supabase. Bukan template EmailJS pemesanan/pengiriman.
3. **Authentication → Email → SMTP Settings**: gunakan SMTP milik TANJ dengan **Sender name = TANJ** dan alamat pengirim yang sudah diverifikasi oleh penyedia email. Template HTML tidak dapat mengubah alamat pengirim atau menggantikan pengaturan SMTP. Jangan memasukkan password SMTP ke kode website/repository.
4. Atur masa berlaku kode di pengaturan Email OTP Supabase sesuai kebutuhan, misalnya 10 menit. Set **Email OTP length = 6** di Authentication → Sign In / Providers → Email. Form hanya menerima tepat 6 digit, dengan batas kirim ulang 60 detik di UI. Batas resmi pengiriman dan percobaan verifikasi tetap ditegakkan Supabase.

Push GitHub tidak mengubah template ataupun SMTP di Supabase. Setelah pengaturan dashboard disimpan, uji dengan email customer baru, masukkan kode yang salah dahulu, lalu kode terbaru yang benar. Akun belum terkonfirmasi tidak boleh bisa login/membuat pesanan sebelum verifikasi.

Alternatif admin lokal: `node scripts/configure-auth-email.mjs` menampilkan kesiapan tanpa mengubah konfigurasi. `node scripts/configure-auth-email.mjs --apply` memerlukan `SUPABASE_ACCESS_TOKEN` Management API melalui environment; ini menerapkan template, menyalakan Confirm email, dan mengubah nama pengirim TANJ tanpa mengubah kredensial SMTP. Jangan bagikan token di chat.

Referensi resmi: https://supabase.com/docs/guides/auth/auth-email-templates dan https://supabase.com/docs/reference/javascript/auth-verifyotp
