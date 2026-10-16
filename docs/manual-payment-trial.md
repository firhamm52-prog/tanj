# Trial pembayaran manual TANJ

Versi ini adalah prototype yang bekerja di GitHub Pages. Tidak ada API bank, QRIS aktif, API ongkir, atau pengiriman WhatsApp otomatis. Pembayaran adalah simulasi; ongkir memakai harga perkiraan dari master wilayah yang diberikan, bukan tarif live kurir. Halaman pembayaran tidak menampilkan QRIS merchant yang bisa dibayar. Jangan gunakan data customer atau bukti transfer asli.

## Coba alur pembeli dan admin

1. Buka website, pilih produk, tambahkan ke tas, lalu lanjut checkout.
2. Isi data contoh, pilih dropdown provinsi, kota/kabupaten, kecamatan, lalu kode pos. Isi jalan, nomor rumah, RT/RW, desa/kelurahan dan patokan dalam kolom alamat lengkap. Perkiraan ongkir langsung muncul sesuai kota. Master mencakup 514 kota/kabupaten di 38 provinsi. Kolom yang digunakan adalah Perkiraan bawah (Rp), bukan referensi resmi JNE maupun batas atas. Asal Matraman, Jakarta Timur, patokan paket 1 kg; bukan tarif live kurir atau jaminan layanan.
3. Lanjut pembayaran: total meliputi subtotal, ongkir contoh, dan penyesuaian kode unik 0–999 rupiah. Tiga digit terakhir total benar-benar sama dengan kode 001–999; kode tidak bentrok dengan pesanan yang masih perlu diperiksa.
4. Customer boleh menekan “Saya sudah bayar”, menambahkan bukti contoh JPG/PNG/WebP maksimal 1 MB, atau tidak melakukan keduanya. Konfirmasi/screenshot tidak mengubah status menjadi lunas.
5. Klik “Coba pemeriksaan admin” untuk membuka `admin/#payments` di browser yang sama. Kredensial demo: admin@tanj.test / demo123. Menu Pembayaran manual juga tersedia dari sidebar Studio.
6. Admin melihat seluruh pesanan yang perlu diperiksa, termasuk yang belum dikonfirmasi, tanpa bukti, dan lewat batas waktu. Urutan tertua lebih dulu. Pilih pesanan, klik Cocokkan & terima pembayaran, masukkan nominal, referensi unik, waktu, catatan, dan centang pemeriksaan. Pada trial ini, gunakan transaksi contoh karena tidak ada koneksi ke dana sungguhan.
7. Jika nominal belum cocok, pilih Perlu bantuan / penelusuran. Customer diberi pesan jangan membayar ulang; tidak ada pembatalan otomatis akibat bukti tidak jelas atau batas upload.
8. Status berubah pada tab pembeli di browser yang sama. Pembeli dapat membuka “Pesanan saya · simulasi” di tas atau `#pesanan` untuk membuka kembali tagihannya setelah reload.
9. Menu Pengaturan simulasi di admin mengatur nama pemeriksa dan batas waktu untuk pesanan baru (1–72 jam). Reset simulasi pembayaran menghapus order, bukti, dan pengaturan pembayaran, dengan konfirmasi di halaman. Produk/draf CMS tidak dihapus.

## Aturan yang diperbaiki

- Persetujuan tidak mensyaratkan upload atau konfirmasi customer.
- Admin wajib mencocokkan nominal bruto, waktu, dan referensi transaksi; screenshot saja bukan validasi uang masuk. Untuk operasional, gunakan detail transaksi merchant, bukan semata nilai pencairan bersih gabungan.
- Referensi yang telah digunakan tidak dapat dipakai lagi pada pesanan berbeda.
- Pesanan yang sedang dibuka admin memakai versi data; keputusan dari data lama ditolak. Browser yang mendukung Web Locks juga mengunci perubahan antar-tab.
- Lewat deadline menjadi Perlu diperiksa, bukan otomatis batal atau otomatis dianggap belum bayar. Admin dapat menelusuri pembayaran terlambat, termasuk pesanan yang sebelumnya dibatalkan pembeli.
- Jika konfirmasi atau bukti masuk lagi, riwayat dicatat. Tidak ada batas upload yang otomatis membatalkan order. Kapasitas penyimpanan browser tetap terbatas; kegagalan menyimpan ditampilkan dan tidak diam-diam menghapus keranjang.
- Stok diperiksa terhadap katalog terbaru untuk setiap checkout. Pesanan demo sebelumnya tidak mengurangi stok katalog, sehingga presentasi bisa diulang tanpa reset riwayat. Ini bukan sistem inventory produksi.

## Batasan GitHub Pages

Data dan bukti berada di localStorage (`tanj-manual-payments-demo-v1`), hanya di browser/origin yang sama. Admin di HP atau browser lain tidak akan menerima order; ini bukan autentikasi atau storage privat untuk pembayaran nyata. Login Studio pada mode demo hanya untuk mencoba UI. Prototype juga tetap berlabel simulasi ketika disajikan lewat backend CMS lokal; modul pembayaran belum memakai database backend.

Untuk produksi perlu backend/database bersama, autentikasi dan otorisasi order, penyimpanan bukti privat, log audit di server, tarif pengiriman aktual, QRIS merchant resmi, serta pemeriksaan transaksi manual yang dilakukan admin. Jika ingin notifikasi WhatsApp otomatis, integrasikan layanan yang sesuai pada backend. Jangan mengaktifkan transfer nyata pada prototype statis ini.

## Verifikasi lokal

- `npm.cmd run test:payments`: uji browser checkout statis, approval tanpa konfirmasi/bukti, bukti opsional, nominal salah, referensi duplikat, pembayaran terlambat, keputusan usang, total dengan kode unik, persistensi, isolasi browser, kegagalan storage, responsivitas, reset, dan tidak ada API pembayaran yang dipanggil.
- `node tests/stock-checkout.mjs`: batas stok, keranjang lama, dan pemeriksaan stok terbaru.
- `npm.cmd test`: regresi API CMS.

Tes browser memakai Google Chrome yang sudah terpasang. Screenshot tersimpan di test-results/ dan tidak di-commit.

## Master perkiraan ongkir

Data pada web/shipping-master.js diimpor dari workbook Master-Wilayah-dan-Riset-Ongkir-Jakarta (2).xlsx, sheet Master wilayah, kolom D Perkiraan bawah (Rp). Nilai dihitung pada level kota/kabupaten, bukan provinsi saja. Tanggal master: 16 Oktober 2026. Pemilihan provinsi membatasi kota yang tersedia dan menghapus kota/ongkir sebelumnya agar total tidak memakai tujuan lama. Pembentukan order memvalidasi pasangan kode provinsi dan kota terhadap master, lalu mengambil harga dari master, bukan input nominal pembeli.

Tarif ini dipakai sekali per pesanan berdasarkan patokan 1 kg file tersebut; belum ada pengalian berat/jumlah produk, volumetrik, asuransi, atau tambahan wilayah kecamatan. Informasi tersebut tetap perkiraan. Pesanan lama menyimpan snapshot alamat dan ongkir lama; tidak diubah diam-diam oleh pembaruan master.

Untuk memperbarui data: pasang openpyxl pada lingkungan development lalu jalankan `python scripts/import-shipping.py "path/workbook.xlsx"`. Importer hanya membaca data/cached formula dan memvalidasi 514 kota serta 38 provinsi. Workbook pengguna tidak perlu dipublikasikan. Browser membaca file JavaScript hasil import tanpa library Excel atau API eksternal.

Tes data ongkir: `node --test tests/shipping.test.mjs`. Tes browser pembayaran juga mencakup dropdown provinsi/kota, penghapusan ongkir saat provinsi berubah, dan total dari master. Contoh Kota Tangerang Rp10.000, Kota Bandung Rp10.000, Kota Jayapura Rp90.000 menurut kolom perkiraan bawah file, bukan angka referensi resmi kurir.

## Kecamatan dan dropdown kode pos

Workbook kedua juga mencakup sheet Kecamatan dan kode pos: 7.285 kecamatan dan 11.580 pasangan kecamatan/kode pos. Kode disimpan sebagai teks, tidak diubah menjadi angka. Importer memeriksa setiap induk provinsi/kota, kode kecamatan, duplikasi pasangan kode pos, dan kecocokan ongkir terhadap kota induk.

File `web/shipping-areas/{kode_provinsi}.js` dimuat hanya saat customer memilih kota pada provinsi tersebut, sehingga halaman awal tidak mengunduh seluruh daftar desa/kelurahan. Dropdown kecamatan berisi kecamatan kota terpilih; dropdown kode pos berisi kode yang ada pada kecamatan itu. Label kode pos menyertakan nama desa/kelurahan, dan rincian nama ditampilkan setelah kode dipilih. Tidak ada dropdown desa tambahan; alamat lengkap tetap teks.

Perubahan provinsi mengosongkan kota, kecamatan, dan kode pos. Perubahan kota mengosongkan kecamatan/kode pos; perubahan kecamatan mengosongkan kode pos. Jika data gagal dimuat, customer dapat menekan Coba lagi. Respons pemuatan untuk kota lama tidak boleh mengganti pilihan kota terbaru.

Pembentukan pesanan memvalidasi ulang rantai provinsi/kota/kecamatan/kode pos terhadap master. Kecamatan dan kode pos tidak menaikkan atau mengubah ongkir; nominal tetap harga perkiraan bawah pada level kota untuk patokan 1 kg. Nama/kode kecamatan disimpan pada snapshot pesanan, ditampilkan kepada customer dan admin, serta tetap terbaca setelah reload. Pesanan lama yang belum memuat kecamatan tetap dapat dibuka tanpa dipaksa berubah.

Tes data mengecek semua induk kecamatan dan seluruh kode pos, menolak kode pos atau kecamatan dari wilayah lain, dan memastikan ongkir tidak berubah antar kecamatan pada kota yang sama. Tes browser mencakup dropdown bertingkat, reset induk, retry pemuatan data, race pemilihan kota, validasi stok, dan persetujuan pembayaran tanpa bukti wajib.


Kontak pesanan: WhatsApp 081363661703 (6281363661703), email tanj.indonesia@gmail.com. Detail pesanan menyediakan tautan WhatsApp dan mailto dengan ringkasan, alamat, rincian produk, ongkir, total, dan status. Pengguna harus menekan Kirim di aplikasi tujuan. Tidak ada pengiriman otomatis atau sinkronisasi pesanan lintas perangkat; hosting statis masih simulasi.

Demo berulang: pesanan sebelumnya di browser tidak mengurangi stok katalog. Setiap checkout tetap memvalidasi jumlah terhadap stok katalog terbaru; tidak perlu reset riwayat untuk presentasi ulang.


## Dedicated admin payment prototype

Open `admin/payments.html` from the storefront Admin link. First use creates a browser-local ID/password with PBKDF2-SHA256 (210000 iterations, random salt). Every fresh navigation/reload requires login. This gate is only a prototype, not server authorization: browser data and code can be changed locally, and another browser can create another local account. Do not reuse a real account password.

The screen supports six counted filters, search, proof viewing, approval with amount/reference checks, and rejection with a required customer-visible reason. Customer order history has the same six filters. Confirmation/proof updates refresh the same-browser admin screen; a bank transfer itself produces no automatic event.

Forgot-password links compose an email/WhatsApp request to the owner; they do not send OTPs or reset credentials. Production remains dependent on shared backend order storage, server-enforced admin provisioning/authentication, a verified recovery channel with expiring single-use tokens and delivery credentials. Never expose an unauthenticated public first-admin registration endpoint.

Validation: `node tests/payment-admin.mjs` covers first setup, wrong/correct password, fresh-page login gate, rejection persistence and mobile overflow.

Admin QRIS trial: expand Pengaturan QRIS in admin/payments.html, upload a decoded JPG/PNG/WebP up to 1 MB and save. The image persists in browser settings and appears on checkout in that browser; deleting restores the placeholder. Trial labels remain visible. No transfer, upload to hosting, or automatic payment detection occurs.
