# Ongkir TANJ di GitHub Pages

GitHub Pages tetap menyajikan website. Supabase Edge Function `shipping` memeriksa sesi customer, mengambil katalog server, menghitung tarif Biteship, dan menyimpan quote ke tabel migrasi 008. Token Biteship dan secret Supabase tidak masuk frontend.

## Deploy dari Dashboard

1. Pastikan migrasi **008** sudah sukses (tidak perlu dijalankan ulang).
2. Di Supabase proyek TANJ, buka **Edge Functions → Secrets**. Tambahkan `BITESHIP_API_KEY` dengan token lengkap dari `.env`. Kode menggunakan default asal `13110`, baju `700` gram dan hijab `300` gram. Jika perlu, tambahkan secret `BITESHIP_ORIGIN_POSTAL_CODE`, `BITESHIP_CLOTHING_WEIGHT_GRAMS`, `BITESHIP_HIJAB_WEIGHT_GRAMS`, dan `BITESHIP_COURIERS`.
3. Edge Functions menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY` dan `SUPABASE_SERVICE_ROLE_KEY` bawaan. Jika legacy service key sudah dinonaktifkan, tambahkan secret bernama `TANJ_SUPABASE_SECRET_KEY` berisi secret key Supabase yang sudah dipakai di `.env`.
4. **Edge Functions → Deploy a new function → Via Editor**. Nama function harus **`shipping`**. Salin seluruh isi `supabase/dashboard/shipping.ts` ke editor, lalu deploy. File ini hasil bundle tanpa token rahasia.
5. Pada pengaturan function, **Verify JWT / Enforce JWT verification dimatikan**. Function memvalidasi sendiri JWT customer melalui Supabase Auth sebelum cek tarif; GET konfigurasi dan OPTIONS tidak memerlukan sesi.
6. Perubahan frontend (`web/biteship.js` dan dependensinya) harus ikut dipublikasikan ke repository GitHub Pages. GitHub Pages menggunakan `https://mdvbyrcbuizfycjbcizl.supabase.co/functions/v1/shipping`; server lokal tetap menggunakan `/api/shipping`.

Origin yang diperbolehkan default `https://firhamm52-prog.github.io`. Saat pindah domain, atur secret `TANJ_ALLOWED_ORIGINS` dengan origin baru, dipisahkan koma jika lebih dari satu. Origin tidak mengandung `/tanj/`.

## Verifikasi

- Buka `https://mdvbyrcbuizfycjbcizl.supabase.co/functions/v1/shipping/config`; setelah deploy dan secret siap, respons berisi `enabled: true` dan `orderReady: true`.
- Di website GitHub Pages, login, pilih alamat, lalu cek ongkir. Request muncul ke `/functions/v1/shipping/rates`, tidak ke `/api/shipping/rates` pada GitHub.
- Tarif yang berhasil tersimpan dipakai ulang untuk customer, alamat dan keranjang yang sama selama lima menit, termasuk saat Edge instance berganti. Quote berlaku sepuluh menit; perubahan alamat/keranjang mewajibkan pilihan baru. Ada pembatas request per instance; ini bukan batas global lintas instance.
- Cek ongkir memakai saldo API Biteship. Tes otomatis hanya memakai respons tiruan: `node --test --test-isolation=none tests/shipping-edge.test.mjs tests/biteship.test.mjs`.

Bangun ulang file editor setelah mengubah sumber: `node scripts/build-shipping-edge.mjs`. Alternatif deploy CLI: `supabase functions deploy shipping --project-ref mdvbyrcbuizfycjbcizl --no-verify-jwt`, setelah login CLI dan mengatur secrets. Deploy memerlukan akses akun Supabase; secret key database tidak memberi izin deploy function.
