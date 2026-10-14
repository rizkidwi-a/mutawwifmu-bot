# 01 — Modul Foto dan Matcher per Lokasi

Status: resolved

What to build:
- Modul baru `src/knowledge/fotoHarga.ts` berisi 13 baris harga verbatim dari
  `data/foto harga/WhatsApp Image 2026-10-12 at 13.54.15.md`:
  - 8 baris reguler: Pelataran Masjidil Haram (600 / 1.000), Masjid Nabawi
    (500 / 800), Jabal Kudai & Khandama (500 / 750), Paket Al-Ula
    (1.250 kamera profesional / 900 kamera iPhone min. 15 Pro);
  - 5 baris **Paket Spesial Ramadan**: Jabal Kudai & Khandama 1.000, Masjid
    Nabawi 600, Masjidil Haram 750, Al Ula 4.500, Akad 1.250.
  Label bagian mengikuti sumber terbaru — **"Paket Spesial Ramadan"**, bukan
  "High season" (keputusan pemilik 1).
- Simpan angka sebagai digit polos (mis. `1000`, `4500`); format ribuan hanya
  saat render (id titik, en koma) seperti `transportRute.ts`.
- Rincian dari materi: durasi (1,5 jam/3 jam, 1 video), meeting point
  (Depan WC 3 / KFC Hilton Tower; Depan Pintu 333), catatan Include/Exclude
  (sudah termasuk foto & video profesional, 1 video edit, beberapa foto edit,
  file original; belum termasuk transportasi; teh kurma karpet opsional SAR 50),
  Add-on (overtime ba'da Maghrib SAR 100/jam, tambahan video edit SAR 300/video).
  Jangan menampilkan nomor kontak admin ataupun klaim "limited slot".
- `susunMateriFoto(bahasa)` — seluruh 13 baris + rincian + penutup; menjadi
  `faqAnswer("price-photographer-videographer")` (materi = template).
- `susunJawabanFoto(pesan, bahasa)` — hanya baris yang terpicu:
  - tanpa lokasi & tanpa kata ramadan → daftar lengkap 13 baris;
  - lokasi disebut → baris reguler lokasi itu; bila kosong (mis. akad) → baris
    Ramadan lokasi itu;
  - kata `ramadan/puasa` → baris Paket Spesial Ramadan (lokasi disebut → hanya
    lokasi itu);
  - segmen disebut (couple/berdua vs keluarga; kamera profesional vs iPhone) →
    hanya baris segmen itu, asalkan menyisakan minimal satu baris.
- Hook di `businessFaq.ts`: `jawabanFaq()` mendelegasikan
  `price-photographer-videographer` ke `susunJawabanFoto`; jawaban EN tetap EN.
- Unit test `tests/knowledge/fotoHarga.test.ts`.

Blocked by: —

Catatan: jawaban wajib memuat "Harga Indikatif", "bukan penawaran final",
"dapat berubah ... setelah diperiksa admin", dan satuan "SAR per sesi" (id) /
"SAR per session" (en).

## Comments

Selesai (2026-10-13): `src/knowledge/fotoHarga.ts` berisi 13 baris verbatim
(8 reguler + 5 Paket Spesial Ramadan), `susunMateriFoto()` menjadi
`faqAnswer("price-photographer-videographer")`, dan `jawabanFaq()`
mendelegasikan topik itu ke `susunJawabanFoto()`. Matcher per lokasi, periode
(`ramadan/puasa`), dan segmen; pertanyaan tanpa lokasi memakai daftar lengkap
(bukan menu). Penambahan ke luar rencana: kata `foto` masuk ke pola topik
fotografi karena "harga foto di Masjid Nabawi?" sebelumnya jatuh ke handoff.
Tes: `tests/knowledge/fotoHarga.test.ts` (9 tes) hijau.
