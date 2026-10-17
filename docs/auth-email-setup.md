# Email konfirmasi akun TANJ

Gunakan tampilan HTML sederhana bawaan tanpa desain khusus atau perubahan nama pengirim.

Di Supabase buka **Authentication ? Email ? Templates ? Confirm signup**:

- Subject: `Konfirmasi email akun TANJ`
- Body HTML: salin seluruh isi `supabase/templates/confirmation.html`.
- Simpan perubahan. Pertahankan `{{ .ConfirmationURL }}` agar tautan verifikasi resmi tetap berfungsi.

Pengirim tetap bawaan Supabase. Pengaturan SMTP ditunda sesuai pilihan pemilik TANJ.

Untuk proyek Free yang dibuat mulai 3 Juni 2026 dan masih memakai SMTP bawaan, Supabase membatasi perubahan template. Jika kolom terkunci atau penyimpanan ditolak, teks ini belum bisa diaktifkan hingga memakai SMTP sendiri atau paket yang mendukung. Mengubah judul atau satu kalimat juga termasuk perubahan template.

Push GitHub tidak mengubah konfigurasi Auth Supabase. Saat ini akses Management API akun belum tersedia di laptop. Pemilik proyek dapat menyimpan melalui dashboard; alternatif otomatis memerlukan `SUPABASE_ACCESS_TOKEN` di `.env`, lalu jalankan `node scripts/configure-auth-email.mjs --apply`. Pratinjau tanpa perubahan: `node scripts/configure-auth-email.mjs`. Script hanya mengubah subject dan isi konfirmasi; tidak mengubah SMTP, pengirim, atau kewajiban verifikasi email.

Referensi: https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier

## Perilaku tautan pembayaran

Email Order menyimpan ID pesanan di query `?order=...` dan hash lama untuk kompatibilitas. Routing menunggu pemulihan sesi, menyinkronkan sesi ketika tab dibuka kembali, dan melanjutkan ke pesanan setelah login. Sesi customer tidak lagi diputus oleh timer idle frontend 30 menit; masa berlaku/refresh sesi tetap mengikuti Supabase. Logout eksplisit dan pemeriksaan pemilik pesanan tetap berlaku.

Browser atau profil yang berbeda (misalnya Gmail in-app browser dan Chrome) tidak berbagi penyimpanan sesi. Browser baru tetap memerlukan login sekali, kemudian membuka pesanan yang diminta. Jangan mengirim token login melalui URL email Order untuk melewati pemeriksaan ini.
