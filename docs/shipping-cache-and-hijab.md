# Ongkir tersimpan dan subsidi hijab

Pilihan kurir dan tarif disimpan di browser setelah dikonfirmasi. Refresh lalu lanjut checkout akan memulihkan alamat terakhir dan pilihan kurir jika customer, tujuan, barang, jumlah dan masa berlaku tarif masih cocok. Tidak perlu meminta tarif lagi hanya karena refresh.

Tarif berlaku maksimal 10 menit sesuai quote dari server. Setelah kedaluwarsa atau alamat/isi tas berubah, customer perlu cek ongkir lagi. Quote yang sudah dipakai membuat pesanan dibersihkan. Total akhir selalu diperiksa server; mengubah cache browser tidak dapat mengubah harga order.

## Mengaktifkan aturan hijab di Supabase

Jalankan `supabase/migrations/202611150030_hijab_shipping_discount.sql` sekali melalui SQL Editor, setelah migrasi 029. Ini langsung menonaktifkan subsidi untuk pesanan hijab saja. Pesanan lama tidak diubah; draf lain tidak ikut dipublikasikan.

CMS → Pengaturan → Diskon Ongkir → Atur Diskon Ongkir:

- **Aktifkan Diskon Ongkir**: tombol utama promo.
- **Batas subsidi ongkir per pesanan**: tetap Rp20.000 jika tidak diubah.
- **Berlaku juga untuk pesanan hijab saja**: biarkan tidak dicentang agar checkout hijab saja membayar ongkir penuh. Keranjang yang mengandung baju tetap dapat subsidi.

Simpan lalu Publikasikan untuk perubahan berikutnya. Sebelum SQL 030 dijalankan, cakupan promo lama tetap dipertahankan agar tampilan dan perhitungan server konsisten.
