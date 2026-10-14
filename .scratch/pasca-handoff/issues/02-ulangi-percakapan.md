# 02: Ulangi percakapan dari awal dengan kata kunci

**What to build:** Kata kunci mengulang ("ulangi", "ulang percakapan",
"mulai dari awal", "dari awal", "reset", "restart", "percakapan baru",
"chat baru", "new conversation", "start over") pada state pasca-handoff
(`sent`/`awaiting-revision-consent`) mengembalikan percakapan ke awal: balasan
adalah pembuka layanan + menu tujuan, dan pesan berikutnya diproses sebagai
percakapan baru — memilih "1" membuka intake dengan draft kosong, bukan
melanjutkan ringkasan lama.

**Blocked by:** —

**Status:** resolved

- [x] `ulangi` / `mulai dari awal` pada `sent` membalas pembuka + menu tujuan.
- [x] Pesan berikutnya (`1`) memulai intake baru dengan draft kosong; Ringkasan
      Kebutuhan baru tidak memuat nilai lama.
- [x] Berlaku juga pada `awaiting-revision-consent`.
- [x] Perbaikan bidang "ulangi bagian tanggal" tetap Perbaikan Bidang, bukan
      ulang percakapan (prioritas penyela di atas restart).
- [x] State dijalankan ulang murni dari riwayat (tanpa state baru di
      `FlowState`).
- [x] Tes baru di `tests/conversation/pascaHandoff.test.ts`; suite existing hijau.

## Comments

### Implementasi (sesi 2026-10-13)

`RESTART_REQUEST` + `isRestartRequest()`; `step()` mengembalikan
`openingReply(null, language)` untuk state pasca-handoff, `nextState()`
mengembalikan `{ kind: "idle" }`. Reset riwayat memanfaatkan aturan lama:
assistant turn yang memuat menu tujuan (`containsPurposeMenu`) mengembalikan
state ke `idle` + mode pilih tujuan, sehingga pesan berikutnya masuk
`handlePurposeSelection`.
