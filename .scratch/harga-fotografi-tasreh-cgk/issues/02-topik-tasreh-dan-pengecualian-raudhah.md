# 02 — Topik Tasreh dan Pengecualian Raudhah

Status: resolved

What to build:
- `PriceTopic` baru `price-tasreh` + entri `ENTRIES` (pola: `PRICE_WORD` dan
  kata penanda `tasreh`/`tasreg`) dengan angka **IDR 300.000 per pax**
  (sumber: chat Cut Emelia "pengurusan tasreh Raudhah ... Rp300.000/pax" dan
  Vira Arman "tasreh diluar aplikasi kami ada ... IDR 300.000/Pax"), disertai
  keterangan barcode bukti izin masuk sesuai jadwal yang tersedia.
- `FaqTopic` baru `tasreh` (non-harga) agar pertanyaan non-angka tercatat
  sebagai kebutuhan; jawabannya **tanpa angka** (invarian non-harga).
- Pecah `UNSUPPORTED_TOPIC` di `classifyInbound.ts`:
  - `UNSUPPORTED_TOPIC_RAUDHAH` = raudhah/raudah/rawdhah/raudhatul/rawda/nusuk;
  - `UNSUPPORTED_TOPIC` = siskopatuh + (al) haramain/HHR + kereta (tanpa
    "gantung").
  Keduanya tetap `trigger: unsupported-question`.
- Pengecualian di loop `HANDOFF_PATTERNS`: pesan yang `matchFaqTopic()`-nya
  `price-tasreh` **melewati** `UNSUPPORTED_TOPIC_RAUDHAH`, sehingga "berapa
  biaya tasreh raudhah?" dijawab Harga Indikatif, bukan handoff.
- Registrasi: `TOPIK_VALID` di `geminiPemaham.ts` (dua topik baru).

Blocked by: —

Catatan: pesan yang menyebut siskopatuh/kereta Haramain tetap handoff walau
memuat kata tasreh. "Raudhah itu apakah perlu pesan2 gitu?" (tanpa kata harga)
tetap handoff — lihat `tests/korpus/topik-gap.json`.

## Comments

Selesai (2026-10-13): `price-tasreh` dan `tasreh` ditambahkan ke
`businessFaq.ts` (pola `PENANDA_TASREH = tasreh|tasreg`); `UNSUPPORTED_TOPIC`
dipecah menjadi `UNSUPPORTED_TOPIC_RAUDHAH` (raudhah/raudah/rawdhah/
raudhatul/rawda/nusuk) dan `UNSUPPORTED_TOPIC` (siskopatuh + haramain/HHR +
kereta), keduanya tetap `unsupported-question`. Pengecualian diterapkan di loop
`HANDOFF_PATTERNS`: pola Raudhah dilewati bila `matchFaqTopic(pesan)` ===
`price-tasreh`. `TOPIK_VALID` di `geminiPemaham.ts` menerima kedua topik.
Tes: `classifyInbound.test.ts` (kasus pengecualian) dan
`indicativePricing.test.ts` (dua pesan tasreh diajawab tanpa handoff) hijau.
