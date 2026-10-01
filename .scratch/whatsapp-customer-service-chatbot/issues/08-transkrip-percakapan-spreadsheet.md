# 08: Transkrip percakapan sebagai spreadsheet (CSV)

**What to build:** Pemilik dapat membuka riwayat percakapan bot sebagai tabel — file CSV
yang bisa dibuka di Excel/Google Sheets — sehingga lebih mudah dibaca daripada blok teks
handoff di WhatsApp atau log proses.

**Blocked by:** —

**Status:** resolved

- [x] Setiap pesan teks masuk dari calon jemaah dan balasan teks yang dikirim bot
  tercatat sebagai satu baris di file CSV.
- [x] Kolom: `waktu`, `nomor`, `peran` (`calon-jemaah`/`asisten`), `pesan`.
- [x] File dibuat otomatis bila belum ada (header ditulis sekali), penulisan append.
- [x] Format aman untuk Excel: UTF-8 dengan BOM, akhir baris CRLF; escaping RFC 4180
  (koma, tanda kutip, dan baris baru di dalam pesan).
- [x] Lokasi usulan: `data/transkrip-percakapan.csv` di root repo; `data/` ditambahkan
  ke `.gitignore` (berisi data pribadi: nomor + isi pesan).
- [x] Kegagalan menulis transkrip tidak boleh menggagalkan balasan bot; kesalahan
  dicatat ke log proses (best-effort, seperti jejak audit handoff).
- [x] Tes perilaku di seam server (payload Fonnte → dua baris: masuk + keluar, isi dan
  urutan benar; termasuk kasus pesan berkoma/kutip/baris baru).
- [x] Format pesan WhatsApp ke admin (ADR-0006) dan perilaku percakapan **tidak
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
### Implementasi selesai — tiket resolved (agent)

Transkrip ditulis sebagai efek samping di luar seam percakapan; keputusan dicatat di
`docs/adr/0007-transkrip-percakapan-csv.md`.

- Modul baru `src/conversationTranscript.ts`: port `ConversationTranscript`
  (`record(entry)`, boleh melempar) + `CsvConversationTranscript` (path default
  `data/transkrip-percakapan.csv`). Kolom `waktu` (WIB `YYYY-MM-DD HH:MM:SS`, label
  sesuai kriteria tiket), `nomor`, `peran`, `pesan`; BOM UTF-8, CRLF, escaping RFC 4180,
  header sekali, berkas dibuat otomatis beserta direktori induknya.
- Wiring di `src/server.ts`: pesan teks masuk dicatat sebagai `calon-jemaah`, balasan
  yang benar-benar terkirim (termasuk pemberitahuan gangguan saat handoff gagal) sebagai
  `asisten`; pesan non-teks tidak dicatat. Penulisan dibungkus `try/catch` — kegagalan
  hanya masuk log proses, balasan tetap terkirim. `src/main.ts` menyediakan implementasi
  CSV; tidak ada variabel konfigurasi baru. `data/` ditambahkan ke `.gitignore`.
- Tanpa perubahan pada `handleInbound`, `classifyInbound`, format handoff ADR-0006,
  bentuk `BotTurn`, maupun urutan aksi/metrik.
- Tes: `tests/conversationTranscript.test.ts` (BOM/CRLF/header sekali/WIB/escaping/
  append) dan `tests/transport/transcriptDelivery.test.ts` (payload Fonnte → dua baris
  berurutan yang isinya cocok dengan balasan terkirim; koma/kutip/baris baru utuh; dan
  transkrip yang melempar tetap menghasilkan balasan + log). Lima tes transport lama
  hanya ditambah stub `transcript` tanpa perubahan perilaku; seluruh 174 tes hijau dan
  `npm run typecheck` bersih.
- README menambah bagian "Transkrip percakapan" dan entri struktur.

Catatan keputusan label kolom: kriteria tiket menulis `waktu`, sedangkan usulan di
komentar memakai `waktu_wib`. Dipilih `waktu` agar sesuai kriteria; formatnya tetap WIB
dan didokumentasikan di ADR-0007. Bila pemilik lebih memilih `waktu_wib`, perubahan
hanya satu konstanta `HEADER_FIELDS`.

Tidak dikerjakan di tiket ini: celah bentuk jamak "land arrangements" pada pencocokan
FAQ — masih menunggu keputusan pemilik.
