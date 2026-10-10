# 04: Batas waktu jeda otomatis (keputusan pemilik)

**What to build:** (Keputusan pemilik 2026-10-10: **(a) tanpa auto-resume** — lihat Comments.) Kapan Jeda Percakapan berakhir:

- **(a) Tanpa auto-resume [DIPILIH].** Jeda hanya berakhir lewat `#lanjut <nomor>` / `#bot on` eksplisit. Paling aman: percakapan manual admin tidak pernah diputus bot diam-diam di tengah jalan.
- **(b) Auto-resume setelah N jam tanpa aktivitas [ditolak untuk saat ini].** "Aktivitas admin" hanya dapat diamati bila tiket 05 berhasil membuat pesan keluar dari nomor bot terlihat di webhook; tanpa itu, sinyal pengganti (mis. sejak waktu jeda) berisiko mematikan jeda justru saat admin masih menangani — risiko yang sama dengan masalah awal.

Tersisa untuk implementasi: mengunci perilaku (a) dengan tes dan dokumentasi.

**Blocked by:** 03: Gerbang jeda pada jalur pesan masuk

**Status:** ready-for-agent

- [x] Pemilik memilih (a) atau (b), dengan nilai N bila (b); keputusan dan alasannya tercatat di komentar tiket ini.
- [ ] Perilaku tanpa auto-resume dikunci dengan tes: jeda tetap aktif melewati waktu lama, tidak ada kadaluarsa otomatis (tiket 01 menyimpan waktu mulai jeda hanya untuk ditampilkan `#status`, bukan untuk kadaluarsa).
- [ ] `README.md` mencatat singkat bahwa jeda hanya berakhir lewat perintah eksplisit.
- [ ] `npm test` dan `npm run typecheck` tetap hijau.

## Comments

- Sumber: bagian opsional pada rekomendasi sesi 2026-10-10 (`.scratch/jeda-ambil-alih/spec.md` Ruang Lingkup #4). Rekomendasi awal: mulai dari (a); pertimbangkan (b) hanya setelah tiket 05 membuktikan aktivitas admin bisa diamati.

### Keputusan pemilik (2026-10-10)

Opsi **(a)** dipilih ("biarkan secara eksplisit saja"): Jeda Percakapan hanya berakhir lewat `#lanjut <nomor>` / `#bot on` eksplisit — tanpa auto-resume. Konsekuensi: tiket ini tidak lagi bergantung pada tiket 05 (hanya opsi (b) yang butuh observabilitas aktivitas admin), jadi blokir diubah ke tiket 03. Bila kelak auto-resume dibutuhkan, buka sebagai tiket baru setelah tiket 05 selesai — jangan mengubah keputusan ini diam-diam.
