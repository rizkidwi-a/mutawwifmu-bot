# 08: Redam over-faq — pertanyaan di luar materi wajib jatuh ke handoff

**What to build:** Persempit pola kecocokan pada `classifyInbound`/`matchFaqTopic` agar pesan yang layak diteruskan ke admin tidak diklasifikasi `faq`. Pada transkrip nyata (54 kasus di `tests/korpus/transkrip-nyata.json`) 12 pesan yang jelas `handoff` justru diklasifikasi `faq` — bot menjawab di luar materi, padahal ADR-0009 mensyaratkan pertanyaan tanpa materi dicatat sebagai kebutuhan dan diteruskan ke admin. Kelompok pola yang harus diperbaiki:

1. **Permintaan harga spesifik** — menyebut nama hotel/daftar item/tanggal: "tolong di check gak yaa untuk harganya: 13-20 Januari - Jumeirah Jabal Omar ..." (saat ini `faq/hotel-accommodation`).
2. **Selisih/upgrade harga** — "kalo upgrade ke staria, tambahannya brp?" (saat ini `faq/transport-fleet`; angka delta tidak tercantum materi → handoff per ADR-0005).
3. **Timing & ketersediaan** — "visa nya gpp h-1 bulan? apakah kekejar?", "berapa bulan sebelum berangkat harus submit utk visa?" (saat ini `faq/visa-documents`).
4. **Permintaan include/penambahan layanan ke penawaran** — "apakah bisa include dibantu di airportnya untuk bagasi, air zam-zam, dll?" (saat ini `faq/airport-handling`).
5. **Kebijakan/proses di luar materi** — "abis visa keluar masi bisa ganti hotel gak yah?", "handle hotel apa kak yang cepet approvalnya?", "raudhah itu apakah perlu pesan2 gitu?" (saat ini `faq/visa-documents` / `faq/hotel-accommodation`).
6. **Topik tanpa materi** — asuransi ("ada asuransi perjalanannya ga ya?" saat ini `faq/visa-documents`), kereta Haramain ("harramain train itu sbnrnya on-time banget ga yah?" saat ini `faq/airport-handling`), kerjasama/kolaborasi pihak ketiga ("ada kerjasama dengan jago syariah ya?" saat ini `faq/mutawwif`).

**Blocked by:** none

**Status:** resolved

## Testing Decisions

- Seluruh 22 kasus berlabel `handoff` di `tests/korpus/transkrip-nyata.json` terklasifikasi `handoff`; tidak ada lagi entri transkrip-nyata pada bagian "KASUS GAGAL DIPAHAMI" yang disebabkan over-faq.
- Tidak ada regresi pada `tests/korpus/dasar.json` (rute tepat baseline ≥ 32/41) dan `npm test` tetap hijau.
- Jalankan `node scripts/probe-cakupan.ts` sebelum dan sesudah perubahan untuk membandingkan angka.

## Comments

- Sumber analisis: `.scratch/pencocokan-korpus-transkrip/analisis.md` (bagian "16 selisih rute" dan tabel gap).
- Prioritas tertinggi di antara tiket hasil analisis transkrip: dampaknya bot menjawab pertanyaan yang tidak didukung materi, bukan sekadar melewatkan pertanyaan.

### Implementasi (sesi 2026-10-10)

Klasifikasi disempitkan di `src/conversation/classifyInbound.ts` dengan kelompok pola baru
yang diperiksa **sebelum** `matchFaqTopic` (semuanya berujung handoff):

| Kelompok tiket | Pola | Alasan handoff |
| --- | --- | --- |
| 1. Harga spesifik | `tolong/tlg/minta ... check/cek/carikan/hitungkan` | `custom-quote-or-availability` |
| 2. Selisih/upgrade | `upgrade`, `selisih`, `tambahan(nya)` | `custom-quote-or-availability` |
| 3. Timing & ketersediaan | `h-1`, `berapa bulan/minggu/hari/jam`, `kekejar`, `sebelum berangkat` | `unsupported-question` |
| 4. Include ke penawaran | `bisa/apakah ... include`, `include ... dibantu/dll` | `custom-quote-or-availability` |
| 5. Kebijakan/proses | `approval(nya)`, `abis/setelah visa keluar ... ganti hotel`, Raudhah, Nusuk, kereta Haramain/HHR | `unsupported-question` |
| 6a. Kerjasama pihak ketiga | `kerjasama`, `kolaborasi`, `influencer` | `agency-or-corporate` |
| 6b. Ketersediaan asuransi | `ada/menyediakan ... asuransi` | `custom-quote-or-availability` |

Catatan penyempitan: `tambahan(nya)` (bukan `tambah`) agar permintaan menambah layanan yang
ada materinya tetap ke jalur materi; penggantian hotel hanya ditangkap bila berbentuk
pertanyaan (`masi bisa ganti hotel`) agar pernyataan perubahan hotel tidak ikut ke handoff;
`kereta gantung` dikecualikan karena rinciannya ada di materi city tour Thaif; pertanyaan
biaya asuransi tetap dijawab sebagai Harga Indikatif.

Verifikasi:

- `node scripts/probe-cakupan.ts`: rute tepat 70/95 (74%) → **82/95 (86%)**;
transkrip-nyata 38/54 → **50/54** — seluruh 22 kasus berlabel `handoff` kini `handoff`.
`dasar.json` tidak berubah (32/41).
- `npm test` hijau: 266 tes, 265 lulus, 1 `todo` tersisa (kriteria tiket 09).
- Kriteria tiket ini di `tests/regresi/regresiDialogNyata.test.ts` dilepas dari `todo` dan
dijaga sebagai tes biasa; 12 pesan over-faq menjadi tes di
`tests/conversation/classifyInbound.test.ts`, lengkap dengan penjaga agar pertanyaan yang
didukung materi tidak ikut tertarik ke handoff.
