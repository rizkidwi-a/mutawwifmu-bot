# 02: Jalan keluar "ulangi" dari state `admin-routed`

**What to build:** Kata kunci mengulang (`isRestartRequest`: "ulangi", "ulang
percakapan", "mulai dari awal", "dari awal", "reset", "restart", "percakapan
baru", "chat baru", "new conversation", "start over") pada state
`admin-routed` mengembalikan percakapan ke awal: balasan adalah pembuka
layanan + menu tujuan, dan pesan berikutnya diproses sebagai percakapan baru —
memilih "1" membuka intake dengan draft kosong. Perilaku ini identik dengan
yang sudah ada pada state `sent` (lihat `.scratch/pasca-handoff/issues/02-ulangi-percakapan.md`).

Tanpa perubahan ini, pengguna yang memilih tujuan 2/3/4 (vendor/mitra, tim
internal, keperluan lain) terkunci di `admin-routed`: semua pesan dibalas
"Terima kasih atas pesan Anda." tanpa jalan keluar, sampai ada restart proses.

**Blocked by:** —

**Status:** resolved

- [x] Pada state `admin-routed`, pesan yang cocok `isRestartRequest` membalas
      pembuka layanan + menu tujuan; `nextState`/`step` menghasilkan
      `{ kind: "idle" }` dan pesan berikutnya masuk jalur pilihan tujuan
      (draft intake baru, kosong).
- [x] Pertanyaan Harga Indikatif pada `admin-routed` tetap dijawab lebih dulu;
      urutan prioritas jawaban tidak berubah.
- [x] Pemicu darurat/perjalanan aktif/permintaan manusia (`URGENT_TRIGGERS`)
      tetap menyela ke handoff; jalur ulangi tidak menyingkirkan mereka.
- [x] Perilaku state `sent` dan `awaiting-revision-consent` tidak berubah
      (regresi `pasca-handoff` tetap hijau).
- [x] Jalur basa-basi biasa pada `admin-routed` tetap membalas basa-basi;
      hanya kata kunci ulangi yang mendapat pembuka + menu.
- [x] Pemeriksaan ulangi diletakkan sebelum (atau di dalam) blok
      `admin-routed` di `handleInbound` — blok itu saat ini membalas basa-basi
      dan mengembalikan `next` apa adanya, sehingga handler ulangi yang hanya
      ditambahkan setelahnya tidak akan pernah tercapai.
- [x] Tes unit menutup minimal: (a) "ulangi percakapan" dari `admin-routed`
      membalas pembuka + menu dan state kembali `idle`; (b) pesan berikutnya
      memulai percakapan baru; (c) basa-basi biasa tetap basa-basi.
- [x] `npm test` dan `npm run typecheck` hijau.
- [x] Definisi **Ulangi Percakapan** di `CONTEXT.md` diperluas agar mencakup
      state `admin-routed`, bukan hanya "setelah Ringkasan Kebutuhan terkirim".

## Akar masalah (diagnosis sesi 2026-10-15)

Bukti dari `data/transkrip-percakapan.csv` (kontak 6285275258899):

```text
04:13:26  calon-jemaah  "3"                          → handoff "Tim internal"
04:21:30  calon-jemaah  "bisa minta ulangi?"          → "Terima kasih atas pesan Anda."
04:22:06  calon-jemaah  "ulangi percakapan"           → "Terima kasih atas pesan Anda."
04:23:27  calon-jemaah  "halo kak mau nanya-nanya"    → "Terima kasih atas pesan Anda."
```

Titik kode di `src/conversation/handleInbound.ts`:

| Baris | Peran |
| --- | --- |
| 669–675 | `stateAfterMenuInput`: pilihan tujuan 2/3/4 → `{ kind: "admin-routed" }` |
| 902 | blok `admin-routed`: semua pesan (kecuali pertanyaan harga) membalas `BASA_BASI_ID` |
| ~960 | handler `isRestartRequest` hanya mencakup `sent`/`awaiting-revision-consent` |
| 1414 | `nextState`: `admin-routed` sticky — setiap pesan tetap `admin-routed` |

Satu-satunya keluar otomatis saat ini adalah `URGENT_TRIGGERS`
(emergency/active-trip/human-request), yang memicu handoff baru — bukan reset
ke menu.

Konteks keputusan: spec `.scratch/tujuan-chat/spec.md` memang mendesain
pilihan 2/3/4 sebagai "langsung handoff ke admin" (bot berhenti memandu),
tetapi tidak menyediakan mekanisme kembali ke awal bila admin belum menangani.
Tiket ini menutup celah tersebut tanpa mengubah keputusan handoff langsungnya.

## Referensi

- `.scratch/pasca-handoff/issues/02-ulangi-percakapan.md` — perilaku tujuan
  yang sama untuk state `sent`.
- `.scratch/tujuan-chat/spec.md` — Aturan Perilaku pilihan tujuan.
- `src/conversation/handleInbound.ts` — `RESTART_REQUEST`, `isRestartRequest`,
  blok `admin-routed`, `stateAfterMenuInput`.
- `CONTEXT.md` — entri domain **Ulangi Percakapan** dan **Menu Lanjutan**.

## Comments

### Diagnosis (sesi 2026-10-15)

Dilaporkan saat uji lokal: setelah memilih opsi 3 dari menu tujuan, kontak
hanya menerima "Terima kasih atas pesan Anda." dan permintaan "ulangi
percakapan" tidak diproses. Diverifikasi langsung via transkrip dan pembacaan
kode; perbaikan belum diimplementasikan sesuai permintaan pelapor (tiket
terlebih dahulu, implementasi di sesi berikutnya).

### Implementasi (sesi 2026-10-15)

Selesai. Pemeriksaan ulangi diletakkan **di dalam** blok `admin-routed` pada
`step` (setelah jawaban Harga Indikatif, dijaga `!mendesak`) dan pada
`nextState` sebelum `return state`, sehingga `nextState` mengembalikan
`{ kind: "idle" }` dan balasan `openingReply(null, language)` memuat menu
tujuan — pesan berikutnya masuk jalur pilihan tujuan dengan draft kosong.

- Prioritas tidak berubah: `URGENT_TRIGGERS` tetap menyela lebih dulu —
  termasuk pesan gabungan seperti `"ulangi, ada keadaan darurat"`, karena
  jalur ulangi dijaga `!mendesak`; pertanyaan Harga Indikatif tetap dijawab
  sebelum ulangi, dan basa-basi biasa tetap `BASA_BASI`.
- Tes baru `tests/conversation/ulangiDariAdminRouted.test.ts` (11 kasus): menu
  2/3/4 → ulangi membalas pembuka + menu; pesan berikutnya membuka intake baru
  dengan draft kosong; basa-basi tetap pengakuan singkat; pertanyaan harga
  (termasuk pesan `"ulangi, berapa harga fotografer?"`) tetap dijawab harga;
  pemicu mendesak (human-request, emergency) tetap handoff, baik sendiri
  maupun digabung kata kunci ulangi.
- `npm test` 492 lolos (481 sebelumnya + 11 baru), `npm run typecheck` bersih.
- Dokumentasi: definisi **Ulangi Percakapan** di `CONTEXT.md` diperluas;
  keputusan dicatat sebagai ADR-0016 dan catatan pembatalan parsial ditambahkan
  di ADR-0014.
