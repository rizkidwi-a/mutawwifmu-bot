# 04 — Regresi dan Korpus

Status: resolved

What to build:
- Perbarui `tests/conversation/indicativePricing.test.ts` untuk perilaku baru
  (pertanyaan rute spesifik → hanya baris rute itu; angka baru tabel).
- Tambah kasus end-to-end: rute spesifik, arah balik, rute komposit (via Badar,
  PP Taif), ziarah (Makkah/Madinah, Ayesha/Jurana/Qarn Al Manzil), stasiun
  kereta, per jam, filter armada, bahasa Inggris, serta pesan tanpa tujuan →
  klarifikasi.
- Perbarui `tests/knowledge/businessFaq.test.ts` dan korpus
  `tests/korpus/dasar.json` ("ongkos transport selama disana berapa" →
  perilaku tanpa tujuan, tetap bukan handoff).
- Jalankan seluruh suite test (`npm test`) dan pastikan `tests/regresi`
  tetap hijau; tidak ada angka rute lain yang bocor ke jawaban rute terpicu.

## Comments

Selesai (2026-10-13): `tests/knowledge/transportRute.test.ts` (matcher per
kata kunci, filter armada, invarian, materi 23 rute) + 4 tes end-to-end baru di
`tests/conversation/indicativePricing.test.ts`; angka assert lama
(`SAR 500`/`SAR 1.650`) diperbarui ke tabel baru. Korpus `dasar.json` tidak
perlu diubah (ekspektasi klasifikasi tetap `price-transport`). Verifikasi:
`npm test` 407 lulus, `npm run typecheck` bersih, `probe-cakupan.ts` 108/108.

Blocked by: 02, 03
