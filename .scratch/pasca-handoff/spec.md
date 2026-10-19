# Pasca-Handoff: Menu Lanjutan dan Ulangi Percakapan

Status: resolved

## Problem Statement

Setelah Ringkasan Kebutuhan diteruskan ke admin (state `sent`), bot kehilangan
jalan keluar untuk pesan berikutnya:

- Pesan basa-basi ("halo", "terima kasih", "assalamualaikum") hanya dibalas
  `"Terima kasih atas pesan Anda."` tanpa langkah lanjutan
  (`promptSetelahBasaBasi("sent") === ""`) dan state tidak pernah maju — terasa
  seperti loop tak berujung. Ini ditemukan pada transkrip nyata
  (`data/transkrip-percakapan.csv`, nomor `6285275258899`) dan direproduksi di
  `.scratch/pasca-handoff/debug.md`.
- Tidak ada cara menyalakan ulang percakapan dari awal; pesan seperti
  "ulangi percakapan" justru dicatat sebagai *Perubahan* kebutuhan lalu meminta
  persetujuan kirim ulang.
- Kemampuan memperbarui bagian tertentu ("ubah jumlah jemaah") sudah ada lewat
  Perbaikan Bidang, tetapi tidak terlihat oleh calon jemaah karena tidak pernah
  disebut setelah ringkasan terkirim.

Pelaporan pemilik: setelah konfirmasi ke admin — termasuk setelah nomor
di-`#jeda` lalu di-`#lanjut` — bot seharusnya selalu menawarkan pilihan untuk
mengulang percakapan atau memperbarui kebutuhan spesifik lewat kata kunci.
`#jeda`/`#lanjut` sendiri bukan penyebab (debug.md), tetapi memperjelas cacat
ini karena state `sent` yang macet bertahan melewati jeda.

## Solution

Tambahkan **perilaku pasca-handoff** pada seam `handleInbound` (state tetap
diturunkan dari riwayat, tanpa perubahan kontrak `BotTurn`):

1. **Menu Lanjutan pasca-handoff.** Saat state `sent` dan pesan tidak cocok
   penanganan spesifik (basa-basi/pesan tak dikenali), bot membalas Menu
   Lanjutan yang menyebut bagian yang dapat diperbarui beserta contoh kata
   kuncinya dan cara mengulang percakapan. Pesan ini **tidak** dicatat sebagai
   Perubahan/pertanyaan — "halo" tidak boleh mengotori Ringkasan Kebutuhan.
2. **Ulangi Percakapan.** Kata kunci mengulang ("ulangi", "mulai dari awal",
   "dari awal", "reset", "restart", "percakapan baru", "chat baru", "start
   over") pada state pasca-handoff mengembalikan alur ke awal: balasan adalah
   pembuka layanan + menu tujuan, dan pesan berikutnya diproses sebagai
   percakapan baru (menu tujuan → intake baru dengan draft kosong).
3. **Penolakan pengiriman ulang memberi jalan.** Balasan penolakan pada state
   `awaiting-revision-consent` diikuti Menu Lanjutan.

Kemampuan Perbaikan Bidang yang sudah ada ("ubah jumlah jemaah", "hapus bagian
tanggal") **dipakai apa adanya** dan cukup diumumkan lewat Menu Lanjutan. Tidak
ada perubahan pada deteksi bidang agar tidak menambah misfire; pembaruan
spesifik tetap memakai kata kerja koreksi + sebutan bidang.

## Ruang Lingkup

1. **State pasca-handoff** adalah `sent` dan `awaiting-revision-consent`
   (Ringkasan Kebutuhan sudah terkirim).
2. **Menu Lanjutan** (ID/EN) ditampilkan pada state `sent` untuk pesan
   basa-basi atau pesan yang tidak dikenali sebagai pembaruan/pertanyaan
   spesifik. Isinya: daftar bagian yang dapat diperbarui (layanan yang
   diminati, tanggal/periode, jumlah jemaah, kebutuhan detail) dengan contoh
   "ubah jumlah jemaah", dan ajakan mengulang percakapan dengan "ulangi".
   Pesan pemicunya tidak mengubah draft.
3. **Ulangi Percakapan** berlaku pada `sent` dan `awaiting-revision-consent`;
   balasan memuat menu tujuan (pembuka yang disetujui) sehingga pemutaran
   riwayat berikutnya memulai percakapan baru. Riwayat lama tetap ada di
   transkrip; draft Permintaan Tindak Lanjut baru dimulai dari kosong.
4. **Penolakan pengiriman ulang** pada `awaiting-revision-consent` membalas
   penolakan + Menu Lanjutan; draft perubahan tetap tersimpan (invarian tiket
   05 lead-intake tidak berubah).
5. **Prioritas penanganan** pasca-handoff tetap: pemicu mendesak > pertanyaan
   menyela > perbaikan bidang > pertanyaan Harga Indikatif > ulangi percakapan
   > menu lanjutan/perubahan kebutuhan biasa. "ulangi" tidak boleh memakan
   pesan perbaikan bidang ("ulangi bagian tanggal" tetap Perbaikan Bidang).

## Di Luar Lingkup

- State `admin-routed` (vendor/mitra, tim internal, keperluan lain) — memang
  ditangani admin; balasan singkat apa adanya tidak diubah.
- Mengubah deteksi Perbaikan Bidang atau menambah pengenalan bidang tanpa kata
  kerja koreksi.
- Reset draft di tengah pengumpulan sebelum ringkasan terkirim (tetap di luar
  lingkup seperti keputusan `.scratch/penyela-pengumpulan`).
- Perubahan format pesan admin, materi FAQ, klasifikasi `classifyInbound`, atau
  state jeda.

## Testing Decisions

- Seam tetap `handleInbound(message, context)` dan murni; tidak ada state baru
  yang perlu ditambahkan ke `FlowState` — "ulangi" memanfaatkan aturan menu
  tujuan yang sudah ada (assistant turn yang memuat menu tujuan mereset state
  ke `idle` + menunggu pilihan tujuan).
- Invarian: pesan pasca-handoff tidak pernah menghapus nilai bidang;
  `changeNotes` tetap apa adanya; tanpa klaim harga final; tanpa janji waktu
  balasan admin; Ringkasan Kebutuhan bebas placeholder internal.
- Tes baru `tests/conversation/pascaHandoff.test.ts` mencakup: menu lanjutan
  untuk basa-basi berulang (tidak macet), ulangi percakapan dari awal (draft
  kosong, bukan ringkasan lama), penolakan pengiriman ulang diikuti menu,
  perbaikan bidang tetap bekerja, dan varian EN.
- Regresi dari transkrip nyata: urutan `halo` → `tidak` → `halo` pada
  `tests/regresi`/`tests/conversation` tidak lagi menghasilkan `BASA_BASI`
  telanjang.
- Seluruh suite existing tetap hijau (`npm test`, `npm run typecheck`).

## Referensi

- `.scratch/pasca-handoff/debug.md` — root cause dan bukti transkrip.
- `.scratch/lead-intake/spec.md` + tiket 05 — pembaruan setelah ringkasan
  terkirim (mode `sent`/`awaiting-revision-consent`).
- `.scratch/penyela-pengumpulan/spec.md` — Perbaikan Bidang dan catatan
  "reset seluruh draft" yang kini dibuka khusus pasca-handoff.
- `docs/adr/0012-penyela-pengumpulan.md`, `docs/adr/0011-jeda-dan-ambil-alih-admin.md`,
  `docs/adr/0009-fokus-intake-kebutuhan.md`.
- `src/conversation/handleInbound.ts` — `step`, `nextState`,
  `promptSetelahBasaBasi`, `openingReply`, `containsPurposeMenu`.
