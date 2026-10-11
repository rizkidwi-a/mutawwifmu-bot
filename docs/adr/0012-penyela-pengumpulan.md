# ADR-0012: Penyela Pengumpulan — Pertanyaan Menyela dan Perbaikan Bidang

Status: accepted

## Konteks

Selama bot mengajukan pertanyaan Permintaan Tindak Lanjut, calon jemaah sering
menyela dengan dua jenis pesan yang sebelumnya salah ditangani:

1. **Niat bertanya** berkata kunci ("ingin bertanya", "ada yang ingin
   ditanyakan"). Pesan seperti "ada yang ingin ditanyakan" bahkan tidak
   dikenali pola pertanyaan sehingga **mengisi bidang** (mis. `Jumlah jemaah:
   ada yang ingin ditanyakan`); pesan berkata kunci lain hanya mendapat balasan
   generik "pertanyaan Anda saya catat".
2. **Koreksi bidang spesifik** ("hapus bagian tanggal", "jumlah jemaah hapus")
   — tidak ada mekanisme untuk mengosongkan satu bidang dan mengulang
   jawabannya; pesannya justru dikonsumsi sebagai jawaban bidang atau catatan
   perubahan.

Keputusan pemilik (2026-10-10): pertanyaan menyela disimpan di Bagian
Pertanyaan dengan pengakuan "akan dikonfirmasi admin"; kata kunci polos meminta
isi pertanyaan lebih dulu; koreksi bidang memakai ulang jawaban satu bidang lalu
kembali ke state sebelumnya.

## Keputusan

Kedua penyela ditangani di dalam seam `handleInbound` (state diturunkan dari
riwayat, pola `resume` seperti `awaiting-handoff-consent`), dengan detektor
regex murni di `src/conversation/penyelaPengumpulan.ts`:

- **Pertanyaan menyela (kata kunci).** Pesan berkata kunci tidak pernah menjadi
  jawaban bidang. Isinya disimpan **apa adanya** ke Bagian Pertanyaan
  (`notedQuestions`, baris "Pertanyaan yang dicatat" pada Ringkasan Kebutuhan)
  dan dibalas kira-kira "Baik, akan saya simpan di bagian pertanyaan dan nanti
  dikonfirmasi admin." Kata kunci polos ("ingin bertanya" saja) dibalas
  permintaan isi pertanyaan; pesan berikutnya menjadi pertanyaannya, lalu alur
  **kembali ke state sebelumnya**. Berlaku hanya saat bot sedang menanyakan
  sesuatu/menunggu konfirmasi; pesan pembuka percakapan tetap membuka
  pengumpulan seperti biasa.
- **Perbaikan bidang terarah.** Kata kerja koreksi yang menyebut bidang
  ("hapus bagian tanggal") mengosongkan bidang tersebut, bot meminta ulang
  jawaban bidang itu saja, lalu **kembali ke state sebelumnya**: ringkasan yang
  diperbarui + konfirmasi, kelanjutan pengumpulan, atau alur PEMBARUAN
  (tiket 05 lead-intake) bila ringkasan sudah terkirim. Beberapa bidang dalam
  satu pesan diulang menurut urutan pengumpulan. Nilai bidang diubah langsung
  (bukan catatan perubahan) — konsisten dengan aturan "apa adanya".
- **Prioritas pesan:** pemicu mendesak (handoff manusia/darurat/perjalanan
  aktif) > pertanyaan menyela > perbaikan bidang > perilaku lama. Pertanyaan
  Harga Indikatif tetap dijawab dari materi walau memuat kata kunci.
- Frasa negasi ("tidak ada yang ingin ditanyakan", "jangan hapus") tidak
  memicu; nama layanan (hotel, transport) dan kata "harga" sengaja tidak
  menjadi sebutan bidang agar pertanyaan harga/pernyataan kebutuhan tidak
  salah jadi perbaikan.

Alternatif yang ditolak: mencatat pertanyaan menyela sebagai record terpisah
yang langsung dikirim ke admin (memecah satu Permintaan Tindak Lanjut dan
menambah jenis kiriman admin); mengubah `classifyInbound` (menambah risiko
misfire pada korpus regresi yang sudah dijaga); menyimpan perubahan bidang
sebagai catatan perubahan (menyembunyikan koreksi nilai dari ringkasan).

## Konsekuensi

- Balasan atas pesan berkata kunci berbeda dari pertanyaan non-harga biasa
  ("pertanyaan Anda saya catat"); keduanya tetap berakhir di Bagian Pertanyaan.
- Kata kunci polos membuka state `awaiting-question` sementara; bila calon
  jemaah mengirim jawaban bidang sebagai pesan berikutnya, pesan itu tercatat
  sebagai pertanyaan dan bidang yang tertunda diulang — alur tidak macet
  (keputusan terbuka tiket 01 yang disengaja).
- `FlowState` bertambah dua varian (`reasking-field`, `awaiting-question`) yang
  diturunkan murni dari fold riwayat; seam dan kontrak `BotTurn` tidak berubah.
- Detektor murni regex: kalimat koreksi dengan sebutan bidang yang tidak
  terdaftar (mis. "ganti hotel") sengaja diabaikan dan diperlakukan sebagai
  jawaban kebutuhan biasa — lebih baik tidak reset daripada salah reset.
