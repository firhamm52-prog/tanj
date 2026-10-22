# Kelola produk TANJ

Pasang `supabase/migrations/202610220017_cms_new_products.sql` melalui Supabase SQL Editor. Migrasi ini mencakup perbaikan stok 016; tidak perlu menjalankan ulang 016 jika sudah dipasang. Pembaruan ini tidak memerlukan deploy Edge Function.

## Produk baju

Masuk admin → mode CMS → Produk → **+ Tambah produk**. Isi nama, koleksi, warna, harga, stok tersedia, foto model dan foto produk. Untuk koleksi baju baru, buat dahulu melalui menu Koleksi → **+ Tambah koleksi**. Setiap warna dibuat sebagai produk/varian tersendiri.

## Hijab

Masuk CMS → Hijab → **+ Tambah hijab**. Isi nama, koleksi (misalnya `selcuk`, `georgia` atau `pashmina`), warna, harga, stok tersedia dan foto. Koleksi hijab baru terlihat pada katalog semua hijab/Scarves; menu pintasan koleksi lama tetap tersedia.

Foto menggunakan URL HTTPS yang sudah dapat diakses publik atau file yang sudah tersedia di folder `assets`. Form ini belum mengunggah file dari perangkat.

## Simpan dan publikasikan

Pilih **Draf** untuk menyiapkan produk tanpa menampilkannya kepada pembeli. Jika sudah siap, ubah status menjadi **Aktif**, lalu pilih **Simpan & publikasikan** dan setujui konfirmasi. Tombol ini memublikasikan seluruh draf CMS, bukan hanya produk yang sedang diedit. Tab pembeli yang terbuka menyinkronkan katalog saat aktif, biasanya dalam lima detik.

Stok tersedia disimpan langsung dari CMS, termasuk saat memilih Simpan draf untuk produk yang sudah aktif. Harga dan konten baru berlaku setelah publikasi. Angka stok adalah jumlah yang masih bisa dipesan, di luar stok yang sudah ditahan pembayaran. Jika stok berubah saat editor masih terbuka, muat ulang CMS sebelum menyimpan lagi. Jangan menambahkan kembali barang yang sedang ditahan pembayaran sebagai stok baru.
