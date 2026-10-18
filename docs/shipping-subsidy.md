# Subsidi ongkir baju TANJ

- Minimal 2 baju dalam satu pesanan, boleh berbeda model/warna.
- Subsidi maksimal Rp20.000 per pesanan dan tidak melebihi ongkir asli.
- Hijab tidak dihitung untuk memenuhi syarat. Pesanan campuran memenuhi syarat bila jumlah bajunya minimal 2.
- Contoh: 2 baju dengan ongkir Rp35.000 mendapat subsidi Rp20.000; customer membayar ongkir Rp15.000.
- Ongkir asli dan subsidi dicatat terpisah; saldo Biteship tetap menanggung ongkir asli.
- Kode unik dihitung ulang setelah subsidi. Pesanan lama tidak berubah.

## Aktivasi

1. Di Supabase SQL Editor, jalankan sekali seluruh isi `supabase/migrations/202610180010_clothing_shipping_subsidy.sql`, setelah migrasi yang sudah ada.
2. Kabari pengembang untuk memublikasikan frontend. Jangan memublikasikan tampilan diskon sebelum aturan server aktif.
3. Untuk menampilkan rincian subsidi dalam email, perbarui HTML kedua template EmailJS dari `emailjs-order-only-template.html` dan `emailjs-tracking-template.html`. ID template tetap sama.
4. Uji 1 baju, 2 baju, 2 hijab, 1 baju + hijab, dan 2 baju + hijab. Periksa total checkout dan tagihan.
