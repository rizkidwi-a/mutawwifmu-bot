# ADR-0006: Kanal penerimaan admin via pesan WhatsApp ke nomor admin

Status: accepted

## Konteks

Gate pra-produksi (tiket 02 dan tiket 06, sebelumnya di README): kanal penerimaan
handoff admin harus dikonfirmasi pemilik dan dicatat sebagai ADR sebelum handoff
dipakai di produksi. Spec melarang mengasumsikan adanya CRM atau shared inbox
tertentu, sehingga implementasi sebelumnya (`LoggingAdminChannel`) hanya
mencatat handoff ke log proses sebagai penanda sementara.

Keputusan pemilik (sesi cutover tiket 06): handoff dikirim ke nomor WhatsApp
admin `+62 822 8388 6627` — nomor terpisah dari nomor bot. Kandidat yang
dipertimbangkan: pesan WhatsApp ke nomor admin (terpilih), email tim, serta
spreadsheet/CRM.

## Keputusan

Teruskan setiap handoff sebagai **pesan WhatsApp ke nomor admin** yang dibaca
dari konfigurasi `WHATSAPP_ADMIN_NUMBER`, melalui port `MessageSender` provider
yang sama dengan bot. Nilai nomornya hidup di konfigurasi, bukan di kode
(sehingga dapat diganti tanpa perubahan kode). Implementasi
`WhatsAppAdminChannel` di `src/adminChannel.ts` menggantikan
`LoggingAdminChannel`.

Alasan:

- Kanal yang sudah dipakai tim (WhatsApp) tanpa menambah layanan pihak ketiga.
- Satu kanal keluar (`MessageSender`) untuk balasan calon jemaah maupun handoff
  admin, sehingga pergantian provider (ADR-0001/ADR-0003) tidak mengubah kanal
  admin.
- Nomor admin dapat diganti lewat konfigurasi; perilaku percakapan tidak berubah
  (diuji `tests/transport/cutoverParity.test.ts` dan
  `tests/transport/adminHandoffDelivery.test.ts`).

## Konsekuensi

- Nomor admin harus aktif di WhatsApp dan menerima pesan dari nomor bot.
- Isi handoff selalu dicatat ke log proses sebelum dikirim (jejak audit dan
  pemulihan), lalu dikirim sebagai satu pesan teks berisi alasan, ringkasan
  Permintaan Tindak Lanjut bila ada, dan konteks percakapan.
- Server **menunggu** hasil pengiriman sebelum mengklaim penerusan: bila
  pengiriman gagal, calon jemaah diberi pemberitahuan gangguan (bukan klaim
  "diteruskan") dan metrik `handOffsForwarded` tidak naik.
- Gangguan provider yang sama memengaruhi balasan calon jemaah dan handoff
  sekaligus; mitigasi: jejak audit di log proses + metrik yang tidak mengklaim
  keberhasilan palsu.
- Bila kelak tim pindah ke shared inbox/CRM, cukup ganti implementasi
  `AdminChannel` — seam percakapan tidak berubah. Perubahan keputusan dicatat
  sebagai ADR baru dengan catatan pada ADR ini.
