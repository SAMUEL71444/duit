# Fix: Supabase Schema Cache Refresh

## Masalah
Error `PGRST205: Could not find the table in the schema cache` terjadi ketika:
- Tabel SUDAH ADA di database ✅
- Tapi Supabase PostgREST API server **belum reload** schema cache-nya

## Solusi — 2 Cara (pilih salah satu)

### Cara 1: Reload via SQL Editor (PALING MUDAH)
Jalankan query ini di Supabase SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```

### Cara 2: Restart via Dashboard
1. Buka https://app.supabase.com → pilih project kamu
2. Klik **Settings** (roda gigi bawah kiri)
3. Klik **API** di sidebar
4. Scroll ke bawah → cari tombol **"Reload schema cache"** atau restart

### Cara 3: Tunggu otomatis
Supabase akan auto-reload schema cache setiap ~5 menit.
Coba refresh halaman setelah 5 menit.
