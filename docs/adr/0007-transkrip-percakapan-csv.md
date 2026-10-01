# ADR-0007: Transkrip percakapan sebagai berkas CSV di sisi proses

Status: accepted

## Konteks

Pemilik meminta riwayat percakapan lebih mudah dibaca daripada blok teks handoff
ke admin atau log proses: *"tidak bisakah dijadikan spreadsheet saja
percakapannya agar lebih mudah dibaca"* (sesi 2026-10-01, tiket 08). Spec tidak
meminta penyimpanan transkrip, dan keputusan persistent store/retensi riwayat
percakapan belum diambil (lihat `src/conversationStore.ts`).

Handoff ke admin (ADR-0006) sudah memuat konteks percakapan, tetapi sebagai satu
pesan teks di WhatsApp — sulit difilter per nomor atau dibaca berurutan.

## Keputusan

Catat transkrip percakapan sebagai **berkas CSV** melalui port
`ConversationTranscript` (`src/conversationTranscript.ts`), di-wire di
`src/server.ts` sebagai efek samping di luar seam percakapan:

- Satu baris per **pesan teks**: pesan masuk `calon-jemaah`, lalu balasan yang
  benar-benar terkirim `asisten`. Pesan non-teks tidak dicatat, konsisten dengan
  penyimpanan riwayat konteks.
- Kolom `waktu` (WIB, `YYYY-MM-DD HH:MM:SS`), `nomor`, `peran`, `pesan`.
- Berkas dibuat otomatis (header sekali) lalu ditulis append; UTF-8 dengan BOM,
  akhir baris CRLF, escaping RFC 4180 agar aman dibuka di Excel.
- Lokasi default `data/transkrip-percakapan.csv` di root repo; `data/`
  diabaikan git karena memuat data pribadi (nomor + isi pesan). Belum ada
  variabel konfigurasi baru sampai ada kebutuhan nyata memindahkannya.
- Penulisan **best-effort**: kegagalan menulis tidak menggagalkan balasan bot,
  hanya dicatat ke log proses.

Alasan:

- CSV terbuka langsung di Excel/Google Sheets tanpa layanan tambahan.
- Port menjaga seam percakapan tetap murni dan tidak mengubah perilaku; CSV
  adalah catatan tambahan, bukan pengganti handoff admin.
- Penulisan sinkron per pesan (volume rendah) menjaga urutan baris tanpa
  penyimpanan sementara.

## Konsekuensi

- Berkas transkrip memuat data pribadi: jangan di-commit (sudah di `.gitignore`)
  dan jangan disalin ke tempat publik. Kebijakan retensi/pemindahan berkas belum
  diputuskan; pemilik perlu memutuskan sebelum volume bertambah besar.
- Transkrip hanya berisi percakapan yang diproses proses ini — tidak mencakup
  pesan yang tidak masuk webhook dan tidak berpindah antar nomor bot.
- Bila kelak transkrip perlu masuk database atau dibagikan, cukup ganti
  implementasi `ConversationTranscript`; `server.ts` hanya memanggil port.
- Menambah varian `ConversationAction` tidak diperlukan; transkrip adalah efek
  samping server, bukan tindakan seam percakapan.
