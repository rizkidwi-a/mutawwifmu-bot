# 09: Kenali varian ejaan dan pola pertanyaan yang didukung materi

**What to build:** Empat kasus transkrip nyata yang jelas didukung materi justru jatuh ke `handoff` (`unsupported-question`). Perbaiki pengenalan pola agar kasus berikut terjawab sebagai FAQ/Harga Indikatif:

1. **Varian ejaan nama layanan** — normalisasi sebelum pencocokan topik: `muthowif`/`mutthowif`/`Mutowwif` → `mutawwif`; sisakan toleransi serupa untuk `harramain`/`haramain` dan `siskopatuh`/`siskapatuh`. Contoh nyata: "kl kita mau tambah pakai muthawif itu biayanya berapa ?" dan "Mutowwif nya ini mendampingi dari awal proses umroh sampai selesai untuk kami bertiga kan mba harganya?" — keduanya harus `price-mutawwif`.
2. **Pertanyaan harga yang menyebut cakupan layanan, bukan kata "harga"** — "Jika tersedia, mohon nanti dapat diinfokan juga jasanya apa saja selain membimbing saat umroh, beserta tarifnya" sekarang terpicu `custom-quote-or-availability` oleh kata "tersedia"; inti pertanyaannya cakupan + tarif mutawwif → `mutawwif`/`price-mutawwif`.
3. **Detail dokumen tanpa kata kunci "visa"/"dokumen"** — "Paspor nya apakah halaman depan aja atau semuanya?" harus `visa-documents`.

**Blocked by:** none

**Status:** ready-for-agent

## Testing Decisions

- Empat kasus di atas (label `faq` di `tests/korpus/transkrip-nyata.json`) terklasifikasi `faq`/`indicative-price` dengan topik yang benar; bagian "KASUS GAGAL DIPAHAMI" untuk transkrip-nyata menjadi kosong.
- Kasus ejaan varian ditambahkan juga ke korpus (mis. "muthowif" dan "Mutowwif") agar regresi tertangkap `node scripts/probe-cakupan.ts`.
- Tidak ada regresi pada `tests/korpus/dasar.json` dan `npm test` tetap hijau.

## Comments

- Sumber analisis: `.scratch/pencocokan-korpus-transkrip/analisis.md` (bagian "Salah paham (harus faq, bot handoff)").
- Pasangan tiket 08: tiket ini menutup false-negative (pertanyaan terdukung yang lolos), tiket 08 menutup false-positive (pertanyaan tak terdukung yang dijawab).
