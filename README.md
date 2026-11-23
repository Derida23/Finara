# Finara

PWA pencatat pengeluaran harian pribadi. Dibuka dengan kunci pola 3×3 seperti di Android, data tersimpan di Google Sheets, di-hosting di Vercel.

## Prasyarat

- Node 22.18 atau lebih baru
- pnpm 10

## Setup lokal

1. `pnpm install`
2. `cp .env.example .env.local`
3. `pnpm set-pattern` → ketik nomor titik pola dua kali (titik bernomor 1–9 seperti tombol telepon, misalnya `1-2-5-8-9`) → tempel baris `PATTERN_HASH=...` ke `.env.local`.
4. Isi `SESSION_SECRET` dengan hasil `openssl rand -base64 48`.
5. Siapkan Google Sheets (bagian berikut), lalu jalankan `pnpm setup-sheet`.
6. `pnpm dev` → buka `http://localhost:4000`; API tersedia di `http://localhost:4000/api/...`.

## Setup Google Sheets (sekali saja)

1. Buka [console.cloud.google.com](https://console.cloud.google.com), buat project baru (misalnya `finara`).
2. **APIs & Services → Library** → cari **Google Sheets API** → **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**. Nama bebas, tidak perlu role.
4. Buka service account tadi → tab **Keys** → **Add key → Create new key → JSON**. Sebuah file JSON terunduh.
5. Dari file JSON itu, salin ke `.env.local`:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (biarkan `\n` apa adanya, bungkus dengan tanda kutip ganda)
6. Hapus file JSON dari folder Downloads setelah disalin; kunci itu memberi akses tulis ke spreadsheet.
7. Buat spreadsheet kosong di [sheets.new](https://sheets.new). Salin ID dari URL (bagian di antara `/d/` dan `/edit`) ke `SPREADSHEET_ID`.
8. Klik **Share** di spreadsheet → tambahkan email service account sebagai **Editor**.
9. `pnpm setup-sheet` → membuat tab Transaksi, Kategori, dan Ringkasan. Aman dijalankan ulang: isi tab yang sudah ada tidak disentuh, kecuali blok rumus Ringkasan (baris 3–5) yang selalu ditulis ulang sesuai lokal spreadsheet (pemisah `;` untuk Indonesia). Tab bawaan (`Sheet1`/`Lembar1`) boleh dihapus.

## Isi spreadsheet

| Tab | Kolom | Catatan |
|---|---|---|
| Transaksi | `id · tanggal · nominal · kategori · metode · catatan · dibuat_pada · diubah_pada` | Diisi oleh app. Jangan ubah urutan kolom. Baris yang ditambah manual tanpa `id` (UUID) tidak muncul di app. |
| Kategori | `nama · urutan · budget_bulanan · aktif` | Tambah, ganti nama, atau atur budget langsung di sini. Kategori tanpa centang `aktif` disembunyikan dari app; sel `aktif` kosong dihitung aktif. |
| Ringkasan | Total dan rincian per kategori | Ganti sel **B1** dengan bulan lain (format `YYYY-MM`). |

Tanggal disimpan sebagai teks `YYYY-MM-DD`, jadi aman diurutkan dan difilter. Mengunduh sebagai Excel: **File → Download → Microsoft Excel (.xlsx)**.

## API

Semua endpoint kecuali login butuh header `Authorization: Bearer <token>` dari `POST /api/login`. Token berlaku 12 jam.

| Method | Path | Isi |
|---|---|---|
| POST | `/api/login` | `{ "pattern": "12589" }` (nomor titik sesuai urutan digambar) → `{ token, expiresAt }` |
| GET | `/api/categories` | Kategori aktif, urut sesuai `urutan` |
| GET | `/api/expenses?month=YYYY-MM` | Pengeluaran satu bulan, terbaru di atas |
| POST | `/api/expenses` | Tambah. `id` (UUID) dibuat di HP; kiriman ulang dengan `id` yang sama tidak membuat baris ganda |
| PATCH | `/api/expenses/:id` | Ubah sebagian field (`date`, `amount`, `category`, `method`, `note`) |
| DELETE | `/api/expenses/:id` | Hapus baris; `id` yang sudah tidak ada tetap dijawab 204 |

Metode bayar yang diterima: `Tunai`, `QRIS/E-wallet`, `Debit`, `Kartu kredit`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Dev server, termasuk API |
| `pnpm build` | Build produksi ke `dist/` (yang dijalankan Vercel) |
| `pnpm test` / `pnpm typecheck` / `pnpm lint` | Gate |
| `pnpm set-pattern` | Membuat `PATTERN_HASH` untuk pola baru |
| `pnpm setup-sheet` | Menyiapkan tab spreadsheet |

## Deploy ke Vercel

Butuh akun GitHub dan Vercel (keduanya gratis).

1. Buat repo **private** baru di GitHub, kosong (tanpa README).
2. Dari folder ini, push kodenya. `.env.local` tidak ikut karena ada di `.gitignore`.
   ```
   git add -A
   git commit -m "feat: initial finara app"
   git remote add origin git@github.com:<akun>/<repo>.git
   git push -u origin main
   ```
3. Di vercel.com: **Add New… → Project** → pilih repo tadi → **Import**. Framework terdeteksi sebagai **Vite**; biarkan Build Command `pnpm build` dan Output Directory `dist`.
4. Di **Environment Variables**, isi lima variabel yang sama dengan `.env.local`: `PATTERN_HASH`, `SESSION_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `SPREADSHEET_ID`. Untuk `GOOGLE_PRIVATE_KEY`, tempel nilainya **tanpa tanda kutip** di awal dan akhir; `\n` di dalamnya biarkan saja.
5. Klik **Deploy**, lalu buka `https://<nama-project>.vercel.app` dan gambar polamu.

Setiap `git push` berikutnya ke `main` otomatis di-deploy ulang.

## Pasang di Android

1. Buka alamat Vercel tadi di **Chrome** Android.
2. Menu **⋮ → Instal aplikasi** (di versi lama: **Tambahkan ke layar utama**).
3. Ikon kalkulator "Finara" muncul di home screen dan terbuka tanpa bar browser.

Tampilan app tersimpan di HP setelah dibuka sekali, tapi login dan mencatat masih butuh internet sampai mode offline selesai dibuat.
