# 08: Redam over-faq — pertanyaan di luar materi wajib jatuh ke handoff

**What to build:** Persempit pola kecocokan pada `classifyInbound`/`matchFaqTopic` agar pesan yang layak diteruskan ke admin tidak diklasifikasi `faq`. Pada transkrip nyata (54 kasus di `tests/korpus/transkrip-nyata.json`) 12 pesan yang jelas `handoff` justru diklasifikasi `faq` — bot menjawab di luar materi, padahal ADR-0009 mensyaratkan pertanyaan tanpa materi dicatat sebagai kebutuhan dan diteruskan ke admin. Kelompok pola yang harus diperbaiki:

1. **Permintaan harga spesifik** — menyebut nama hotel/daftar item/tanggal: "tolong di check gak yaa untuk harganya: 13-20 Januari - Jumeirah Jabal Omar ..." (saat ini `faq/hotel-accommodation`).
2. **Selisih/upgrade harga** — "kalo upgrade ke staria, tambahannya brp?" (saat ini `faq/transport-fleet`; angka delta tidak tercantum materi → handoff per ADR-0005).
3. **Timing & ketersediaan** — "visa nya gpp h-1 bulan? apakah kekejar?", "berapa bulan sebelum berangkat harus submit utk visa?" (saat ini `faq/visa-documents`).
4. **Permintaan include/penambahan layanan ke penawaran** — "apakah bisa include dibantu di airportnya untuk bagasi, air zam-zam, dll?" (saat ini `faq/airport-handling`).
5. **Kebijakan/proses di luar materi** — "abis visa keluar masi bisa ganti hotel gak yah?", "handle hotel apa kak yang cepet approvalnya?", "raudhah itu apakah perlu pesan2 gitu?" (saat ini `faq/visa-documents` / `faq/hotel-accommodation`).
6. **Topik tanpa materi** — asuransi ("ada asuransi perjalanannya ga ya?" saat ini `faq/visa-documents`), kereta Haramain ("harramain train itu sbnrnya on-time banget ga yah?" saat ini `faq/airport-handling`), kerjasama/kolaborasi pihak ketiga ("ada kerjasama dengan jago syariah ya?" saat ini `faq/mutawwif`).

**Blocked by:** none

**Status:** ready-for-agent

## Testing Decisions

- Seluruh 22 kasus berlabel `handoff` di `tests/korpus/transkrip-nyata.json` terklasifikasi `handoff`; tidak ada lagi entri transkrip-nyata pada bagian "KASUS GAGAL DIPAHAMI" yang disebabkan over-faq.
- Tidak ada regresi pada `tests/korpus/dasar.json` (rute tepat baseline ≥ 32/41) dan `npm test` tetap hijau.
- Jalankan `node scripts/probe-cakupan.ts` sebelum dan sesudah perubahan untuk membandingkan angka.

## Comments

- Sumber analisis: `.scratch/pencocokan-korpus-transkrip/analisis.md` (bagian "16 selisih rute" dan tabel gap).
- Prioritas tertinggi di antara tiket hasil analisis transkrip: dampaknya bot menjawab pertanyaan yang tidak didukung materi, bukan sekadar melewatkan pertanyaan.
