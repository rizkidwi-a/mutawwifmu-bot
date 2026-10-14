# Pertanyaan Harga Dijawab di Semua Fase Percakapan

Status: resolved

## Problem Statement

Pertanyaan harga ("kisaran harga ...", "harganya berapa?", "pricelist") sering
tidak dijawab bot di akhir percakapan atau setelah percakapan di-handoff ke
admin. Pada fase itu balasan bot berputar di sekitar `"Terima kasih atas pesan
Anda."` / `"Terima kasih, pertanyaan Anda saya catat..."`, sehingga pertanyaan
harga — termasuk yang angkanya justru tercantum materi — tidak pernah
memperoleh jawaban.

Root cause dan bukti repro lengkap: `.scratch/harga-di-semua-fase/debug.md`.
Ringkas: hanya `routing.kind === "indicative-price"` yang punya jalur jawaban
harga, dan jalur itu hanya ada di `collecting`/`reasking-field`/`sent`.
`admin-routed` menelan semua pesan dengan `BASA_BASI`; `awaiting-question` dan
`awaiting-consent` mencatat pertanyaan harga tanpa menjawabnya; pertanyaan harga
tanpa angka materi (yang terklasifikasi `handoff/custom-quote-or-availability`
atau `unsupported-question`) tidak pernah dijawab di fase mana pun.

Laporan pemilik: pertanyaan kisaran harga dan lainnya **masih harus dijawab
bot** meskipun percakapan sudah berada di bagian chat "Terima kasih atas pesan
Anda." — baik di akhir percakapan maupun setelah handoff ke admin.

## Solution

**Prinsip: setiap pertanyaan harga selalu memperoleh jawaban harga di semua
fase percakapan.** Jawaban mengikuti dua jalur yang sudah dikenal:

1. **Harga Indikatif** (angka tercantum materi) — template `jawabanFaq()`
   seperti biasa, ditambah tindakan `record-faq-answer`.
2. **Penawaran oleh tim** (angka/ketersediaan tidak tercantum materi) — jawaban
   baru `HARGA_KE_TIM` yang menyatakan materi belum memuat kepastian
   harga/ketersediaan dan penawaran khusus serta konfirmasinya ditangani tim
   customer service/penjualan. **Tanpa angka, tanpa klaim harga final, tanpa
   janji ketersediaan/waktu balasan** (invarian ADR-0005).

Implementasi di seam `handleInbound` (state tetap diturunkan dari riwayat):

1. **Detektor `isPertanyaanHarga(text, routing)`**: pesan bertanda pertanyaan
   (`isPertanyaan`) yang memuat kata penanda harga (`memuatKataHarga`) atau
   ber-routing `indicative-price`. Pemicu mendesak (`emergency`,
   `active-trip`, `human-request`) dan `booking-or-payment` dikecualikan —
   prioritas "pemicu mendesak > pertanyaan harga" (ADR-0014) tidak berubah.
   Pertanyaan meta ("Apa maksudnya dari kisaran anggaran?"), permintaan
   ketersediaan/penawaran tanpa kata harga, dan parafrase tanpa kata penanda
   tetap ke jalur catat-pertanyaan (batas pola ADR-0005).
2. **Kata penanda harga** (`PRICE_WORD` di `businessFaq.ts`) diperluas dengan
   `pricelist`/`price list`/`daftar harga` (varian nyata transkrip
   "apakah ada pricelistnya?") — sekaligus membuat pertanyaan pricelist
   bertopik materi terjawab sebagai Harga Indikatif.
3. **Semua fase menjawab pertanyaan harga**: `admin-routed` (menggantikan
   `BASA_BASI` untuk pesan harga saja), `sent`/`awaiting-revision-consent`,
   `awaiting-consent` (dijawab sebelum minta konfirmasi ulang),
   `awaiting-question` (isi pertanyaan berupa harga dijawab langsung),
   `collecting`/`reasking-field`/penyela (jawaban digabung sebelum lead yang
   berlaku), dan `awaiting-handoff-consent` (jawaban Harga Indikatif digabung
   dengan persetujuan handoff).

## Ruang Lingkup

1. **Jawaban Harga Indikatif tetap satu-satunya sumber angka**; tidak ada angka
   baru, tidak ada parafrase angka, tidak ada harga final.
2. **Pencatatan tidak berubah untuk pertanyaan harga tanpa materi**: tetap
   dicatat ke Bagian Pertanyaan dan ikut Ringkasan Kebutuhan (invarian tiket 10
   `topikGapHandoff`: pertanyaan yang butuh tindak lanjut admin tidak boleh
   hilang). Jawaban harga digabung di depan lead pencatatan yang berlaku, bukan
   menggantikannya.
3. **Pertanyaan harga yang dijawab dari materi tidak dicatat** sebagai
   pertanyaan/perubahan kebutuhan (invarian lama), kecuali perbaikan kecil pada
   `awaiting-consent` yang dulu justru mencatatnya — kini konsisten dengan
   `collecting`/`sent` dan dengan komentar kode ("pertanyaan non-harga yang
   menyela konfirmasi dicatat").
4. **Pertanyaan non-harga tidak berubah** (ADR-0009): tetap dicatat untuk
   admin; pada `admin-routed` tetap dibalas pengakuan singkat karena
   percakapan memang ditangani admin.
5. **Basa-basi, pernyataan bermuatan kata harga (bukan pertanyaan), Perbaikan
   Bidang, Ulangi Percakapan, dan pemicu mendesak tidak berubah**; prioritas
   penanganan ADR-0014 tetap: pemicu mendesak > pertanyaan menyela > perbaikan
   bidang > pertanyaan harga > ulangi percakapan > menu lanjutan/perubahan.

## Di Luar Lingkup

- Menjawab pertanyaan non-harga dari corpus (dengan sengaja dinonaktifkan
  ADR-0009).
- Menambah materi/angka harga baru (paket/land arrangement, pricelist umum,
  siskopatuh, dsb.) — tetap ditangani tim lewat jawaban `HARGA_KE_TIM`.
- Parafrase harga tanpa kata penanda (mis. "hotelnya berapa ya?") yang tetap
  jatuh ke jalur catat-pertanyaan — batas pola disengaja (ADR-0005) agar tidak
  ada jawaban yang meleset.
- Perubahan klasifikasi `classifyInbound`, materi `businessFaq` selain
  `PRICE_WORD`, kanal admin, dan state jeda.

## Testing Decisions

- Seam tetap `handleInbound(message, context)` dan murni.
- Tes baru `tests/conversation/pertanyaanHargaSemuaFase.test.ts` mencakup:
  `admin-routed` (menu 2/3/4 + agen) menjawab Harga Indikatif dan
  `HARGA_KE_TIM` (bukan `BASA_BASI`), `sent`/`awaiting-revision-consent`
  menjawab pertanyaan harga tanpa materi sambil tetap mencatat + meminta
  persetujuan pengiriman ulang, `awaiting-question` menjawab isi pertanyaan
  berupa harga, `awaiting-consent` menjawab harga sebelum minta konfirmasi
  (dan tidak mencatat yang bermateri), varian EN, serta invarian: tanpa angka
  baru, tanpa "harga final", tanpa janji ketersediaan.
- Regresi transkrip nyata: `apakah ada pricelistnya?` dijawab (bukan sekadar
  "saya catat"); `Apa maksudnya dari kisaran anggaran?` dan pernyataan
  bermuatan kata harga tetap bukan jawaban harga.
- Seluruh suite existing tetap hijau (`npm test`, `npm run typecheck`) —
  termasuk invarian `topikGapHandoff` (pertanyaan tanpa materi tetap tercatat
  dan sampai ke admin) dan `indicativePricing` (balasan tidak memuat
  `Harga Indikatif`/`SAR`/`IDR`/`Rp` bila bukan jawaban materi).

## Referensi

- `.scratch/harga-di-semua-fase/debug.md` — root cause dan tabel repro.
- `docs/adr/0005-harga-indikatif-penyempitan-pola-harga.md` — jalur Harga
  Indikatif dan batas pola harga.
- `docs/adr/0009-fokus-intake-kebutuhan.md` — pertanyaan non-harga dicatat.
- `docs/adr/0014-pasca-handoff-menu-lanjutan.md` — prioritas penanganan
  pasca-handoff dan status `admin-routed` yang kini dibuka untuk pertanyaan
  harga.
- `docs/adr/0015-pertanyaan-harga-di-semua-fase.md` — keputusan fitur ini.
