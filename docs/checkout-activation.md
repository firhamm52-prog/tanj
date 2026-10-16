# Checkout TANJ — revisi dokumen 16 Oktober 2026

Referensi: `Deploy dan git.docx` (versi berisi alur customer/checkout). Sumber Word dan screenshot referensi tidak dipublikasikan ke GitHub.

## Yang dapat diuji sekarang

1. Tombol produk **Tambahkan ke tas** dan **Order Sekarang**. Customer wajib daftar/login sebelum kedua aksi dan sebelum checkout. Pilihan/kuantitas yang sedang dibuka diteruskan setelah login.
2. Ikon account beranda membuka account customer. **Admin TANJ** di panel tersebut membuka login admin yang terpisah per peran. Login admin tetap melalui account beranda; ulangi password hanya saat daftar.
3. Checkout memiliki kolom pilihan di kiri dan ringkasan pesanan di kanan. Tombol akhir bernama **Order**.
4. **Detail alamat → Ubah** membuka daftar alamat. Bisa memilih, mengubah, menghapus, atau **Buat Baru** (maksimal 10 alamat). Provinsi/kota/kecamatan/kode pos divalidasi; alamat tersimpan per customer pada browser yang sama.
5. Pengiriman dapat memilih J&T Reguler, JNE Reguler, atau Lion Parcel Reg Pack. Tarif saat ini memakai master kota 1 kg yang sama, **bukan penawaran API kurir atau SLA resmi**. Admin perlu mengonfirmasi layanan; tidak ada pembelian resi otomatis.
6. QRIS manual dapat dipilih. Pilihan VA/bank, OVO, Alfamart, dan kartu ditampilkan **belum aktif** dan tidak bisa digunakan sampai gateway tersedia. Tidak ada nomor VA palsu atau klaim penerimaan pembayaran otomatis.
7. Order mencatat pemilik, snapshot alamat, metode pengiriman/pembayaran, barang, nominal, kode unik, tanggal, batas bayar, dan status. Riwayat UI customer hanya menampilkan pesanan miliknya; admin dapat melihat semua pesanan lokal.
8. Ringkasan dan pembayaran bisa dibuka kembali melalui `#pesanan?order=...`, sesudah login customer yang sesuai. File email memakai tautan ini pada tombol **Cek cara membayar**.
9. Template email TANJ untuk admin dan customer tersedia. **Pratinjau email pesanan** memperlihatkan desain/template tanpa mengirim email. Fungsi server `sendOrderEmails` disiapkan untuk adapter penyedia email dengan kunci idempotensi per order/penerima. Hanya dianggap berhasil jika kedua pengiriman diterima provider.
10. Upload QRIS admin menyimpan gambar dan langsung menampilkannya pada checkout browser/origin yang sama. Ini belum mempublikasikan QRIS lintas perangkat.

## Aktivasi layanan yang belum tersedia

**Pembaruan email:** EmailJS dikonfigurasi dan diaktifkan memakai Service/Template/Public Key yang diberikan pemilik TANJ, tanpa menunggu backend/gateway. Periksa pengaturan dan pengiriman nyata sesuai [panduan aktivasi EmailJS](emailjs-setup.md). Ini tidak mengubah sifat penyimpanan akun/pesanan yang masih lokal dan tidak menjadikan email bukti pembayaran.

GitHub Pages hanya menjalankan frontend statis. Akun customer/admin, alamat, QRIS, dan ledger lokal merupakan prototipe; data browser dapat diubah pengguna. Ini **bukan otorisasi server** dan belum dapat menjadi toko operasional lintas perangkat.

Sebelum aktif untuk transaksi sungguhan:

- Pilih hosting backend + database bersama. Pindahkan akun/session ke server (cookie HttpOnly), alamat/pesanan/QRIS ke database/object storage, dan validasi akses pemilik/admin di setiap endpoint. Harga, ongkir, stok, dan total harus dihitung server.
- Berikan nama payment gateway dan mode sandbox/live; simpan secret key hanya pada server/environment hosting. Backend harus membuat transaksi, menyimpan referensi provider, memverifikasi tanda tangan webhook, mengatasi retry/duplikasi, dan memperbarui status berdasarkan provider. Daftar metode harus mengikuti metode yang telah diaktifkan merchant.
- Pilih penyedia email dan verifikasi domain/alamat pengirim. Implementasikan adapter `sendMail` untuk `services/order-notifications.mjs`, hubungkan event Order ke outbox database, lalu retry pengiriman secara idempoten. Jangan mengirim dari browser menggunakan secret key.
- Endpoint notifikasi yang dikonfigurasi melalui `window.TANJ_CONFIG.paymentNotificationEndpoint` menerima `{orderId}`; backend mengambil pesanan tersimpan serta memvalidasi pemilik, lalu memanggil `sendOrderEmails`. Endpoint ini belum dihosting/disediakan oleh GitHub Pages. Respons `{sent:true}` hanya setelah admin dan customer diterima provider.
- Pasang layanan tarif/resi kurir atau tetapkan ongkir kontrak merchant sebelum menganggap pilihan kurir sebagai layanan tersedia.

Kredensial tidak dikirim lewat chat/repository; atur melalui secret/environment hosting. Mengaktifkan layanan di atas memerlukan pemasangan backend, bukan hanya mengganti label UI.

## Verifikasi

- `node tests/checkout-experience.mjs`: alur customer, login gate, alamat, pilihan, pesanan, tautan email, isolasi UI, desktop/mobile.
- `node tests/payment-admin.mjs`: login admin, password kosong/salah, sesi kedaluwarsa, QRIS valid/rusak, approve/reject.
- `npm run test:payments`: pembayaran, wilayah berjenjang, nominal, referensi ganda, konflik pemeriksaan, penyimpanan, stok uji.
- `node --test tests/order-email.test.mjs`: keamanan template, URL pesanan, penerima, idempotensi, kegagalan parsial.
