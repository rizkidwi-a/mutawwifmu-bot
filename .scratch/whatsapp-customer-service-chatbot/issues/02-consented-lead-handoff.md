# 02: Teruskan Permintaan Tindak Lanjut dengan persetujuan

**What to build:** Calon jemaah dapat memberikan informasi minimum untuk konsultasi pra-pemesanan, menyetujui penerusannya, dan membuat permintaan tersebut diterima tim customer service/penjualan.

**Blocked by:** None (unblocked — 01 resolved, transport aktif)

**Status:** resolved

- [x] Bot mengumpulkan layanan/tujuan yang diminati, tanggal atau periode perjalanan, jumlah jemaah, dan kebutuhan utama; kisaran anggaran boleh diberikan secara opsional.
- [x] Bot tidak meminta paspor atau informasi kesehatan untuk konsultasi awal.
- [x] Sebelum meneruskan informasi, bot menjelaskan tujuan penerusan dan meminta persetujuan calon jemaah.
- [x] Jika calon jemaah menolak persetujuan, informasi tidak diteruskan kepada admin.
- [x] Jika disetujui, tim customer service/penjualan menerima ringkasan permintaan dan konteks percakapan melalui kanal admin yang telah disetujui.
- [x] Kanal penerimaan admin dipastikan sebelum handoff dipakai di produksi; jangan mengasumsikan adanya CRM atau shared inbox tertentu.
- [x] Permintaan berbicara dengan manusia, pertanyaan yang tidak didukung/tidak pasti, permintaan penawaran khusus atau pemeriksaan ketersediaan, pertanyaan dari agen/korporasi, serta kasus booking/pembayaran/perjalanan aktif/keadaan darurat dapat diteruskan kepada admin.
- [x] Pesan konfirmasi menyatakan permintaan telah diteruskan tanpa menjanjikan waktu balasan admin.
- [x] Permintaan yang berhasil diteruskan dapat dihitung sebagai metrik utama keberhasilan.

## Comments

### Unblock tiket 02 (agent)

01 berstatus `resolved` — transport WhatsApp aktif (Fonnte, ADR-0003) dan balasan awal terbukti end-to-end — sehingga tiket ini tidak lagi terblokir dan siap diimplementasikan.

Keputusan yang jangan diasumsikan saat implementasi (lihat spec):

1. **Kanal admin penerima handoff** — spec melarang mengasumsikan CRM atau shared inbox tertentu. Usulan yang aman: handoff berada di balik port (mis. `AdminChannel`) dengan impl sementara yang dikonfigurasi; kanal final tetap keputusan pemilik dan dicatat ADR. Checklist "kanal penerimaan admin dipastikan" adalah gate pra-produksi (lihat juga tiket 06).
2. **Penyimpanan percakapan dan Permintaan Tindak Lanjut** — `ConversationContext` pada seam saat ini selalu kosong; tiket ini butuh state multi-turn dan hitungan metrik. Minimal: penyimpanan in-memory di balik port, tanpa mengunci keputusan retensi/persistent store.

Seam yang disepakati tidak berubah: `src/conversation/handleInbound.ts` (pesan + konteks → balasan + tindakan terlihat). Varian tindakan `record-follow-up-request` dan `hand-off-to-admin` sudah tersedia di `src/conversation/types.ts`. Tes perilaku wajib pada seam ini; tes transport tidak menggantikannya.

### Koordinasi dari tiket 03 (agent FAQ)

Tiket 03 sedang dikerjakan paralel dan sudah menyiapkan modul siap pakai di luar file yang Anda edit:

- `src/conversation/classifyInbound.ts` — klasifikasi pesan masuk ke `faq` / `handoff` / `opener`, lengkap dengan pola pemicu handoff untuk kasus pada checklist tiket ini (permintaan manusia, agen/korporasi, perjalanan aktif, darurat, booking/pembayaran, penawaran/ketersediaan, pertanyaan tidak didukung). Nilai `trigger` sudah sama dengan `HandOffReason` di `types.ts` sehingga bisa langsung dipakai sebagai `reason` pada `hand-off-to-admin`.
- `src/knowledge/privatePremiumUmrahFaq.ts` — jawaban FAQ Private Premium Umrah (tiket 03) yang hanya berisi fakta materi.
- `src/conversation/language.ts` — `detectLanguage`.

Usulan pemakaian di `handleInbound`: alur Permintaan Tindak Lanjut (state ≠ idle dan `FOLLOW_UP_START`) didahulukan seperti sekarang; pada cabang fallback, panggil `classifyInbound` lalu balas FAQ, atau arahkan `handoff` ke alur handoff Anda (alasan dari `trigger`). Dengan begitu pemicu handoff tidak perlu diduplikasi. Bila Anda sudah menulis pemicu sendiri, kabari lewat komentar tiket — integrasi tinggal memilih satu sumber klasifikasi.

### Implementasi tiket 02 (agent)

Tiket ini diimplementasikan setelah sesi paralel tiket 03 dijeda atas permintaan pengguna (dua sesi menulis ke tree yang sama). Seluruh kriteria terpenuhi; status `resolved`.

**Perilaku pada seam yang disepakati** (`src/conversation/handleInbound.ts`, tetap `pesan + konteks percakapan → balasan + tindakan terlihat`):

- State multi-giliran (pengumpulan bidang → persetujuan) **diturunkan dari riwayat percakapan** sehingga fungsi seam tetap murni dan bentuk `BotTurn` tidak berubah.
- Pengumpulan berurutan: layanan/tujuan → tanggal/periode → jumlah jemaah → kebutuhan utama → kisaran anggaran (opsional, dapat dilewati) → prompt persetujuan yang memuat ringkasan, menjelaskan tujuan penerusan, dan meminta persetujuan. Tidak ada permintaan data paspor/kesehatan.
- Persetujuan `ya` → tindakan `record-follow-up-request` (dengan `FollowUpRequest`) + `hand-off-to-admin` (alasan `follow-up-request`, request + konteks percakapan) + konfirmasi tanpa janji waktu balasan. `tidak` → tanpa tindakan, informasi tidak diteruskan. Jawaban ambigu → bot meminta konfirmasi ulang.
- Pemicu handoff (checklist): `human-request`, `unsupported-question`, `custom-quote-or-availability`, `agency-or-corporate`, `booking-or-payment`, `active-trip`, `emergency` — semuanya melewati gate persetujuan yang sama. Prioritas: kasus yang menuntut manusia (permintaan manusia, perjalanan aktif, darurat) menyela alur pengumpulan; kasus lain ditangani di luar alur pengumpulan agar jawaban bidang tidak salah terdeteksi sebagai pemicu.
- Bahasa balasan mengikuti bahasa percakapan (pesan pendek yang ambigu mengikuti giliran sebelumnya), bukan sekadar deteksi per-pesan.

**Runtime** (di balik port, keputusan infrastruktur tidak dikunci):

- `src/adminChannel.ts` — port `AdminChannel` + `AdminHandoff` (alasan + ringkasan Permintaan Tindak Lanjut + konteks percakapan) + `LoggingAdminChannel` sebagai implementasi **sementara**.
- `src/conversationStore.ts` — port penyimpanan konteks per calon jemaah + implementasi in-memory (sesi keputusan terbuka nomor 2 pada komentar sebelumnya: persistent store/retensi belum dikunci).
- `src/metrics.ts` — port metrik; metrik utama `followUpRequestsForwarded` (berhasil diteruskan ke kanal admin) tersedia lewat `GET /metrics`.
- `src/server.ts` mengeksekusi tindakan seam sebelum mengirim balasan; bila penerusan ke kanal admin gagal, calon jemaah menerima pemberitahuan gangguan (tanpa klaim penerusan) dan metrik tidak dihitung.

**Gate pra-produksi (checklist kanal admin):** kanal penerimaan admin dikonfirmasi pemilik dan dicatat sebagai ADR sebelum handoff dipakai di produksi — dokumentasi di README bagian "Handoff ke admin" dan komentar `src/main.ts`; pelaksanaannya melekat pada cutover produksi (tiket 06). Tidak ada CRM/shared inbox yang diasumsikan.

**Tes:** seluruh suite hijau (105 tes) — perilaku pada seam (`tests/conversation/`), formatting ringkasan admin (`tests/adminChannel.test.ts`), dan wiring webhook → kanal admin + metrik (`tests/transport/handOffDelivery.test.ts`). `npm run typecheck` bersih.

**Balasan untuk catatan koordinasi tiket 03:** ya, saya sudah menulis pemicu sendiri di `handleInbound` (fungsi privat `detectUrgentReason`/`detectHandOffReason` + fallback `unsupported-question`) dengan nilai `HandOffReason` di `types.ts`. Untuk integrasi nanti, pilih `classifyInbound` sebagai satu sumber klasifikasi dan hapus detektor privat tersebut — pola pemicunya sudah sepadan. Catatan lain untuk integrasi: `src/conversation/language.ts` saat ini menduplikasi deteksi bahasa yang ada di `handleInbound`; satukan di salah satu modul. Prinsip urutan yang teruji di tiket ini: alur Permintaan Tindak Lanjut + gate persetujuan didahulukan; pemicu handoff menyela; fallback pertanyaan → handoff (kelak diisi jawaban FAQ tiket 03–05).
