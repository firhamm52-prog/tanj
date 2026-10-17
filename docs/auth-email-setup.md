# Email verifikasi TANJ INDONESIA

Template siap pakai: `supabase/templates/confirmation.html`.

Di proyek Supabase, buka **Authentication → Email → Templates → Confirm signup** (pada beberapa tampilan: **Authentication → Email Templates**).

- Subject: `Verifikasi email kamu — TANJ INDONESIA`
- Body HTML: seluruh isi file template di atas.
- Button: **Verification your email**, dengan warna, padding dan radius yang sama seperti tombol **Cek cara membayar** pada email Order.
- Pertahankan `{{ .ConfirmationURL }}` sebagai tautan tombol. Tautan tersebut melakukan verifikasi resmi; jangan menggantinya dengan URL homepage biasa.

Nama pengirim bukan bagian HTML. Untuk mengganti **Supabase Auth** menjadi **TANJ INDONESIA**, aktifkan **Custom SMTP** pada halaman Email di Authentication:

- Sender name: `TANJ INDONESIA`
- Sender email: alamat pengirim yang diizinkan penyedia SMTP.
- Host, port, username dan password: dari penyedia SMTP. Simpan password di dashboard/secret, bukan repository atau chat.

GitHub Pages hanya memublikasikan template sebagai file sumber; push ke GitHub tidak menerapkan pengaturan email di Supabase. Secret key database juga tidak memberi izin mengubah konfigurasi Auth. Pengaturan ini harus disimpan oleh pemilik proyek di dashboard atau melalui Management API dengan access token akun.

Alternatif otomatis: simpan `SUPABASE_ACCESS_TOKEN` akun Supabase di `.env`. Pratinjau dengan `node scripts/configure-auth-email.mjs`, lalu terapkan template dengan `node scripts/configure-auth-email.mjs --apply`. Script tidak mencetak token atau konfigurasi rahasia. Untuk memasang SMTP sekaligus, isi `TANJ_SMTP_HOST`, `TANJ_SMTP_PORT`, `TANJ_SMTP_USER`, `TANJ_SMTP_PASSWORD`, dan `TANJ_SMTP_SENDER_EMAIL` sebelum menjalankan script. Tanpa SMTP, script hanya menerapkan isi/subject email dan tidak mengklaim nama pengirim sudah berubah.

## Perilaku tautan pembayaran

Email Order menyimpan ID pesanan di query `?order=...` dan hash lama untuk kompatibilitas. Routing menunggu pemulihan sesi, menyinkronkan sesi ketika tab dibuka kembali, dan melanjutkan ke pesanan setelah login. Sesi customer tidak lagi diputus oleh timer idle frontend 30 menit; masa berlaku/refresh sesi tetap mengikuti Supabase. Logout eksplisit dan pemeriksaan pemilik pesanan tetap berlaku.

Browser atau profil yang berbeda (misalnya Gmail in-app browser dan Chrome) tidak berbagi penyimpanan sesi. Browser baru tetap memerlukan login sekali, kemudian membuka pesanan yang diminta. Jangan mengirim token login melalui URL email Order untuk melewati pemeriksaan ini.
