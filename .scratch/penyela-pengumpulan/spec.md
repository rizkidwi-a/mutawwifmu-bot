# Penyela Pengumpulan: Pertanyaan Menyela dan Perbaikan Bidang

Status: resolved

## Problem Statement

Dua perilaku pesan yang menyela alur Permintaan Tindak Lanjut belum tertangani:

1. **Pertanyaan menyela salah jadi jawaban bidang.** Saat bot sedang mengajukan
   pertanyaan, calon jemaah sering mengirim pesan pembuka pertanyaan seperti
   "ingin bertanya" atau "ada yang ingin ditanyakan". Pesan ini tidak selalu
   terdeteksi sebagai pertanyaan — "ada yang ingin ditanyakan" bahkan lolos
   sebagai *jawaban bidang* (mis. `Jumlah jemaah: ada yang ingin ditanyakan`),
   karena pola pertanyaan yang ada tidak mengenali frasa tersebut. Pesan begitu
   tidak boleh masuk ke bidang yang sedang dikumpulkan; harusnya tersimpan di
   bagian pertanyaan dan dibalas pengakuan bahwa pertanyaan akan dikonfirmasi
   admin.

2. **Tidak ada cara memperbaiki satu bidang.** Bila calon jemaah ingin menarik
   kembali jawaban tertentu — "hapus bagian tanggal", "jumlah jemaah hapus ya" —
   pesannya justru dikonsumsi sebagai jawaban bidang berikutnya atau catatan
   perubahan. Dibutuhkan mekanisme: kosongkan bidang yang disebut, minta ulang
   jawaban bidang itu saja, lalu kembali ke state sebelumnya (ringkasan +
   persetujuan, pengumpulan, atau pembaruan setelah ringkasan terkirim).

## Solution

1. **Pertanyaan menyela.** Kata kunci "ingin bertanya", "ada yang ingin
   ditanyakan", dan variannya ("mau bertanya", "ingin menanyakan", "ingin tanya",
   "mau nanya", EN: "want to ask", "have a question") dikenali sebagai niat
   bertanya. Saat bot sedang mengajukan pertanyaan atau menunggu konfirmasi,
   pesannya **tidak pernah mengisi bidang**; isinya disimpan apa adanya ke
   Bagian Pertanyaan (baris "Pertanyaan yang dicatat" pada Ringkasan Kebutuhan,
   `notedQuestions`) dan dibalas kira-kira: "Baik, akan saya simpan di bagian
   pertanyaan dan nanti dikonfirmasi admin." dilanjutkan prompt yang tertunda.
   State alur tidak berubah — pengumpulan/proses yang sedang berjalan
   dilanjutkan.
2. **Perbaikan bidang terarah.** Kata kerja koreksi ("hapus", "ganti", "ulang",
   "reset", "edit", "koreksi", "perbaiki", "salah") yang diikuti sebutan bidang
   ("bagian tanggal/periode", "jumlah jemaah", "layanan", "kebutuhan detail",
   "anggaran") memicu: bidang yang disebut dikosongkan, bot meminta ulang
   jawaban bidang itu saja ("Baik, bagian Tanggal/periode saya hapus. Silakan
   isi ulang:"), lalu setelah jawaban baru diterima bot kembali ke state
   sebelumnya — ringkasan yang diperbarui + persetujuan bila sebelumnya sedang
   konfirmasi, bidang berikutnya bila masih pengumpulan, atau alur PEMBARUAN
   bila ringkasan sudah terkirim.

## Ruang Lingkup

1. **Pertanyaan menyela saat bot menanyakan sesuatu** (state `collecting`,
   `awaiting-consent`, `awaiting-revision-consent`, `sent`):
   - Kata kunci "ingin bertanya", "ada yang ingin ditanyakan", dan varian yang
     disepakati; frasa negasi ("tidak ada yang ingin ditanyakan", "tidak ingin
     bertanya") tidak memicu.
   - Pesan tidak mengisi bidang mana pun; isinya masuk Bagian Pertanyaan
     (`notedQuestions`) dan muncul pada Ringkasan Kebutuhan.
   - Balasan: pengakuan kira-kira "Baik, akan saya simpan di bagian pertanyaan
     dan nanti dikonfirmasi admin." (ID/EN), dilanjutkan prompt yang tertunda
     (bidang yang sedang ditanya atau permintaan konfirmasi) — pola
     `balasanDenganPrompt` yang sudah ada.
   - State alur tidak berubah; pengumpulan yang sedang berjalan tetap lanjut.
2. **Pertanyaan menyela pada pesan pertama/percakapan idle tidak berubah:**
   "Halo, saya ingin bertanya tentang umrah" tetap membuka pengumpulan seperti
   perilaku sekarang (regresi wajib).
3. **Perbaikan bidang terarah** (berlaku pada state `collecting`,
   `awaiting-consent`, `sent`/`awaiting-revision-consent`):
   - Bidang yang disebut dikosongkan; satu bidang atau beberapa bidang sekaligus
     ("hapus bagian tanggal dan jumlah jemaah") diproses dalam urutan
     pengumpulan.
   - Bot meminta ulang jawaban hanya bidang tersebut, lalu **kembali ke state
     sebelumnya**: ringkasan yang diperbarui + konfirmasi, kelanjutan
     pengumpulan, atau alur PEMBARUAN (tiket 05) bila ringkasan sudah terkirim.
   - Pesan yang menyela proses ulang (basa-basi, pertanyaan menyela, pemicu
     mendesak) tetap ditangani lebih dulu, lalu kembali ke bidang yang sedang
     diulang.
   - Bidang yang belum terisi diakui singkat ("memang belum terisi") tanpa
     mengubah state.
4. **Prioritas penanganan** saat sebuah pesan cocok lebih dari satu pola:
   pemicu mendesak (handoff manusia/darurat/perjalanan aktif) > pertanyaan
   menyela berkata kunci > perbaikan bidang > perilaku lama. Kata kunci
   pertanyaan diutamakan atas perbaikan bidang karena "ingin bertanya, bisa
   hapus bagian tanggal?" adalah pertanyaan, bukan perintah.

## Di Luar Lingkup

- Reset seluruh draft ("hapus semua", "ulang dari awal").
- Penafsiran atau parafrase isi jawaban — nilai bidang tetap disimpan apa adanya
  (invarian ADR "apa adanya" tidak berubah).
- Perubahan pada klasifikasi `classifyInbound`, materi FAQ, atau Harga
  Indikatif.
- Perubahan format pesan ke admin (Ringkasan Kebutuhan tetap apa adanya).

## Keputusan Pemilik (2026-10-10)

1. **Tujuan "intake baru" untuk pertanyaan menyela:** (a) masuk Bagian
   Pertanyaan pada Permintaan Tindak Lanjut yang sama — pertanyaan terkirim
   bersama Ringkasan Kebutuhan dan dikonfirmasi admin saat menindaklanjuti.
2. **Kata kunci polos tanpa isi pertanyaan:** (b) balas "silakan sampaikan
   pertanyaannya", tangkap pesan berikutnya sebagai pertanyaan, lalu kembali
   ke state sebelumnya.
3. **Isi pertanyaan disimpan verbatim utuh**, termasuk frasa pembuka —
   konsisten dengan aturan "apa adanya".
4. **Jangkauan kata kunci:** hanya saat state non-idle (bot sedang menanyakan
   sesuatu / menunggu konfirmasi). Pesan pembuka pertama tetap membuka
   pengumpulan.
5. **Perbaikan bidang setelah ringkasan terkirim:** nilai bidang diedit
   langsung lalu masuk alur PEMBARUAN — bukan catatan perubahan. Beberapa
   bidang dalam satu pesan didukung; bidang yang belum terisi diakui singkat
   tanpa mengubah state.

## Testing Decisions

- Seam tetap `handleInbound(message, context)`, murni; state diturunkan dari
  riwayat percakapan. State baru untuk ulang jawaban harus turun dari fold
  riwayat — pola `resume` seperti `awaiting-handoff-consent` sudah menjadi
  preseden.
- Invarian yang dipertahankan: pesan menyela tidak pernah mengisi bidang;
  nilai bidang verbatim; tanpa klaim harga final; tanpa janji ketersediaan atau
  waktu balasan admin.
- Pertanyaan Harga Indikatif tetap dijawab dari materi walau memuat kata kunci
  penyela (mis. "mau tanya, berapa harga fotografer?") — tidak masuk Bagian
  Pertanyaan.
- Sebutan bidang pada perbaikan sengaja tidak mencakup nama layanan (hotel,
  transport) dan kata "harga"; pesan seperti "mau ganti hotel ..." tetap
  diperlakukan sebagai informasi/kebutuhan (kasus misfire historis dijaga
  `tests/conversation/perbaikanBidang.test.ts`).
- Regresi: seluruh suite existing tetap hijau — khususnya
  `tests/conversation/pesanSela.test.ts` (invarian tiket 06),
  `tests/conversation/intakeSebagaiAlurUtama.test.ts` (pembuka intake), dan
  dialog nyata `data/` (`tests/regresi`).

## Referensi

- `src/conversation/handleInbound.ts` — state machine (`FlowState`,
  `nextState`, `fillNextField`, `promptForNextField`, `catatPertanyaan`,
  `balasanDenganPrompt`).
- `src/conversation/classifyInbound.ts` — pola pertanyaan (`PERTANYAAN`,
  `BENTUK_TANYA_SEHARI_HARI`) yang saat ini tidak mengenali frasa penyela.
- `docs/adr/0009-fokus-intake-kebutuhan.md` — pertanyaan non-harga dicatat apa
  adanya dan dibawa ke admin.
- `.scratch/lead-intake/spec.md` + tiket 05 (pembaruan setelah handoff) dan
  tiket 06 (pesan sela) — perilaku yang menjadi dasar.
- Tiket: `01-pertanyaan-menyela-kata-kunci.md`, `02-hapus-bidang-dan-ulang-jawaban.md`,
  `03-istilah-dan-adr-penyela.md`.
