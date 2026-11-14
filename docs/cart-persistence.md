# Penyimpanan tas belanja

Tas tersimpan di `localStorage` browser, dengan key `noireaterial-cart-v1`. Refresh, login/logout, menutup tab dan membuka ulang browser yang sama tidak menghapusnya. Penyimpanan ini tidak otomatis berpindah perangkat/browser. Incognito atau menghapus data situs dapat menghapusnya.

Barang hanya dikeluarkan ketika customer menekan Hapus/mengurangi jumlah sampai nol, atau setelah pesanan berhasil dibuat. Jika katalog sementara gagal dimuat, stok habis atau produk tidak ditemukan, baris barang tetap disimpan. Checkout diblokir sampai produk kembali tersedia atau customer menghapusnya.

Nama/gambar/harga terakhir disimpan sebagai tampilan sementara. Harga akhir dan stok tetap diperiksa server saat order; nilai browser tidak dipercaya untuk menagih pembayaran.

Regresi yang diperbaiki: normalisasi tas sebelumnya membuang barang ketika stok sementara terbaca nol, termasuk saat permintaan katalog gagal setelah refresh.
