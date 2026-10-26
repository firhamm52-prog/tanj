# Galeri foto produk

1. Jalankan seluruh isi `supabase/migrations/202610260025_product_gallery.sql` sekali di Supabase → SQL Editor → New query → Run.
2. Buka CMS → Produk atau Hijab → Edit → Galeri foto produk.
3. Pilih beberapa file di **Tambah beberapa foto**. Maksimal 10 foto termasuk foto yang sudah ada. Atur crop satu per satu, lalu tekan **Pakai foto & upload**.
4. Gunakan tombol ←/→ untuk mengatur urutan dan Hapus untuk mengeluarkan foto dari galeri. Foto pertama menjadi foto awal di detail produk.
5. Simpan draf atau **Simpan & publikasikan** untuk menayangkan perubahan.

Galeri muncul saat customer membuka detail produk. Thumbnail berada di panel putih berbingkai hitam tipis di sisi kiri, terpisah dari foto utama agar tidak menutup gambar. Foto bisa diganti dengan thumbnail, tombol panah, tombol keyboard, atau swipe di HP. Memilih warna lain membuka galeri varian tersebut.

Produk tanpa galeri tetap menggunakan foto model dan foto produk yang sudah ada. Foto model/produk pada kartu katalog tetap memakai kolom Foto model/Foto produk yang terpisah. Menghapus foto dari galeri tidak menghapus file dari penyimpanan atau mengubah pesanan.

Tidak perlu mengubah Edge Function Midtrans atau template email.
