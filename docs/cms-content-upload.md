# Upload video utama, banner, dan lookbook

Jalankan seluruh isi `supabase/migrations/202610270026_cms_video_upload.sql` sekali di Supabase → SQL Editor → New query → Run. Lalu jalankan `supabase/migrations/202610270027_cms_mov_upload.sql` untuk menambahkan format MOV. Migrasi menambahkan bucket video publik dengan izin upload khusus admin. Batas foto produk tetap 5 MB.

Di CMS → **Konten website**:

- **Edit video** pada Video utama: pilih file MP4, WebM atau MOV dari perangkat, tunggu upload dan periksa preview, lalu Simpan & publikasikan.
- **Edit banner**: pilih Jenis media Foto atau Video, kemudian pilih file dari perangkat. Foto bisa digeser dan di-crop (awal 16:9); video langsung diunggah.
- **Edit/Tambah lookbook**: isi keterangan, pilih Jenis media, upload file, lalu simpan dan publikasikan.

Video maksimal 50 MB per file, format MP4/WebM/MOV. Foto maksimal 5 MB, format JPG/PNG/WebP. URL masih bisa ditempel jika medianya sudah tersedia online. Upload menggunakan file baru setiap kali; media yang sedang tayang baru berubah setelah publikasi.

MOV diunggah tanpa konversi codec. Jika browser tidak bisa memutar preview, CMS menampilkan pesan untuk mencoba ekspor MP4 sebelum dipublikasikan.

Tidak perlu mengganti Edge Function Midtrans atau template email.
