# 09: Kenali varian ejaan dan pola pertanyaan yang didukung materi

**What to build:** Empat kasus transkrip nyata yang jelas didukung materi justru jatuh ke `handoff` (`unsupported-question`). Perbaiki pengenalan pola agar kasus berikut terjawab sebagai FAQ/Harga Indikatif:

1. **Varian ejaan nama layanan** — normalisasi sebelum pencocokan topik: `muthowif`/`mutthowif`/`Mutowwif` → `mutawwif`; sisakan toleransi serupa untuk `harramain`/`haramain` dan `siskopatuh`/`siskapatuh`. Contoh nyata: "kl kita mau tambah pakai muthawif itu biayanya berapa ?" dan "Mutowwif nya ini mendampingi dari awal proses umroh sampai selesai untuk kami bertiga kan mba harganya?" — keduanya harus `price-mutawwif`.
2. **Pertanyaan harga yang menyebut cakupan layanan, bukan kata "harga"** — "Jika tersedia, mohon nanti dapat diinfokan juga jasanya apa saja selain membimbing saat umroh, beserta tarifnya" sekarang terpicu `custom-quote-or-availability` oleh kata "tersedia"; inti pertanyaannya cakupan + tarif mutawwif → `mutawwif`/`price-mutawwif`.
3. **Detail dokumen tanpa kata kunci "visa"/"dokumen"** — "Paspor nya apakah halaman depan aja atau semuanya?" harus `visa-documents`.

**Blocked by:** none

**Status:** resolved

## Testing Decisions

- Empat kasus di atas (label `faq` di `tests/korpus/transkrip-nyata.json`) terklasifikasi `faq`/`indicative-price` dengan topik yang benar; bagian "KASUS GAGAL DIPAHAMI" untuk transkrip-nyata menjadi kosong.
- Kasus ejaan varian ditambahkan juga ke korpus (mis. "muthowif" dan "Mutowwif") agar regresi tertangkap `node scripts/probe-cakupan.ts`.
- Tidak ada regresi pada `tests/korpus/dasar.json` dan `npm test` tetap hijau.

## Comments

- Sumber analisis: `.scratch/pencocokan-korpus-transkrip/analisis.md` (bagian "Salah paham (harus faq, bot handoff)").
- Pasangan tiket 08: tiket ini menutup false-negative (pertanyaan terdukung yang lolos), tiket 08 menutup false-positive (pertanyaan tak terdukung yang dijawab).

### Implementasi (sesi 2026-10-10)

- **Normalisasi varian ejaan** — `normalkanVarianEjaan` di `src/knowledge/businessFaq.ts`, dipanggil sekali di `classifyInbound` (seluruh pencocokan memakai pesan yang sudah dinormalkan) dan juga di `matchFaqTopic` agar pemanggil langsung tetap toleran:
  - `mutawwif`: mutawif/muthawwif/muthawif/muthowif/mutthowif/mutowwif/mutowif/mutawwifah;
  - `haramain`: haramain/harramain;
  - `siskopatuh`: siskopatuh/siskapatuh (termasuk bentuk `-nya`).
- **Kata harga berimbuhan `-nya`** (`harganya`, `biayanya`, `tarifnya`, `ongkosnya`) dikenali `PRICE_WORD` dan `CUSTOM_QUOTE_OR_AVAILABILITY`, sehingga pertanyaan harga mutawwif tidak lagi lolos ke handoff.
- **Cakupan layanan** — `membimbing` ikut menjadi penanda topik mutawwif, tetapi hanya bila dalam 30 karakter diikuti `ibadah`/`umroh`/`umrah` agar harga tour guide tidak terbaca sebagai harga mutawwif; `tersedia`/`available` yang didahului penanda syarat (`jika`/`kalau`/`kalo`/`bila`/`if`/`when`) tidak lagi memicu `custom-quote-or-availability`.
- **Topik tanpa materi** — `siskopatuh` masuk `UNSUPPORTED_TOPIC` bersama Raudhah/Nusuk/kereta Haramain; pola Haramain dan siskopatuh kini cukup memuat bentuk baku karena varian ejaan dinormalkan lebih dahulu. Sebagian kasus korpus varian ditulis tanpa tanda tanya agar hasilnya bergantung pada normalisasi, bukan heuristik pertanyaan.
- **Detail dokumen** — `paspor`/`passport` masuk topik `visa-documents`; permintaan penerbitan paspor (`mengurus`/`buat`/`arrange` paspor) tetap `unsupported-question`.
- **Korpus & tes** — berkas korpus baru `tests/korpus/varian-ejaan.json` (7 kasus ejaan varian), 4 kasus regresi di `tests/conversation/classifyInbound.test.ts`, kriteria tiket di `tests/regresi/regresiDialogNyata.test.ts` dilepas dari `todo`.

Verifikasi:

- `node scripts/probe-cakupan.ts`: rute tepat 102 kasus **93/102 (91%)**; `transkrip-nyata.json` 50/54 → **54/54** (bagian "KASUS GAGAL DIPAHAMI" tidak lagi memuat kasus transkrip); `typo` 6/6; `dasar.json` tetap 32/41.
- `npm test` hijau: 273 lulus, 0 gagal, 0 `todo`; `npm run typecheck` bersih.
