# CMS online TANJ

Jalankan `supabase/migrations/202610170007_shared_cms.sql` satu kali di SQL Editor setelah migrasi 001–006. Tidak perlu menjalankan ulang SQL sebelumnya. Migrasi mempertahankan akun, pesanan, stok operasional, harga yang sudah ada di database, dan QRIS. Katalog awal mengikuti aset TANJ dalam repository; draf lama di localStorage tidak diunggah otomatis.

Masuk ke CMS dengan akun admin TANJ. Customer tidak diberi akses. Setelah SQL berhasil, muat ulang CMS.

## Alur simpan

- Produk: nama/varian, koleksi, harga, warna, foto model/produk, jumlah terjual, status draf/aktif.
- Stok wear disimpan langsung ke `tb_m_product`. Stok hijab memperbarui ketersediaan publik; penjualan hijab masih melalui CS.
- Konten, harga, dan pengaturan lain disimpan sebagai draf. Klik **Publikasikan** untuk menampilkan perubahan di semua perangkat.
- Pembayaran & QRIS membuka pengelola pembayaran yang sama dengan admin, termasuk verifikasi, resi, dan gambar QRIS. Pengaturan tersebut langsung tersimpan di database.
- Tampilan & fitur: teks lookbook/cerita, Times New Roman/Manrope, ivory/cocoa, Instagram/TikTok, WhatsApp/email CS, tampil/sembunyikan stok dan jumlah terjual, batas qty per produk (1–99), jumlah rekomendasi keranjang (0–4), ukuran QRIS (120–600px), serta batas waktu pembayaran (1–72 jam).
- Hero, banner, media lookbook, koleksi dan katalog hijab memakai data CMS yang sama. Media menggunakan aset `assets/...` atau URL HTTPS.

Customer membaca versi publik. Tab yang sudah terbuka memperbarui katalog saat fokus kembali atau setiap 30 detik. Pesanan lama mempertahankan harga, nominal dan batas bayar saat pesanan dibuat. Harga checkout dihitung database; batas qty juga divalidasi database.

## Perlindungan data

RPC tulis memeriksa role admin di database. Draf tidak dapat dibaca pengunjung. Penulisan memakai nomor revisi; perubahan dari tab admin lain meminta muat ulang. Pemeriksaan stok membandingkan stok saat editor dibuka dengan stok terbaru, supaya pengurangan oleh order tidak tertimpa. Publikasi tidak menulis ulang stok. Produk yang dihapus dinonaktifkan saat publikasi, tanpa menghapus riwayat pesanan.

Password, role admin, secret gateway, dan SMTP bukan pengaturan frontend CMS. Email CS tidak mengubah tujuan/template EmailJS; notifikasi Order mengikuti konfigurasi layanan yang sudah ada. Aktivasi Midtrans/WhatsApp otomatis tetap memerlukan backend dan layanan terkait. Ongkir master wilayah belum memiliki editor CMS; tarif tetap berasal dari tabel `tb_m_shipping`.

Pengujian: `node tests/cloud-cms-database.mjs` dan `node tests/cloud-cms-browser.mjs`. Keduanya memakai PostgreSQL lokal; pengujian browser memakai SDK Supabase asli dengan endpoint uji. Tidak mengubah project produksi atau mengirim email.
