# 02 — Jawaban Per-Rute dan Klarifikasi

Status: resolved

What to build:
- Seam render baru `jawabanFaq(topik, pesan, bahasa)` di `businessFaq.ts`:
  untuk `price-transport` susun jawaban hanya dari rute terpicu (nama rute +
  harga per armada + disclaimer Harga Indikatif); topik lain delegasi ke
  `faqAnswer()`.
- `faqAnswer("price-transport")` memuat seluruh 23 rute sebagai materi acuan
  grounding `pengamanAngka` (tetap lolos `semuaAngkaAdaDiMateri`).
- Ganti pemanggilan `faqAnswer(routing.topic, language)` di
  `handleInbound.ts` (4 titik) menjadi `jawabanFaq(..., text, ...)`.
- Perilaku: 1–2 rute terpicu → baris rute lengkap; 0 atau ≥3 rute → balasan
  klarifikasi (kandidat rute tanpa tumpukan angka, minta tujuan spesifik),
  tetap `record-faq-answer` topik `price-transport`, bukan handoff.
- Filter armada: bila pertanyaan menyebut armada (Camry/Sonata, Staria, GMC,
  Hiace, Coaster, Bus), tampilkan hanya kolom armada tersebut.

Blocked by: 01

Catatan: pastikan jawaban tetap memuat "Harga Indikatif", "bukan penawaran
final", dan "dapat berubah setelah diperiksa admin" (id/en).

## Comments

Selesai (2026-10-13): `jawabanFaq()` di `businessFaq.ts`; `handleInbound`
memakainya di 3 titik. Materi `faqAnswer("price-transport")` dihasilkan dari
data rute (`susunMateriTransport`). Perilaku: 1+ rute terpicu → baris rute
(keputusan pemilik: tampilkan rute yang memungkinkan); 0 rute → menu daftar
rute. Filter armada aktif bila armada disebut. Tambahan kecil: pola
`price-city-tour` diberi penolak `TANPA_KATA_TRANSPORT`.
