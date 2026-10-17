# Audit TANJ — 17 Oktober 2026

Perbaikan:

- Membuka ulang pilihan ongkir lalu membatalkan dialog tidak lagi mengganti quote aktif. Tarif baru diterapkan saat customer menekan Konfirmasi.
- Ringkasan checkout menyebut pengiriman belum dipilih sampai customer memilih kurir. Radio pilihan wajib dipilih sebelum konfirmasi.
- Rekomendasi mencampur hijab dan baju, menampilkan video Georgia Cream terlebih dahulu, dan mengulang gerakan ke kiri lima detik. Lebar kartu mengikuti jumlah item; salinan video tetap muted, dan animasi berhenti saat hover/fokus serta menghormati reduced motion.
- Mode demo statis tidak lagi meminta endpoint ongkir yang tidak tersedia.
- Keterangan sesi pada CMS diselaraskan dengan autentikasi Supabase.
- Fixture akun demo dan pemeriksaan tautan pada tes lama diperbarui tanpa mengendurkan aturan konfirmasi, nominal, referensi, atau pemilik pesanan.
- Format SQL migrasi 009 dirapikan tanpa perubahan perilaku; database tidak perlu dimigrasikan ulang untuk perubahan format ini.

Verifikasi meliputi checkout dan pembatalan pilihan ongkir, email tiruan, review pembayaran, rekomendasi, CRUD/publish CMS, isolasi customer, izin database, dan layout mobile/tablet/desktop. Tampilan diuji dari lebar 320 sampai 1440 piksel. Tidak ada pembayaran uang asli, pengiriman paket, atau pengiriman email sungguhan dalam tes audit.

Batas layanan tetap: pembayaran tersedia melalui QRIS manual; gateway/VA belum diaktifkan. Email Auth masih menggunakan pengirim bawaan Supabase, dan template konfirmasi khusus menunggu konfigurasi SMTP. Pembuatan resi Biteship otomatis belum diaktifkan. Audit bukan jaminan tidak ada bug di semua kombinasi perangkat dan data.
