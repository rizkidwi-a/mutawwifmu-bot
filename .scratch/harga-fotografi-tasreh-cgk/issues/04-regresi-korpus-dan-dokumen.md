# 04 — Regresi, Korpus, dan Dokumen

Status: resolved

What to build:
- `tests/knowledge/fotoHarga.test.ts`: matcher per lokasi (angka lokasi lain
  tidak bocor), kasus ramadan, kasus segmen, kasus akad (tanpa baris reguler),
  materi memuat 13 baris + rincian.
- `tests/knowledge/businessFaq.test.ts`: tambah `price-tasreh` dan `tasreh` ke
  `SEMUA_TOPIK`/`TOPIK_HARGA`; ganti assert `IDR 350.000` → `IDR 300.000` +
  label CGK; assert angka tasreh; assert label "Paket Spesial Ramadan" mengganti
  "High season".
- `tests/conversation/indicativePricing.test.ts`: kasus seam — jawaban fotografi
  per lokasi (hanya baris lokasi itu), pertanyaan tasreh (termasuk yang menyebut
  Raudhah) dijawab tanpa `hand-off-to-admin`, handling memuat CGK IDR 300.000
  dan tidak memuat IDR 350.000.
- `tests/conversation/classifyInbound.test.ts` (atau file tes klasifikasi yang
  relevan): "berapa biaya tasreh raudhah?" → `indicative-price`/`price-tasreh`;
  "berapa biaya siskopatuhnya?" tetap handoff.
- `tests/korpus/dasar.json`: tambah kasus
  (`berapa biaya tasreh raudhah?`, `harga fotografer di masjid nabawi berapa?`,
  `handling bandara cgk harganya berapa?`) — seluruhnya `faq` + topiknya.
- `tests/regresi/deteksiMisfire.ts`: tambah `tasreh` dan `price-tasreh` ke
  `TOPIK_MATERI`.
- `CONTEXT.md`: istilah **Tasreh** (layanan pengurusan izin masuk Raudhah).
- Verifikasi hijau: `npm test`, `npm run typecheck`,
  `node scripts/probe-cakupan.ts`.

Blocked by: 01, 02, 03

## Comments

Selesai (2026-10-13): seluruh butir terpenuhi —
`tests/knowledge/fotoHarga.test.ts` (9 tes), pembaruan
`businessFaq.test.ts` (`SEMUA_TOPIK`/`TOPIK_HARGA` + assert CGK/tasreh/label
Ramadan), tiga kasus seam baru + pembaruan kasus handling di
`indicativePricing.test.ts`, tes pengecualian tasreh di
`classifyInbound.test.ts`, 3 kasus baru di `tests/korpus/dasar.json`,
`TOPIK_MATERI` di `deteksiMisfire.ts`, dan istilah **Tasreh** di `CONTEXT.md`.

Verifikasi hijau: `npm test` **458 lulus**, `npm run typecheck` bersih,
`node scripts/probe-cakupan.ts` **121/121** (topik-gap 16/16 — Raudhah dan
siskopatuh tetap handoff).
