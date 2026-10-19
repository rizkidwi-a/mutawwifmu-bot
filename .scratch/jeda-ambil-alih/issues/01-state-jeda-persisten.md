# 01: State jeda persisten (per kontak + global)

**What to build:** Port penyimpanan state jeda beserta implementasi berkasnya (mis. `src/jedaStore.ts`, nama bebas mengikuti konvensi repo). State yang disimpan:

1. Daftar kontak yang sedang dijeda, per nomor E.164 (dinormalisasi seperti `normalizePhoneNumber` di `src/config.ts`), masing-masing dengan waktu mulai jeda.
2. Status **Nonaktif Sementara** global (boolean).
3. Kontak handoff terakhir (untuk perintah `#jeda` tanpa nomor pada tiket 02) — ikut persisten supaya tetap dikenal setelah restart.

Implementasi berkas JSON di `data/jeda-state.json` (dibuat otomatis; `data/` sudah di-ignore git). Operasi: muat saat start, tulis setiap perubahan, tanpa dependensi npm baru. Port ini provider-agnostic dan tidak menyentuh seam percakapan.

**Blocked by:** none

**Status:** resolved

- [x] Port dengan operasi: jeda kontak, lanjut kontak, nonaktif global, aktifkan global, tanya status (per kontak + global), set/baca kontak handoff terakhir.
- [x] State persisten di `data/jeda-state.json`; proses restart tidak menghapus jeda yang sedang aktif.
- [x] Berkas korup/tidak ada → mulai dari state kosong dengan peringatan di log proses (keputusan sadar — lihat Comments).
- [x] Tanpa dependensi npm baru; penulisan mengikuti pola best-effort transkrip (kegagalan I/O dicatat ke log, tidak melempar ke jalur balasan).
- [x] Tes unit baru (mis. `tests/jedaStore.test.ts`): jeda/lanjut kontak, nonaktif/aktif global, persistensi lintas "restart" (instansi baru membaca berkas yang sama), berkas korup, penulisan ulang idempoten.
- [x] `npm test` dan `npm run typecheck` tetap hijau.

## Testing Decisions

- Port diuji murni lewat berkas sementara per tes (tanpa menyentuh `data/` nyata).
- Normalisasi nomor sama ketatnya dengan `normalizePhoneNumber` (8–15 digit, tanpa `+`), agar kunci kontak konsisten dengan `InboundMessage.from`.

## Comments

- Sumber kebutuhan: keresahan pemilik (sesi 2026-10-10) — admin membalas pelanggan dari nomor bot dan butuh cara mematikan balasan otomatis tanpa mematikan proses. Lihat `.scratch/jeda-ambil-alih/spec.md`.
- Keputusan sadar: berkas korup → state kosong + peringatan, bukan fail-closed. Alasannya bot yang "macet diam permanen" karena satu berkas rusak lebih mahal daripada bot yang membalas lagi; admin dapat segera menjeda ulang lewat perintah (tiket 02). Bila pemilik lebih suka fail-closed (bot diam sampai diperbaiki), ubah keputusan ini sebelum implementasi.
- Implementasi (2026-10-10): `src/jedaStore.ts` — port `JedaStore` + adapter berkas `FileJedaStore`, diuji lewat `tests/jedaStore.test.ts` (17 tes). Berkas belum ada sengaja **tidak** memperingatkan (dianggap start bersih); peringatan hanya untuk berkas yang ada tetapi korup/tak terbaca. Bila pemilik ingin peringatan juga saat berkas belum ada, ubah `load()`.
