# Harga Fotografi, Tasreh, dan Airport Handling CGK

Status: resolved

## Problem Statement

Tiga indikator harga berikut belum (atau sudah tidak) mencerminkan materi bisnis
terbaru:

1. **Fotografer/videografer.** Jawaban `price-photographer-videographer` masih
   memakai struktur dan label BOOKLET: "Low season" dan "High season". Materi
   foto terbaru
   `data/foto harga/WhatsApp Image 2026-10-12 at 13.54.15.md` memakai label
   **"Paket Spesial Ramadan"** (bukan high season) dan memuat rincian yang belum
   ada di jawaban: durasi per sesi, meeting point, Include/Exclude (transport
   tidak termasuk; teh, kurma & karpet opsional SAR 50), serta Add-on (overtime
   ba'da Maghrib SAR 100/jam, tambahan video edit SAR 300/video). Selain itu
   pertanyaan per lokasi ("berapa foto di Masjid Nabawi?") masih dijawab dengan
   seluruh tabel sekaligus.
2. **Tasreh.** Pengurusan tasreh (barcode izin masuk Raudhah) sudah ditawarkan
   admin dengan **IDR 300.000 per pax** (chat Cut Emelia dan Vira Arman), tetapi
   tidak punya topik: pertanyaan harganya jatuh ke handoff
   (`unsupported-question`) karena pesan hampir selalu menyebut "Raudhah" yang
   tercantum dalam pola `UNSUPPORTED_TOPIC`.
3. **Airport Handling.** Jawaban `price-airport-handling` masih memuat angka
   BOOKLET *Handling Bandara Jakarta IDR 350.000 per pax*, sementara chat admin
   (Vira Arman, 3 Okt 2026) menyebut *Handling bandara CGK IDR 300.000 per pax*.

## Solution

Ikuti resep perubahan indikator harga pada
`.scratch/catatan-sesi-harga-transportasi.md`: angka dikumpulkan ke modul data
verbatim, `faqAnswer(topik)` dibangun dari modul itu (materi = template),
`jawabanFaq()` menyaring per pesan, lalu diuji matcher dulu dan end-to-end
kemudian.

Prinsip yang dipertahankan (ADR-0004, ADR-0005, ADR-0008, ADR-0009):

- Angka hanya dari materi; tidak ada angka karangan. Jawaban dirender dari
  template manual sehingga lapis grounding `pengamanAngka` lolos konstruksi.
- Tetap "Harga Indikatif — bukan penawaran final", dengan penegasan angka dapat
  berubah setelah diperiksa admin. Tidak ada klaim harga final/ketersediaan/
  transaksi.
- Klasifikasi topik tidak berubah kecuali satu pengecualian sempit untuk
  pertanyaan harga tasreh (butir 3 Ruang Lingkup).

## Ruang Lingkup

1. **Modul data + matcher fotografi.** Modul baru `src/knowledge/fotoHarga.ts`:
   13 baris harga verbatim dari materi foto (8 baris reguler: Pelataran
   Masjidil Haram, Masjid Nabawi, Jabal Kudai & Khandama, Paket Al-Ula; 5 baris
   Paket Spesial Ramadan), label lokasi/id-en, rincian durasi, meeting point,
   serta catatan Include/Exclude/Add-on. Matcher deterministik per **lokasi**
   (Masjidil Haram, Masjid Nabawi, Jabal Kudai & Khandama, Al-Ula, akad/momen
   spesial), per **periode** (kata `ramadan/puasa` memilih Paket Spesial
   Ramadan), dan per **segmen** (couple/berdua vs keluarga; kamera profesional
   vs iPhone) — sejajar filter armada pada `price-transport`.
   `faqAnswer("price-photographer-videographer")` = `susunMateriFoto()` (seluruh
   baris) sehingga seluruh angka tetap ada di materi grounding.
2. **Topik tasreh.** `PriceTopic` baru `price-tasreh` (pola: kata harga +
   `tasreh`/`tasreg`) berangka **IDR 300.000 per pax**, plus entri non-harga
   `tasreh` agar pertanyaan non-angka tetap tercatat sebagai kebutuhan.
3. **Pengecualian Raudhah untuk harga tasreh.** Pola `UNSUPPORTED_TOPIC`
   dipecah: varian Raudhah/Nusuk dipisah menjadi pola sendiri agar pertanyaan
   **harga tasreh** tetap dijawab Harga Indikatif walau menyebut Raudhah.
   Pesan lain yang menyebut Raudhah/Nusuk tetap handoff; siskopatuh, kereta
   Haramain tetap handoff tanpa pengecualian.
4. **Airport Handling CGK.** *Handling Bandara Jakarta IDR 350.000 per pax*
   diganti *Handling Bandara CGK (keberangkatan dan kepulangan) IDR 300.000 per
   pax*. Dua baris Jeddah (SAR 300 dan SAR 900 per grup) tidak berubah.
5. **Registrasi & dokumen.** `TOPIK_VALID` (`geminiPemaham.ts`),
   `TOPIK_MATERI` (`tests/regresi/deteksiMisfire.ts`), daftar topik pada
   `tests/knowledge/businessFaq.test.ts`, kasus korpus baru, dan istilah
   **Tasreh** pada `CONTEXT.md`.

## Di Luar Lingkup

- Harga **siskopatuh** — angka berselisih antar chat (IDR 300.000 pada Evi N,
  IDR 350.000 pada Vira Arman); tetap handoff sampai pemilik memutuskan.
- Mengubah klasifikasi topik lain, alur intake kebutuhan, handoff, atau
  menampilkan nomor kontak admin/klaim "limited slot" pada jawaban.
- Menampilkan menu daftar lokasi tanpa angka — pertanyaan fotografer umum
  (tanpa lokasi) menjawab daftar harga lengkap (13 baris), berbeda dengan
  `price-transport` yang memakai menu (23 rute terlalu menumpuk).

## Keputusan Pemilik (2026-10-13)

1. **Fotografi.** Angka sudah sama dengan materi, jadi cukup **selaraskan label
   + lengkapi detail** (Paket Spesial Ramadan, durasi, meeting point,
   include/exclude, add-on), **dan** terapkan matcher per lokasi (resep penuh).
2. **Handling CGK.** Opsi (a): **IDR 300.000 menggantikan IDR 350.000** —
   harga memang sudah berubah dari BOOKLET, bukan konflik yang ditampilkan.
3. **Tasreh.** Buat **pengecualian khusus** pertanyaan harga tasreh agar tetap
   terjawab walaupun pesan menyebut Raudhah.

## Testing Decisions

- Unit matcher fotografi per kata kunci lokasi: setiap kata kunci memicu baris
  yang benar, angka lokasi lain tidak boleh bocor (assert `doesNotMatch`),
  termasuk kasus ramadan, segmen couple/family, dan lokasi tanpa baris reguler
  (akad → baris Ramadan).
- Unit `susunMateriFoto`: memuat ke-13 baris + rincian (durasi, meeting point,
  SAR 50/100/300) sebagai acuan grounding.
- Matcher tasreh: "berapa biaya tasreh raudhah?" → `price-tasreh`; "Raudhah itu
  apakah perlu pesan2?" dan "Berapa biaya siskopatuhnya?" tetap handoff.
- Test seam `handleInbound`: pertanyaan harga fotografi per lokasi hanya
  memuat baris lokasi itu; tasreh dijawab Harga Indikatif tanpa
  `hand-off-to-admin`; handling memuat `IDR 300.000` dan tidak lagi memuat
  `IDR 350.000`.
- Invarian jawaban tetap diuji: "Harga Indikatif", "bukan penawaran final",
  "dapat berubah ... setelah diperiksa admin", tanpa klaim harga
  final/ketersediaan/transaksi, setiap angka jawaban ada di materi.
- Regresi: `npm test`, `npm run typecheck`, `node scripts/probe-cakupan.ts`
  hijau; korpus `tests/korpus/topik-gap.json` (Raudhah/siskopatuh) tidak berubah
  perilaku.

## Catatan Implementasi

- Modul baru `src/knowledge/fotoHarga.ts` (data 13 baris + matcher + render),
  sejajar `transportRute.ts`. `jawabanFaq()` kini mendelegasikan dua topik:
  `price-transport` (per rute) dan `price-photographer-videographer` (per
  lokasi).
- Penambahan di luar rencana awal: kata `foto` ditambahkan ke kedua pola
  fotografi karena "Berapa harga foto di Masjid Nabawi?" sebelumnya tidak
  cocok topik mana pun dan jatuh ke handoff `custom-quote-or-availability` —
  tanpa itu matcher lokasi tidak akan pernah tercapai oleh frasa sehari-hari.
- `UNSUPPORTED_TOPIC` di `classifyInbound.ts` dipecah dua agar pengecualian
  tasreh tidak melebarkan cakupan ke siskopatuh/kereta Haramain.
- Verifikasi hijau: `npm test` (458 tes), `npm run typecheck`,
  `node scripts/probe-cakupan.ts` (121/121).

## Tiket

Lihat `issues/`:

1. `01-modul-foto-dan-matcher-lokasi.md` — `fotoHarga.ts` + seam `jawabanFaq`.
2. `02-topik-tasreh-dan-pengecualian-raudhah.md` — topik tasreh + pengecualian.
3. `03-handling-cgk-pengganti-jakarta.md` — ganti angka BOOKLET ke CGK.
4. `04-regresi-korpus-dan-dokumen.md` — perbarui/ tambah tes, korpus, CONTEXT.
