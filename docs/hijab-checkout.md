# Mengaktifkan checkout hijab di website live

Frontend sekarang membuka detail hijab, pilihan warna, keranjang dan checkout TANJ.
Database checkout sebelumnya hanya mengenali baju. Jalankan migrasi berikut sebelum
mempublikasikan frontend agar pesanan hijab diterima dan stoknya berkurang:

1. Buka dashboard Supabase untuk proyek TANJ, lalu SQL Editor → New query.
2. Salin seluruh isi `supabase/migrations/202610180008_hijab_checkout.sql`.
3. Klik Run. Jalankan sekali setelah migrasi 007; jangan jalankan ulang migrasi lama.
4. Setelah berhasil, publikasikan frontend dan uji satu pesanan hijab serta pesanan
   campuran baju dan hijab. Periksa harga, ongkir, stok dan detail pesanan.

Migrasi memasukkan hijab yang dipublikasikan ke katalog checkout tepercaya dan
menyinkronkan perubahan CMS. Publikasi ulang tidak mengembalikan stok yang sudah
berkurang karena pesanan. Migrasi tidak membuat pembayaran atau pengiriman asli.
