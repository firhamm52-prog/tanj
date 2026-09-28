# TANJ — Website & CMS Studio

Landing page responsive, admin CMS dengan data dummy, dan backend microservice JavaScript menggunakan Node.js 24+ serta SQLite.

## Coba online

- Website: https://firhamm52-prog.github.io/tanj/
- Admin demo: https://firhamm52-prog.github.io/tanj/admin/
- Email: `admin@tanj.test`
- Password: `demo123`

GitHub Pages menjalankan **simulasi statis**. Draf dan publikasi demo tersimpan di browser yang sama. Pengunjung lain tetap melihat data awal. Login demo bukan pengamanan data; jangan gunakan kredensial demo untuk produksi.

## Coba CMS

1. Masuk ke **Produk → Tambah produk**.
2. Isi nama, koleksi, harga, stok, foto, dan status. Pilih **Aktif** agar ikut tampil saat publikasi.
3. Klik **Simpan draf**, kemudian **Publikasikan**.
4. Buka atau muat ulang website di browser yang sama.
5. Coba edit koleksi, hijab, banner, video utama, atau lookbook.
6. **Pengaturan → Reset data dummy** mengembalikan demo. Ekspor JSON tersedia; impor belum disediakan.

Data awal: 12 produk pakaian, 6 hijab, 4 koleksi, 6 slide, 1 banner, dan 1 video utama. Stok merupakan dummy. Checkout tetap melalui WhatsApp; belum ada pembayaran atau pengurangan stok otomatis.

Media memakai file `assets/` atau URL HTTPS. Contoh: `assets/campaign-beige.webp`. Upload file ke server/object storage belum termasuk.

## Jalankan backend lokal

Pasang Node.js 24 LTS atau lebih baru, lalu:

```sh
npm run db:init
npm start
```

Buka `http://localhost:3000` dan `http://localhost:3000/admin/`. Gateway otomatis mengaktifkan mode backend. Kredensial development awal sama dengan demo. Backend tidak membutuhkan dependency npm tambahan. `db:init` tidak menimpa data lama; `npm start` juga melakukan inisialisasi otomatis.

| Proses | Port | Database / tabel |
| --- | --- | --- |
| API gateway | 3000 | `publication.sqlite`: `site_releases` |
| Auth | 4001 | `auth.sqlite`: `users`, `sessions` |
| Catalog | 4002 | `catalog.sqlite`: `collections`, `products`, `hijabs` |
| Content | 4003 | `content.sqlite`: `hero`, `banner`, `slides` |

Database fisik dibuat di `data/` dan tidak diunggah ke GitHub. Skema SQL ada di `database/`. Setiap layanan memiliki database sendiri dan berkomunikasi lewat HTTP internal. Password memakai scrypt, token sesi disimpan sebagai hash. Koleksi berisi produk tidak bisa dihapus. Publikasi menghasilkan satu snapshot utuh. Konflik edit simultan antar admin belum memakai version lock.

## Docker dan hosting

```sh
docker compose up --build -d
```

Konfigurasi memisahkan empat container dan volume database. Hanya gateway dipetakan ke `127.0.0.1:3000`. Docker belum diuji pada lingkungan ini; pengujian backend menggunakan proses Node lokal.

GitHub Pages tidak menjalankan Node.js/database. Untuk CMS yang perubahannya terlihat semua pengunjung, deploy backend ke VPS/container dengan persistent disk dan HTTPS. Sajikan frontend serta admin dari gateway pada origin yang sama. Integrasi API lintas origin belum diaktifkan.

Salin `.env.example` ke `.env`, atur `NODE_ENV=production`, email admin, password minimal 12 karakter, dan `INTERNAL_SECRET` acak minimal 32 karakter. Gunakan database/volume produksi baru. Jika memakai database lama, jalankan `npm run admin:reset-password` setelah mengganti `.env`; perubahan env saja tidak mengubah password dalam database. Untuk Docker: `docker compose exec auth node scripts/reset-password.mjs` setelah container memakai env baru.

Pasang reverse proxy HTTPS di depan gateway. Sesi produksi memakai cookie `Secure`, `HttpOnly`, `SameSite=Strict`. Backup keempat database menggunakan backup SQLite konsisten atau saat layanan dihentikan, termasuk perhatian pada WAL. Database dan `.env` tidak dapat diakses lewat gateway.

## Pengujian

```sh
npm install
npm test
# Jalankan npm start di terminal lain; Google Chrome harus tersedia.
npm run test:ui
```

Tes API: login/logout, akses tanpa otorisasi, validasi, CSRF, draf/publikasi, relasi produk-koleksi, stok, persistensi, dan file privat. Tes browser: CRUD demo/API, subpath `/tanj/`, dan viewport 360, 390, 768, 820, 1024, 1440 px. Screenshot di `test-results/` tidak di-commit. Emulasi viewport bukan tes iPad/Safari fisik.

Lihat [arsitektur dan endpoint](docs/architecture.md).
