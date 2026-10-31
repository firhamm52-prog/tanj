# Galeri hijab berpasangan

Foto/video berjalan atas dihapus dari homepage. Sebelum lookbook berjalan bawah, homepage menampilkan foto model di kiri dan mockup hijab yang sama di kanan. Swipe salah satu foto, tombol panah, atau tombol keyboard kiri/kanan mengganti keduanya bersama-sama. Mobile tetap menampilkan dua kolom.

**CMS → Hijab → Edit varian**:

- **Foto model hijab — sebelah kiri**: foto model (field `image` lama).
- **Foto mockup hijab — sebelah kanan**: upload mockup varian tersebut (field `product`).
- Simpan lalu Publikasikan.

Jika kolom mockup belum diisi, galeri memakai foto lain pertama dari galeri produk lama. Jika tidak ada pasangan, tampil placeholder sampai mockup diisi. Data hijab draf tidak ditampilkan. Foto/video atas yang sudah pernah diupload tetap tersimpan di CMS database tetapi tidak ditayangkan; lookbook bawah tetap tampil.

Tidak memerlukan migrasi SQL tambahan. Field foto disimpan di dokumen CMS yang sama. Harga, stok dan aturan pembayaran tidak berubah.
