# Diskon Ongkir

Jalankan SQL `202610270028_cms_shipping_discount.sql` sekali di Supabase setelah migrasi 027. Migrasi mengaktifkan subsidi maksimal Rp20.000 untuk pesanan baru, tanpa memublikasikan draf konten lain.

Di **CMS → Tampilan & fitur → Atur Diskon Ongkir**:

1. Centang **Aktifkan Diskon Ongkir** untuk menyalakan, atau hilangkan centang untuk mematikan.
2. Isi **Batas subsidi ongkir per pesanan (Rp)**, misalnya `20000`.
3. **Simpan → Publikasikan**. Status di kartu CMS adalah status draf; perubahan berlaku di checkout setelah dipublikasikan.

Subsidi = nilai terkecil antara ongkir asli dan batas subsidi. Tidak ada minimum belanja/jumlah barang; berlaku juga untuk hijab. Harga produk tidak berubah. Kurir tetap dibayar tarif penuh oleh TANJ.

Contoh ongkir Rp18.000 → subsidi Rp18.000 → customer bayar ongkir Rp0. Ongkir Rp35.000 → subsidi Rp20.000 → customer bayar ongkir Rp15.000.

Database menghitung total dari tarif kurir dan pengaturan terpublikasi. Nilai kiriman browser tidak bisa menentukan subsidi. Pesanan lama mempertahankan total yang sudah disepakati.

Email menggunakan ongkir asli di baris Ongkos Kirim dan menampilkan subsidi pada Diskon Ongkir. Template EmailJS yang sudah memakai `shipping_fee` dan `shipping_discount` tidak perlu disalin ulang.
