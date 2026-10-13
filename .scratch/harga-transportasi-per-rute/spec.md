# Harga Transportasi Per Rute: Jawaban Spesifik Sesuai Tujuan

Status: resolved

## Problem Statement

Pertanyaan "harga transportasi" saat ini selalu dijawab dengan satu template statis
(topik `price-transport` di `src/knowledge/businessFaq.ts`) yang menampilkan ringkasan
beberapa rute sekaligus. Calon Jemaah yang bertanya harga satu tujuan spesifik — misal
"berapa ongkos dari Jeddah airport ke hotel Makkah?" — tetap menerima tumpukan rute yang
tidak ditanyakan, sehingga jawaban terasa tidak relevan dan membingungkan.

Selain itu angka pada template lama berasal dari BOOKLET dan sudah tidak cocok dengan
tabel transport terbaru di
`data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`
(23 rute × 6 armada: Camry/Sonata 4 Seat, H1 Staria 7 Seat, GMC 7 Seat, Hiace 10 Seat,
Coaster 18 Seat, Bus 49 Seat). Contoh selisih: Jeddah Airport → Makkah Hotel Camry/Sonata
tercantum 400 pada tabel baru, sementara template lama menyebut "mulai SAR 500".

## Solution

Jadikan tabel transport terbaru sebagai satu-satunya sumber angka transportasi, dan buat
jawaban `price-transport` menjadi **kontekstual per rute**: deteksi tujuan dari kata kunci
pada pertanyaan Calon Jemaah (deterministik, regex — bukan LLM), lalu tampilkan **hanya
baris rute yang terpicu** beserta harga seluruh armada (atau armada yang disebut saja).

Prinsip yang dipertahankan (ADR-0004, ADR-0005, ADR-0008):

- Angka hanya dari materi; tidak ada angka karangan. Jawaban tetap dirender dari template
  manual sehingga lapis grounding `pengamanAngka` lolos secara konstruksi.
- Tetap "Harga Indikatif — bukan penawaran final", dengan penegasan angka dapat berubah
  setelah diperiksa admin. Tidak ada klaim harga final, janji ketersediaan, atau transaksi.
- Klasifikasi topik (`classifyInbound` / `geminiPemaham`) tidak berubah; yang berubah
  adalah cara jawaban topik `price-transport` dirender dari pesan.

## Ruang Lingkup

1. **Data rute.** Modul baru `src/knowledge/transportRute.ts`: 23 rute dari tabel terbaru,
   masing-masing berisi id, label id/en, alias kata kunci (mis. `jeddah airport`,
   `bandara jeddah`, `madinah`, `mekkah/makkah/mekah`, `taif/thaif`, `badar/badr`,
   `masjid aisyah`, `jurana`, `qarn al manzil`, `stasiun kereta/haramain`,
   `ziarat/ziarah`, `per jam`), serta 6 harga armada verbatim dari tabel.
2. **Pencocokan rute.** `cocokkanRuteTransport(pesan)` yang deterministik:
   - Sadar arah ("dari X ke Y" / "X to Y"): rute hanya cocok bila asal–tujuan sesuai.
   - Rute komposit didahulukan agar tidak dobel-match dengan rute bagiannya
     (mis. "via Badar" mengalahkan Makkah–Madinah biasa; "PP Taif dari Makkah"
     mengalahkan sekadar menyebut Taif).
   - Varian ejaan memakai `normalkanVarianEjaan` yang sudah ada.
3. **Jawaban per-rute.** `jawabanFaq(topik, pesan, bahasa)` sebagai seam render baru:
   untuk `price-transport`, susun jawaban hanya dari rute yang terpicu
   (nama rute + harga per armada + disclaimer Harga Indikatif); topik lain tetap
   `faqAnswer()` seperti biasa. `faqAnswer("price-transport")` tetap memuat **seluruh**
   23 rute sebagai "materi" acuan grounding (`materiGabunganDariTemplate`).
4. **Filter armada (sekunder).** Bila pertanyaan menyebut armada (Camry, Staria, GMC,
   Hiace, Coaster, Bus), tampilkan hanya kolom armada tersebut; selain itu tampilkan
   keenam armada.
5. **Perilaku ambigu / tanpa tujuan.**
   - 1–2 rute terpicu → tampilkan baris rute tersebut secara lengkap.
   - 0 rute atau ≥3 rute terpicu (mis. hanya "dari Jeddah") → balasan klarifikasi yang
     menyebut kandidat rute (tanpa tumpukan angka) dan meminta penyebutan tujuan
     spesifik. Masih tercatat sebagai `record-faq-answer` topik `price-transport`,
     bukan handoff.
6. **Pembaruan angka.** Ganti seluruh angka transportasi lama (BOOKLET) dengan angka
   tabel baru; format angka konsisten dengan jawaban lain (pemisah ribuan titik,
   mis. `SAR 1.550`) — normalisasi format saja, nilai verbatim dari tabel.

## Di Luar Lingkup

- Rute multi-kota dalam satu pertanyaan (mis. "Jeddah–Makkah–Madinah–Jeddah") — tetap
  memakai perilaku ambigu (klarifikasi) atau handoff bila bertanda penawaran.
- Menghitung kombinasi rute, diskon, harga per orang, atau konversi mata uang.
- Mengubah klasifikasi topik, alur intake kebutuhan, atau handoff.

## Keputusan Pemilik (2026-10-13)

1. **Satuan harga.** SAR per kendaraan (per grup). Dinyatakan apa adanya pada
   judul jawaban: "satuan SAR per kendaraan (per grup)".
2. **Angka baru = pengganti penuh.** Seluruh angka BOOKLET untuk topik
   `price-transport` diganti angka tabel 2026-10-12; frasa "mulai ... hingga
   ..." dihapus.
3. **Ambiguitas tujuan.** Tampilkan rute yang memungkinkan untuk tujuan yang
   mungkin (mis. "dari Jeddah" → semua rute berawal Jeddah). Menu daftar rute
   hanya bila tidak ada rute yang cocok (tanpa tujuan yang dikenali atau
   multi-kota yang tidak dapat dipaksakan ke satu rute).
4. **Baris generik "Hotel ...".** Ayesha/Jurana/Qarn Al Manzil berangkat dari
   hotel di Makkah; "Train Station" mengikuti konteks kota, dan "stasiun
   Madinah" dibaca sebagai stasiun di Madinah (kota = atribut, bukan ujung).

## Testing Decisions

- Unit test matcher per kata kunci: setiap kata kunci tujuan memicu tepat rute yang
  benar (tidak dobel, tidak salah arah), termasuk varian ejaan ("mekkah/mekah",
  "madinah/madinah", "thaif", "badar/badr", "haramain", "stasiun").
- Test render: hanya baris rute terpicu yang muncul; rute lain tidak boleh bocor ke
  jawaban (assert angka rute lain tidak ada).
- Invarian jawaban tetap diuji: memuat "Harga Indikatif", "bukan penawaran final",
  "dapat berubah ... setelah diperiksa admin"; tanpa klaim harga final/ketersediaan;
  setiap angka jawaban ada verbatim di materi (`semuaAngkaAdaDiMateri`).
- Test bahasa Inggris untuk padanan label rute dan disclaimer.
- Regresi: `tests/conversation/indicativePricing.test.ts`,
  `tests/knowledge/businessFaq.test.ts`, korpus `tests/korpus/dasar.json`
  ("ongkos transport selama disana berapa" → perilaku tanpa tujuan), dan
  `tests/regresi` tetap hijau.

## Catatan Implementasi

- Modul baru `src/knowledge/transportRute.ts` (data 23 rute + matcher
  deterministik + render). Seam render `jawabanFaq(topik, pesan, bahasa)` di
  `businessFaq.ts`; `handleInbound` memakai seam tersebut (3 titik pemanggilan).
- Penambahan di luar rencana awal: pola `price-city-tour` mendapat penolak
  `TANPA_KATA_TRANSPORT` sehingga "harga transport ziarah Makkah" jatuh ke
  topik transport (rute Ziarah Makkah pada tabel), bukan paket city tour.
- Verifikasi: `npm test` (407 tes), `npm run typecheck`, dan
  `node scripts/probe-cakupan.ts` (korpus 108/108) hijau.

## Tiket

Lihat `issues/`:

1. `01-data-rute-dan-matcher.md` — modul `transportRute.ts` + test matcher.
2. `02-jawaban-per-rute-dan-klarifikasi.md` — seam `jawabanFaq`, template baru,
   perilaku ambigu, filter armada.
3. `03-pembaruan-angka-dan-satuan.md` — ganti angka lama + satuan terkonfirmasi.
4. `04-regresi-dan-korpus.md` — perbarui/ tambah test end-to-end dan korpus.
