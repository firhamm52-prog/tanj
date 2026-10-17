# Biteship lokal TANJ

1. Isi `.env`: `BITESHIP_API_KEY` dengan key Biteship. Kode pos asal sudah `13110`, berat perkiraan baju `700` gram/item dan hijab `300` gram/item. Sesuaikan `BITESHIP_COURIERS` dengan kurir yang aktif pada akun.
2. Supabase Dashboard proyek TANJ → Settings → API Keys → ambil **secret key** (`sb_secret_...`) atau key **service_role** lama. Isi `SUPABASE_SERVICE_ROLE_KEY` di `.env`. Kunci ini hanya untuk server; jangan tempel di chat atau file `web/`.
3. Setelah migrasi 001–007, jalankan isi `supabase/migrations/202610170008_biteship_shipping.sql` melalui SQL Editor Supabase. Migrasi ini mewajibkan tarif Biteship yang tersimpan pada server untuk pesanan baru. Pesanan lama tetap tersedia.
4. Jalankan `npm.cmd start` di terminal proyek. Kalau server sudah berjalan, hentikan dengan Ctrl+C lalu jalankan kembali. Buka `http://localhost:3000`, bukan Live Server atau file HTML langsung.
5. Login customer, isi keranjang, pilih alamat, lalu klik **Metode pengiriman → Cek ongkir**. Pilih layanan dan konfirmasi. Total mengikuti tarif layanan yang dipilih.

Request ongkir dilakukan ketika tombol pilihan pengiriman dibuka, memakai cache server 5 menit dan batas 20 request/menit/customer. Cek ongkir dapat dikenakan biaya Biteship, termasuk saat testing. Pengujian otomatis menggunakan respons tiruan tanpa memanggil Biteship.

Tarif menggunakan kode pos dan perkiraan berat per item; sesuaikan berat dengan paket sebenarnya sebelum operasional. Tarif berlaku 10 menit dan harus dipilih kembali jika alamat atau keranjang berubah. Server menyimpan tarif, pemilik, alamat dan keranjang; database menolak nominal atau layanan yang diubah dari browser. Jika secret Supabase belum diisi, cek tarif bisa dicoba tetapi pembuatan pesanan diblokir.

Integrasi ini hanya cek ongkir dan penyimpanan pilihan pengiriman. Pembuatan resi/pickup otomatis belum diaktifkan. Pembayaran yang tersedia di kode tetap QRIS manual; Midtrans belum diintegrasikan.

Verifikasi lokal: `node --test tests/biteship.test.mjs`.
