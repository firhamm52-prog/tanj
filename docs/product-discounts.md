# Diskon produk

Jalankan seluruh isi `supabase/migrations/202610240024_product_discounts.sql` sekali di Supabase → SQL Editor → New query → Run. Tidak perlu mengganti Edge Function Midtrans.

CMS → Produk atau Hijab → **Atur Diskon Produk** → isi potongan rupiah per unit → **Simpan & publikasikan**. Harga asli tetap di kolom Harga. Contoh harga Rp100.000 dan potongan Rp20.000 menghasilkan harga jual Rp80.000. Isi potongan 0 untuk menonaktifkan. Potongan harus lebih kecil dari harga asli.

Publikasi memperbarui harga checkout dan katalog secara bersamaan. Harga asli dicoret di katalog, detail produk, dan tas. Pesanan menyimpan harga serta diskon saat dibuat; perubahan berikutnya tidak mengubah pesanan lama atau mereset stok yang sudah dipesan.

Diskon ongkir awal Rp0; promo otomatis dua baju sebelumnya dinonaktifkan untuk pesanan baru. Pesanan lama mempertahankan nominal sebelumnya.

EmailJS → Email Templates → template pemesanan `template_9x2zs4s`: ganti isi Code Editor dengan `docs/emailjs-order-only-template.html`, lalu Save. Untuk pengiriman `template_nc0i08l`, gunakan `docs/emailjs-tracking-template.html`. Keduanya menampilkan Diskon Ongkir dan Diskon Produk tanpa Kode unik. Email yang sudah terkirim tidak berubah.
