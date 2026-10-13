# Catatan Sesi: Harga Transportasi Per Rute (2026-10-13)

Catatan kerja untuk sesi berikutnya. Keputusan lengkap ada di
`.scratch/harga-transportasi-per-rute/spec.md` + `issues/`; di sini hanya peta
kerja dan resep agar indikator harga berikutnya dapat diubah dengan jalur yang
sama tanpa menurunkan ulang desainnya dari nol.

## Apa yang sudah dikerjakan

Bot kini menjawab pertanyaan harga transportasi **per rute sesuai kata kunci
tujuan** pada pesan Calon Jemaah — bukan satu template berisi semua rute.
Angka memakai tabel `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`
(23 rute × 6 armada, **SAR per kendaraan/per grup**) yang menggantikan angka
BOOKLET sepenuhnya. Tiket 01–04 `resolved`; verifikasi hijau: `npm test` (407),
`npm run typecheck`, `node scripts/probe-cakupan.ts` (korpus 118/118).

## Peta kode jawaban harga

| Lokasi | Peran |
| --- | --- |
| `src/knowledge/transportRute.ts` | Data rute (angka verbatim), matcher kata kunci, render jawaban + materi |
| `src/knowledge/businessFaq.ts` | `ENTRIES` (pola topik + template), `faqAnswer()`, `jawabanFaq()` |
| `src/conversation/handleInbound.ts` | Runtime memanggil `jawabanFaq(topik, pesan, bahasa)` di 3 titik |
| `src/knowledge/pengamanAngka.ts` | Lapis grounding: setiap angka jawaban wajib ada di materi template |
| `tests/knowledge/transportRute.test.ts` | Tes matcher per kata kunci + render |
| `tests/conversation/indicativePricing.test.ts` | Tes end-to-end seam `handleInbound` |

Dua seam yang jangan tertukar:

- **`faqAnswer(topik, bahasa)`** = *materi lengkap* (seluruh rute/entri). Dipakai
  grounding `pengamanAngka` dan `classifyDenganFallback`. Angka jawaban yang
  boleh muncul di WhatsApp harus ada di sini.
- **`jawabanFaq(topik, pesan, bahasa)`** = *jawaban per pesan* (hasil filter
  matcher). Topik lain selain `price-transport` masih delegasi ke `faqAnswer`.

Klasifikasi (regex `classifyInbound` / LLM `geminiPemaham`) hanya memilih
**topik**; pemilihan baris/angka deterministik dari matcher, tidak dari LLM.

## Resep: mengubah indikator harga lain

Polai dari perubahan `price-transport` (butir 1–5 sudah terbukti hijau):

1. **Kumpulkan angka sumber** (materi bisnis `data/`/`*.md`) ke satu modul data
   di `src/knowledge/`. Simpan nilai **verbatim sebagai string**; format ribuan
   hanya saat render (id titik, en koma). Catat satuan persis seperti keputusan
   pemilik di `spec.md` — kalau materi bertentangan, tampilkan konfliknya
   (contoh: `price-hotel` memilih tidak menyebut angka sama sekali).
   *Selesai bila:* tidak ada angka di modul yang tidak terlacak ke sumber.
2. **Jadikan materi = template.** Jawaban penuh topik itu (`faqAnswer`) dibangun
   dari data modul (lihat `susunMateriTransport`) supaya grounding angka lolos
   konstruksi dan angka tidak duplikat di dua tempat.
   *Selesai bila:* `faqAnswer(topik)` memuat setiap angka yang bisa dirender.
3. **Tambah filter per pesan** di `jawabanFaq` (matcher kata kunci → baris yang
   tampil). Keputusan perilaku ambigu sudah baku: tampilkan **rute/entri yang
   memungkinkan** untuk kata kunci yang muncul; menu klarifikasi hanya bila
   tidak ada yang cocok.
   *Selesai bila:* pertanyaan spesifik hanya memuat entri yang ditanyakan
   (assert angka entri lain tidak ada di jawaban).
4. **Uji matcher dulu, end-to-end kemudian.** Unit per kata kunci di
   `tests/knowledge/`, lalu kasus seam di
   `tests/conversation/indicativePricing.test.ts` (termasuk bahasa Inggris,
   filter armada/parameter, dan kasus tanpa kata kunci → menu).
   *Selesai bila:* `npm test` + `npm run typecheck` + `node scripts/probe-cakupan.ts`
   hijau semua.
5. **Perbarui assert angka lama** di `tests/knowledge/businessFaq.test.ts` dan
   kasus korpus yang menyebut angka topik itu.

## Gotcha yang sudah ketemu (jangan diulang)

- Urutan `ENTRIES` = prioritas `matchFaqTopic`. `price-city-tour` kini memuat
  pola penolak `TANPA_KATA_TRANSPORT` agar "harga transport ziarah Makkah"
  jatuh ke topik transport, bukan paket city tour.
- Pesan harus memuat kata penanda harga (`PRICE_WORD`) **dan** kata penanda
  topik agar masuk jalur Harga Indikatif; selain itu tetap ke handoff
  (ADR-0005). Jangan melonggarkan ini untuk memaksa sebuah pertanyaan terjawab.
- Invarian jawaban harga (dites di `indicativePricing.test.ts`): "Harga
  Indikatif", "bukan penawaran final", "dapat berubah ... setelah diperiksa
  admin", tanpa klaim harga final/ketersediaan/transaksi.
- Akses indeks array kena `noUncheckedIndexedAccess` — pakai guard, bukan
  asumsi indeks ada (lihat perbaikan di `bagiSpan`).
