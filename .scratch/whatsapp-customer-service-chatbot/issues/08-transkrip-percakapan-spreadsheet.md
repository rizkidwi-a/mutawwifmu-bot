# 08: Transkrip percakapan sebagai spreadsheet (CSV)

**What to build:** Pemilik dapat membuka riwayat percakapan bot sebagai tabel — file CSV
yang bisa dibuka di Excel/Google Sheets — sehingga lebih mudah dibaca daripada blok teks
handoff di WhatsApp atau log proses.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Setiap pesan teks masuk dari calon jemaah dan balasan teks yang dikirim bot
  tercatat sebagai satu baris di file CSV.
- [ ] Kolom: `waktu`, `nomor`, `peran` (`calon-jemaah`/`asisten`), `pesan`.
- [ ] File dibuat otomatis bila belum ada (header ditulis sekali), penulisan append.
- [ ] Format aman untuk Excel: UTF-8 dengan BOM, akhir baris CRLF; escaping RFC 4180
  (koma, tanda kutip, dan baris baru di dalam pesan).
- [ ] Lokasi usulan: `data/transkrip-percakapan.csv` di root repo; `data/` ditambahkan
  ke `.gitignore` (berisi data pribadi: nomor + isi pesan).
- [ ] Kegagalan menulis transkrip tidak boleh menggagalkan balasan bot; kesalahan
  dicatat ke log proses (best-effort, seperti jejak audit handoff).
- [ ] Tes perilaku di seam server (payload Fonnte → dua baris: masuk + keluar, isi dan
  urutan benar; termasuk kasus pesan berkoma/kutip/baris baru).
- [ ] Format pesan WhatsApp ke admin (ADR-0006) dan perilaku percakapan **tidak
  berubah**; CSV adalah catatan tambahan di sisi proses.

## Comments

### Permintaan pemilik (agent, sesi 2026-10-01)

Setelah uji kanal admin pada nomor pengembangan lolos, pemilik meminta:
*"tidak bisakah dijadikan spreadsheet saja percakapannya agar lebih mudah dibaca"*.
Konteks: pesan handoff ke admin berisi konteks percakapan sebagai blok teks; pemilik
ingin bentuk tabel.

Usulan desain (silakan sesuaikan saat implementasi):

- **Satu baris per pesan** (bukan per percakapan) — memudahkan filter per nomor dan
  membaca urutan percakapan.
- **Waktu dalam WIB** format `YYYY-MM-DD HH:MM:SS`, label kolom `waktu_wib` (alternatif:
  ISO 8601 bila lebih disukai).
- Implementasi sebagai port `ConversationTranscript` + implementasi CSV, di-wire di
  `src/server.ts` sebagai efek samping (seperti metrik/kanal admin) — seam percakapan
  `src/conversation/handleInbound.ts` tetap murni.
- **Tanpa variabel konfigurasi baru** (path default konstanta) sampai ada kebutuhan
  nyata — menambah env var wajib memperbarui fixture tes konfigurasi.
- Pesan non-teks (`text === null`) tidak dicatat, konsisten dengan penyimpanan riwayat
  percakapan.
