# ADR-0016: Ulangi Percakapan dari State `admin-routed`

Status: accepted

## Konteks

Menu tujuan chat (`.scratch/tujuan-chat/spec.md`) meneruskan pilihan
vendor/mitra (2), tim internal (3), dan keperluan lain (4) **langsung ke admin**
tanpa intake, lalu percakapan berhenti pada state `admin-routed`. ADR-0014
secara eksplisit menyatakan state itu di luar lingkup dan tetap membalas
`BASA_BASI` apa adanya.

Akibatnya kontak yang memilih 2/3/4 tidak punya jalan keluar bila admin belum
menangani: setiap pesan dibalas "Terima kasih atas pesan Anda." sampai proses
di-restart. Transkrip nyata kontak `6285275258899`
(`data/transkrip-percakapan.csv`, 2026-10-15):

```text
04:13:26  jemaah: "3"                       -> handoff "Tim internal"
04:21:30  jemaah: "bisa minta ulangi?"      -> "Terima kasih atas pesan Anda."
04:22:06  jemaah: "ulangi percakapan"       -> "Terima kasih atas pesan Anda."
04:23:27  jemaah: "halo kak mau nanya-nanya"-> "Terima kasih atas pesan Anda."
```

Ulangi Percakapan (ADR-0014) sudah menyelesaikan keadaan yang sama pada state
`sent`; celahnya hanya pada `admin-routed`.

## Keputusan

Perluas Ulangi Percakapan ke state `admin-routed` di dalam seam `handleInbound`
(tanpa varian `FlowState` baru):

- Pesan yang cocok `isRestartRequest` pada `admin-routed` dibalas pembuka
  layanan + menu tujuan (`openingReply(null, language)`); `nextState`
  mengembalikan `{ kind: "idle" }` sehingga pesan berikutnya diproses sebagai
  percakapan baru — memilih "1" membuka intake dengan draft kosong.
- Prioritas di dalam blok `admin-routed`: pemicu mendesak (`URGENT_TRIGGERS`,
  sudah diperiksa lebih dulu) > pertanyaan Harga Indikatif > Ulangi Percakapan >
  `BASA_BASI`. Pemeriksaan ulangi diletakkan **di dalam** blok `admin-routed`
  pada `step`, karena blok itu mengembalikan `next` apa adanya untuk semua pesan
  non-harga sehingga handler yang ditempatkan setelahnya tidak akan tercapai.
- Perilaku state `sent` dan `awaiting-revision-consent` tidak berubah.

Alternatif yang ditolak:

- Menu Lanjutan berkata kunci untuk `admin-routed` (seperti state `sent`) —
  menambah permukaan balasan pada fase yang memang sudah diserahkan ke admin,
  padahal kebutuhan pelapor hanya jalan keluar dari loop.
- Kembali otomatis ke menu tujuan setelah tenggang waktu — tidak
  deterministik pada seam yang state-nya diturunkan dari riwayat, dan bisa
  menyela saat admin justru sedang membalas.
- Membiarkan apa adanya (ADR-0014) — pengguna terkunci sampai restart proses.

## Konsekuensi

- Alternatif "Memperbaiki state `admin-routed`" yang ditolak ADR-0014 dan
  konsekuensinya ("State `admin-routed` tetap membalas `BASA_BASI` apa adanya")
  dibatalkan khusus untuk kata kunci ulangi; pesan lain tetap `BASA_BASI`.
- "ulangi bagian tanggal" dari `admin-routed` ikut memicu Ulangi Percakapan:
  tidak ada draft yang bisa diperbaiki pada fase ini, sehingga restart adalah
  tafsir yang dituju.
- Kebijakan handoff tidak berubah: pesan pemicu ulangi tidak menjadi catatan
  kebutuhan, tidak mengirim riwayat chat, dan kategori handoff di payload admin
  tetap sama (ADR-0010).
- `FlowState`, kontrak `BotTurn`, dan format pesan admin tidak berubah.
