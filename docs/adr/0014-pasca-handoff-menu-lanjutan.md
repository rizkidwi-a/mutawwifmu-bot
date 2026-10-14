# ADR-0014: Menu Lanjutan dan Ulangi Percakapan Pasca-Handoff

Status: accepted

## Konteks

Setelah Ringkasan Kebutuhan diteruskan ke admin (state `sent`), bot tidak punya
langkah lanjutan untuk pesan yang tidak dikenali sebagai pembaruan kebutuhan.
`promptSetelahBasaBasi("sent")` mengembalikan string kosong, sehingga basa-basi
("halo", "terima kasih") hanya dibalas `"Terima kasih atas pesan Anda."` dan
state tidak pernah maju.

Transkrip nyata nomor `6285275258899` (`data/transkrip-percakapan.csv`):

```
21:41:28 jemaah: tidak            -> pengiriman ulang ditolak (state kembali "sent")
21:46:37 jemaah: halo             -> "Terima kasih atas pesan Anda."
```

Reproduksi seam dan analisis lengkap: `.scratch/pasca-handoff/debug.md`.
Pemilik melaporkan perilaku ini setelah nomor di-`#jeda` lalu di-`#lanjut`;
jeda bukan penyebab (ADR-0011 memang tidak menyimpan riwayat selama jeda),
tetapi state `sent` yang macet bertahan melewati jeda sehingga loop terlihat
terus-menerus.

Dua kebutuhan pemilik:

1. Setiap pesan calon jemaah setelah konfirmasi ke admin harus memberi pilihan
   untuk mengulang percakapan.
2. Paling tidak, kebutuhan spesifik yang disebutkan lewat kata kunci bisa
   diperbarui.

Kemampuan (2) sudah ada — Perbaikan Bidang (ADR-0012) menerima "ubah jumlah
jemaah" pada state `sent` dan mengembalikan alur ke Ringkasan Kebutuhan yang
diperbarui — tetapi tidak terlihat oleh calon jemaah karena tidak pernah
disebut setelah ringkasan terkirim.

## Keputusan

Tambahkan perilaku pasca-handoff di dalam seam `handleInbound` (state tetap
diturunkan dari riwayat; tidak ada varian `FlowState` baru):

- **Menu Lanjutan** (`MENU_LANJUTAN_ID/EN`). Pada state `sent`, pesan
  basa-basi/tak dikenali dibalas Menu Lanjutan yang menyebut bagian yang dapat
  diperbarui beserta contoh kata kuncinya (Perbaikan Bidang) dan cara mengulang
  percakapan ("ulangi"). Pesan pemicunya **tidak** dicatat sebagai Perubahan
  atau pertanyaan, sehingga "halo" tidak mengotori Ringkasan Kebutuhan dan
  tidak memicu permintaan persetujuan pengiriman ulang.
- **Ulangi Percakapan** (`RESTART_REQUEST`). Kata kunci "ulangi", "mulai dari
  awal", "dari awal", "reset", "restart", "percakapan baru", "chat baru",
  "start over" pada state `sent`/`awaiting-revision-consent` membalas pembuka
  layanan + menu tujuan; `nextState` mengembalikan `{ kind: "idle" }`. Reset
  riwayat memanfaatkan aturan lama: assistant turn yang memuat menu tujuan
  mereset state ke `idle` + mode pilih tujuan, sehingga pesan berikutnya
  membuka intake baru dengan draft kosong. Riwayat lama tetap ada di transkrip.
- **Penolakan pengiriman ulang** pada `awaiting-revision-consent` diikuti Menu
  Lanjutan; catatan perubahan tidak dihapus (invarian tiket 05 `lead-intake`).
- **Prioritas**: pemicu mendesak > pertanyaan menyela > Perbaikan Bidang >
  pertanyaan Harga Indikatif > Ulangi Percakapan > perubahan kebutuhan biasa.
  Karena Perbaikan Bidang diperiksa lebih dulu, "ulangi bagian tanggal" tetap
  Perbaikan Bidang, bukan Ulangi Percakapan.

Alternatif yang ditolak:

- Menambahkan varian `FlowState` untuk "menu pasca-handoff" dengan pilihan
  bernomor — perlu state baru dan menangani balasan angka yang ambigu dengan
  isi kebutuhan; menu kata kunci memakai mekanisme Perbaikan Bidang yang sudah
  teruji.
- Mengenali sebutan bidang tanpa kata kerja koreksi ("jumlah jemaah" saja) —
  menambah risiko misfire pada pesan kebutuhan biasa ("catatan: ..." dianggap
  permintaan ubah bidang); kata kerja koreksi tetap menjadi pemicu yang jelas.
- Memperbaiki state `admin-routed` (vendor/mitra, tim internal, keperluan lain)
  — kontak itu memang ditangani admin dan berada di luar lingkup laporan.

## Konsekuensi

- Setiap pesan pasca-handoff punya langkah berikutnya: pembaruan spesifik
  (Perbaikan Bidang), Menu Lanjutan, atau Ulangi Percakapan. Loop
  `"Terima kasih atas pesan Anda."` hilang.
- Membuka kembali "reset seluruh draft" yang dulu dinyatakan di luar lingkup
  `.scratch/penyela-pengumpulan` — tetapi **hanya pasca-handoff**; di tengah
  pengumpulan sebelum ringkasan terkirim, "ulangi" tidak dianggap Ulangi
  Percakapan (kata kerja "ulang" tanpa sebutan bidang tidak memicu apa pun).
- Menu Lanjutan menyebut istilah Perbaikan Bidang dengan contoh konkret;
  perubahan perilaku Perbaikan Bidang sendiri tidak ada.
- State `admin-routed` tetap membalas `BASA_BASI` apa adanya.
- `BotTurn`, kontrak seam, dan format pesan admin tidak berubah.
