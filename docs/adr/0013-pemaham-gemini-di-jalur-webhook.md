# ADR-0013: Pemaham Gemini dipasang di jalur webhook sebagai classifier opt-in

Status: accepted

## Konteks

ADR-0008 memutuskan pemaham bahasa hibrida (LLM memilih rute/topik, fakta tetap
dari template manual) tetapi menunda pemasangan ke runtime: *"Wiring async ke
server menyusul setelah angka pengukuran bagus."* Modul `pahamiDenganGemini()`
dan `classifyDenganFallback()` sudah hidup dengan empat lapis pengaman, namun
belum terhubung ke pemrosesan pesan masuk; regex mencapai 118/118 pada korpus
yang ada (`node scripts/probe-cakupan-gemini.ts --tanpa-gemini`), sehingga
integrasi harus opt-in dan terukur sebelum diaktifkan untuk pengguna.

Tiket `.scratch/gemini-runtime-integration/issues/01-wire-gemini-ke-runtime.md`
memasang integrasi itu dengan syarat: `handleInbound(message, context)` tetap
sinkron/deterministik, paling banyak satu request Gemini per pesan masuk, dan
kebijakan percakapan ADR-0009 tidak berubah.

## Keputusan

- **Opt-in lewat kunci.** `GEMINI_API_KEY` (dengan `GEMINI_MODEL` opsional,
  default dari `bacaKonfigGemini()`) hanya di `.env`. Tanpa kunci, klasifikasi
  regex menjadi default dan startup tidak pernah gagal karena konfigurasi
  Gemini yang tidak lengkap. Kredensial tidak pernah masuk berkas tracked.
- **Satu klasifikasi per pesan.** Jalur webhook menghitung `InboundRouting`
  satu kali per pesan teks calon jemaah (`src/conversation/klasifikasiMasuk.ts`),
  lalu menyuntikkan hasil itu ke `handleInbound(message, context, hasilKlasifikasi)`.
  Fungsi transisi state tidak pernah memanggil Gemini; `handleInbound` tetap
  sinkron. Pesan kosong/non-teks, pesan admin, dan pesan yang tertahan gerbang
  jeda tidak dikirim ke pemaham.
- **Hasil routing melekat pada giliran riwayat.** `ConversationTurn` membawa
  `routing` hasil klasifikasi pesan itu, sehingga pemutaran ulang riwayat untuk
  pesan berikutnya memakai hasil yang sama — semua keputusan percakapan untuk
  satu pesan konsisten sampai Ringkasan Kebutuhan terbentuk.
- **Regex tetap berkuasa atas pemicu berisiko tinggi.** Enam kelompok pemicu
  handoff deterministik — `emergency`, `active-trip`, `human-request`,
  `agency-or-corporate`, `booking-or-payment`, `custom-quote-or-availability` —
  menang atas hasil model, beserta alasan handoff spesifiknya. Model tidak boleh
  menurunkan kelompok ini menjadi FAQ/opener. Handoff `unsupported-question`
  tetap dapat diperbaiki model (jalur perbaikan cakupan yang diizinkan).
- **Batas waktu total di jalur webhook.** Pemahaman diberi tenggat total
  (default 10 detik); bila tenggat habis, segera jatuh ke regex dan percobaan
  lanjutan pemaham dihentikan sebelum menyentuh jaringan lagi, agar webhook
  tidak tertahan oleh timeout/retry Gemini.
- **Privasi.** Hanya teks pesan yang dikirim untuk klasifikasi — tanpa nomor
  pengirim, riwayat percakapan, atau metadata kontak. API key, header
  autentikasi, prompt, dan isi pesan tidak dicatat ke log.
- **Jawaban tidak berubah.** Harga Indikatif tetap dari template `faqAnswer()`;
  pertanyaan non-harga tetap dicatat sebagai Bagian Pertanyaan untuk admin
  (ADR-0009); intake, persetujuan handoff, dan Ringkasan Kebutuhan tidak berubah.

## Konsekuensi

- Perilaku tanpa kunci identik dengan sebelumnya (regex 118/118 pada korpus);
  seluruh tes unit berjalan tanpa kunci dan tanpa jaringan.
- Sebelum integrasi diaktifkan pada deployment, jalankan
  `node scripts/probe-cakupan-gemini.ts` dengan kunci tersedia dan bandingkan
  dengan baseline regex. Jangan mengklaim peningkatan cakupan tanpa hasil ukur;
  baseline regex yang terukur tetap 118/118.
- `pahamiDenganGemini()` tetap memiliki kebijakan percobaan ulang internalnya
  (429/503); "satu request per pesan" berarti satu kali pemahaman per pesan,
  bukan satu percobaan HTTP di dalam modul pemaham itu sendiri.
- Bila kelak hasil routing ingin bertahan melewati restart proses (store
  percakapan saat ini in-memory), skema penyimpanan konteks perlu keputusan
  tersendiri — di luar cakupan ADR ini.
