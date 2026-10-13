# 01 — Data Rute dan Matcher Kata Kunci

Status: resolved

What to build:
- Modul baru `src/knowledge/transportRute.ts` berisi data 23 rute dari
  `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`
  (id, label id/en, alias kata kunci, 6 harga armada verbatim).
- Fungsi `cocokkanRuteTransport(pesan): RuteTransport[]` yang deterministik:
  sadar arah (asal–tujuan), rute komposit didahulukan, memakai
  `normalkanVarianEjaan` dari `businessFaq.ts`.
- Unit test matcher di `tests/knowledge/transportRute.test.ts`: per kata kunci
  tujuan memicu tepat rute yang benar, tidak dobel, tidak salah arah.

Blocked by: keputusan terbuka pada spec (satuan harga belum diperlukan di tiket ini;
data harga disimpan sebagai string verbatim apa adanya).

Catatan: angka disimpan persis seperti tertulis di tabel sumber; normalisasi format
(pemisah ribuan) dilakukan saat render di tiket 02.

## Comments

Selesai (2026-10-13): `src/knowledge/transportRute.ts` berisi 23 rute +
`cocokkanRuteTransport` (sadar arah, atribut kota, penanda khusus eksklusif,
cakupan lokasi) + `deteksiArmada`. Tes: `tests/knowledge/transportRute.test.ts`.
