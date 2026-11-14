# Menyamakan web TANJ yang aktif

Web aktif: https://firhamm52-prog.github.io/tanj/

Perubahan tampilan dari preview disalin ke versi Supabase. Backend Hostinger dan data ekspor customer tidak ikut dipublikasikan.

## Dua langkah untuk checkout tanpa login

1. Di Supabase, buka **SQL Editor**, tempel seluruh isi `supabase/migrations/202611150029_guest_checkout.sql`, lalu **Run**. Jalankan setelah migrasi 028; cukup sekali.
2. Buka **Authentication → Sign In / Providers → Anonymous**, aktifkan **Allow anonymous sign-ins**, lalu simpan.

Anonymous di sini adalah sesi tamu yang dibuat otomatis oleh website. Customer tidak perlu daftar, login, atau membuat password. Email dan nomor HP tetap wajib di checkout. Jangan mematikan verifikasi email untuk pendaftaran akun biasa.

Sebelum dua langkah selesai, akun lama masih bisa checkout. Checkout tamu menampilkan pesan belum aktif; website tidak membuat pesanan setengah jadi.

## Yang disamakan

- Background Broken White, produk mobile dua kolom, desktop tetap.
- Bagian foto/video berjalan atas dihapus; galeri hijab model/mockup dan bagian bawah dipertahankan.
- Footer TANJ Times New Roman biasa, Instagram/TikTok, tanpa teks CS dan philosophy; tombol WhatsApp tetap.
- Judul tab/menu, favicon T, Beautiful Frames kecil, tombol Preview.
- Ajakan login bisa ditutup dan menjelaskan update produk/promo.
- Teks checkout dibersihkan; email dan nomor HP wajib untuk tamu.
- Nomor pesanan baru singkat seperti TANJ-000001; ID internal pembayaran tetap agar Midtrans tidak terganggu.
- Email order sesudah pesanan tersimpan; alur email resi tidak diubah.
- Hero lama memakai salinan MP4 yang kompatibel. Media baru tetap bisa diganti melalui CMS.

Tes memakai database dan penyedia tiruan. Tidak ada pembayaran atau email sungguhan yang dibuat untuk pengujian.

Pemantauan deploy: https://github.com/firhamm52-prog/tanj/actions
