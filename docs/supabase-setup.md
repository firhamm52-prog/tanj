# Supabase PostgreSQL untuk TANJ

Status: kode integrasi akun, alamat, admin dan pesanan sudah disiapkan.
Project URL dan publishable key publik dikonfigurasi di `web/supabase-config.js`.
Tiga migrasi sudah dijalankan. Verifikasi API live berhasil: katalog dan pengaturan
pembayaran terbaca (200), sedangkan akses pesanan tanpa login ditolak (401).

## Aktivasi sebelum deployment

1. Jalankan migrasi `202610160001_accounts.sql`, `202610160002_orders.sql`, lalu
   `202610160003_catalog.sql` di project `mdvbyrcbuizfycjbcizl` (sekali saja).
2. Pastikan Data API dapat membaca `tb_m_product` dan `tb_m_payment_settings`,
   serta menolak akses anonim ke `tb_t_order`.
3. Setelah deployment, daftar ulang akun owner `tanj.indonesia@gmail.com` melalui
   Account TANJ dan verifikasi email. Jangan kirim password ke chat.
4. Jalankan `supabase/grant-owner-admin.sql` di SQL Editor, kemudian logout/login.
   Hak admin berasal dari tabel yang tidak bisa diubah customer, bukan browser flag.
5. Upload ulang QRIS di dashboard admin agar gambar tersedia lintas perangkat.

## Pemulihan password

Lupa password di login admin/customer meminta email pemulihan Supabase untuk
email yang diisi. Tautan membuka form password baru TANJ; password dan ulangi
password baru hanya diminta pada form pemulihan tersebut. Setelah perubahan,
sesi perangkat ini diakhiri dan pengguna login kembali. Peran admin tetap
berasal dari `tb_m_admin`; mengganti password tidak memberi hak admin.
Pesan kredensial salah tidak lagi menyuruh akun yang sudah online daftar ulang.
Email pemulihan memakai layanan Auth Supabase, bukan template Order EmailJS.

Akun, alamat dan pesanan lama versi localStorage tidak otomatis dimigrasikan.
Jangan upload hash/password atau mempercayai export browser sebagai pembayaran sah.
Owner perlu merekonsiliasi pesanan lama, terutama jika pernah menerima dana nyata.

Catalog PostgreSQL menjadi sumber harga dan stok pesanan. CMS lama masih lokal;
mengedit katalog lokal TIDAK mengubah katalog cloud. Owner sementara mengelola
harga/stok melalui Supabase. Ongkir tetap estimasi master kota 1 kg, bukan API kurir.

`npm run build:supabase` membundel SDK resmi ke `web/vendor/supabase.js`.
`npm run test:supabase` menguji migrasi/RLS/RPC di PostgreSQL lokal PGlite dan SDK
browser dengan backend simulasi (termasuk pesanan lintas perangkat). Tes tidak
mengirim email atau membuat akun nyata. `npm run test:commerce` menguji regresi
checkout/admin/email, terisolasi dari layanan live.

## Buat project

1. Buka https://supabase.com/dashboard dan masuk dengan akun pemilik TANJ.
2. Pilih New project, nama `TANJ`, dan region yang dekat dengan customer.
3. Buat database password sendiri, simpan di password manager; jangan kirim di chat.
4. Setelah provisioning selesai, buka Connect/API Keys untuk mengambil Project URL
   dan publishable key. Hanya dua nilai publik ini yang dibutuhkan untuk frontend.
   Secret key dan service_role tidak boleh masuk ke kode website.
5. SQL Editor: jalankan `supabase/migrations/202610160001_accounts.sql` sekali
   pada project baru. Migration ini memakai transaksi dan tidak menghapus data.

## Konfigurasi Auth sebelum aktivasi

- Site URL: `https://firhamm52-prog.github.io/tanj/`.
- Redirect URL harus menunjuk URL TANJ yang tepat; tambahkan domain baru saat pindah hosting.
- Aktifkan Email/password dan verifikasi email. Notifikasi Order EmailJS tidak
  menggantikan layanan email verifikasi/reset password Supabase Auth.
- Password dikelola Auth. `tb_m_account` menyimpan profil, bukan password/hash buatan frontend.
- `tb_m_address` memakai RLS agar customer hanya membaca/mengubah alamat sendiri.
- Jangan memberi hak admin dari metadata signup yang bisa diubah customer.

## Cakupan implementasi

1. Signup/login/logout dan pemulihan sesi memakai Supabase Auth; signup yang belum
   diverifikasi tidak dianggap login. Akun lama browser perlu daftar ulang.
2. Alamat memakai database bersama; route pembayaran menunggu sesi siap.
3. Katalog/harga/ongkir otoritatif dan RPC transaksi PostgreSQL
   membuat pesanan, menghitung total, reservasi stok, serta kode unik secara atomik.
   Jangan menerima total/status pembayaran dari frontend sebagai sumber kebenaran.
4. Order/payment/log dengan RLS pemilik dan admin yang ditetapkan server,
   termasuk RPC verifikasi pembayaran dan pengaturan QRIS bersama.
5. Uji dua sesi/browser berbeda: akun sama bisa login dan membuka pesanan;
   customer lain tidak bisa membaca pesanan/alamat atau menyetujui pembayaran.
6. Pindahkan akun/pesanan lokal melalui alur migrasi yang memverifikasi kepemilikan.
   Password PBKDF2 demo tidak langsung menjadi password Supabase; jangan upload
   localStorage lalu mempercayainya sebagai identitas atau pembayaran sah.

Aktivasi frontend dan deployment dilakukan sesudah verifikasi tabel pada project
live selesai. Pengujian dua perangkat nyata memerlukan akun baru yang telah
diverifikasi. Payment gateway belum aktif; transfer tetap dicocokkan manual.

Referensi: https://supabase.com/docs/guides/auth/managing-user-data
dan https://supabase.com/docs/guides/database/postgres/row-level-security.
