# 02: Hapus bagian spesifik dan ulang jawabannya

**What to build:** Mekanisme perbaikan bidang terarah: saat calon jemaah
menyebut koreksi atas bagian tertentu — "hapus bagian tanggal", "jumlah jemaah
hapus ya", "ganti bagian anggaran", "kebutuhan detail salah" — bot
mengosongkan bidang yang disebut (mapping sebutan → bidang `FollowUpDraft`:
layanan → `interestedServices`, tanggal/periode/jadwal → `travelDateOrPeriod`,
jumlah jemaah → `travellerCount`, kebutuhan detail/rincian → `detailedNeeds`,
anggaran/budget → `budgetRange`), meminta ulang jawaban bidang itu saja
("Baik, bagian Tanggal/periode saya hapus. Silakan isi ulang:" + prompt bidang
tersebut, ID/EN), lalu setelah jawaban baru diterima **kembali ke state
sebelumnya**: ringkasan yang diperbarui + permintaan konfirmasi bila
sebelumnya `awaiting-consent`; bidang berikutnya bila masih `collecting`; alur
PEMBARUAN (tiket 05) bila ringkasan sudah terkirim
(`sent`/`awaiting-revision-consent`). Boleh lebih dari satu bidang dalam satu
pesan ("hapus bagian tanggal dan jumlah jemaah") — diulang dalam urutan
pengumpulan. Pesan menyela selama proses ulang (basa-basi, pertanyaan menyela
tiket 01, pemicu mendesak) ditangani lebih dulu lalu kembali ke bidang yang
sedang diulang; pesan lain dianggap jawaban baru bidang tersebut. Bidang yang
belum terisi diakui singkat tanpa mengubah state.

Catatan implementasi (usulan, tidak mengikat):
- State baru mis. `reasking-field { bidang, resume, draft }` di `FlowState`,
  diturunkan murni dari fold riwayat di `nextState` (pola `resume` pada
  `awaiting-handoff-consent`); `step` memilih balasan dari state tersebut.
- Perbaikan bidang mengubah nilai bidang langsung (bukan `changeNotes`) —
  konsisten dengan aturan "apa adanya"; pengiriman ulang setelah `sent` tetap
  berpenanda "PEMBARUAN" sehingga riwayat di kanal admin tidak tertimpa.
- Pola detektor: kata kerja koreksi (hapus/ganti/ulang/reset/edit/koreksi/
  perbaiki/salah) + sebutan bidang, dengan "bagian" opsional; EN setara.

**Blocked by:** —

**Status:** resolved

- [x] Keputusan terbuka spec nomor 5 dikonfirmasi pemilik (kebijakan multi
      bidang dan bidang belum terisi).
- [x] "hapus bagian tanggal" saat menunggu persetujuan → bidang dikosongkan,
      bot meminta ulang tanggal, lalu ringkasan yang diperbarui + konfirmasi
      ditampilkan lagi; persetujuan menghasilkan permintaan dengan nilai baru.
- [x] Koreksi saat `collecting` → bidang diulang lalu pengumpulan berlanjut ke
      bidang berikutnya (bukan memulai ulang dari awal).
- [x] Koreksi setelah ringkasan terkirim → nilai diperbarui + alur PEMBARUAN
      (tiket 05); pengiriman ulang hanya setelah persetujuan.
- [x] Beberapa bidang dalam satu pesan diulang dalam urutan pengumpulan.
- [x] Bidang yang belum terisi diakui singkat tanpa mengubah state.
- [x] Penyela selama proses ulang (basa-basi / pertanyaan menyela / pemicu
      mendesak) ditangani lebih dulu dan tidak membatalkan bidang yang sedang
      diulang.
- [x] Pesan yang bukan perbaikan bidang (mis. "hapus ya" tanpa sebutan bidang)
      tidak memicu perilaku ini.
- [x] Tes baru di `tests/conversation/` (`perbaikanBidang.test.ts`) mencakup
      tiga state awal (collecting, awaiting-consent, sent), multi-bidang, dan
      interupsi selama ulang.
- [x] `npm test` dan `npm run typecheck` hijau.

## Comments

### Implementasi (sesi 2026-10-10)

State baru `reasking-field { draft, sisa, resume }` di `FlowState` + detektor
`deteksiPerbaikanBidang` di `src/conversation/penyelaPengumpulan.ts`. Sebutan
bidang sengaja tidak mencakup nama layanan (hotel, transport) dan kata "harga"
agar kasus misfire historis ("mau ganti hotel ..." dari `.scratch/
eval-classify.txt`) tidak salah jadi perbaikan — dijaga sebagai tes regresi.
Negasi ("jangan hapus", "tidak usah hapus", "tidak salah") tidak memicu;
pesanan "ya, hapus bagian tanggal" lebih dulu ditangani sebagai perbaikan
bidang, bukan persetujuan pengiriman.
