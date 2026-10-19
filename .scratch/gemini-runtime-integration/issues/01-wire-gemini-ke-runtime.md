# 01: Hubungkan pemaham Gemini ke jalur pesan masuk runtime

**What to build:** Pasang `pahamiDenganGemini` dan `classifyDenganFallback` yang sudah ada ke pemrosesan pesan masuk webhook sebagai classifier opsional. Gemini hanya memilih rute/topik; Gemini tidak pernah menyusun balasan. Integrasi aktif hanya bila `GEMINI_API_KEY` dikonfigurasi. Tanpa kunci, perilaku regex saat ini tetap menjadi default dan proses bot tetap dapat berjalan.

Pertahankan `handleInbound(message, context)` sebagai seam sinkron/deterministik yang sudah dipakai tes dan pemanggil lain. Tambahkan jalur untuk menerima hasil `InboundRouting` yang sudah dihitung agar server dapat mengklasifikasikan satu pesan secara async, lalu semua keputusan percakapan untuk pesan itu memakai hasil yang sama. Jangan memanggil Gemini dari fungsi transisi state atau melakukan lebih dari satu request Gemini untuk satu pesan masuk.

Integrasi harus mengikuti kebijakan percakapan terkini ADR-0009: pertanyaan non-harga tetap dicatat untuk admin, bukan dijawab sebagai FAQ. Jawaban Harga Indikatif tetap berasal dari template `faqAnswer()`; model tidak menghasilkan, mengubah, atau menyatakan angka harga.

**Blocked by:** none

**Status:** resolved

## Batasan dan perilaku yang diwajibkan

- `GEMINI_API_KEY` opsional; konfigurasi tidak lengkap tanpa kunci Gemini tidak boleh menggagalkan startup. `GEMINI_MODEL` opsional dan memakai default yang sudah ditetapkan `bacaKonfigGemini()`.
- Bila kunci tidak tersedia, hasil Gemini gagal/timeout/tidak valid, atau keyakinan di bawah ambang yang ada, gunakan `classifyInbound()` dan pertahankan balasan/perilaku fallback yang sekarang.
- Panggil Gemini paling banyak sekali untuk setiap pesan teks calon jemaah yang diproses. Jangan panggil untuk pesan kosong/non-teks, pesan admin, atau pesan yang tertahan oleh gerbang jeda. Jangan membuat panggilan jaringan dari unit test.
- Pemicu deterministik berisiko tinggi yang sudah dikenali regex harus tetap menang atas klasifikasi model: `emergency`, `active-trip`, `human-request`, `agency-or-corporate`, `booking-or-payment`, dan `custom-quote-or-availability`. Pertahankan alasan handoff spesifik yang diberikan regex. Model tidak boleh menurunkan permintaan manusia/darurat, booking/pembayaran, permintaan penawaran/ketersediaan, atau pesan korporasi menjadi FAQ/opener.
- Kirim hanya teks pesan yang diperlukan untuk klasifikasi. Jangan sertakan nomor pengirim, riwayat percakapan, atau metadata kontak dalam permintaan Gemini. Jangan mencatat API key, header autentikasi, prompt, atau isi pesan ke log.
- Batasi total waktu tunggu pemahaman di jalur webhook; bila tenggat pemrosesan habis, segera jatuh ke regex agar webhook tidak tertahan oleh timeout/retry Gemini.
- Tidak mengubah aturan intake, persetujuan handoff, ringkasan kebutuhan, isi template, atau kebijakan Harga Indikatif selain hal yang benar-benar diperlukan untuk menyuntikkan hasil routing.
- Keberadaan kunci hanya mengaktifkan integrasi secara opt-in; jangan menambahkan kredensial ke berkas tracked atau otomatis mengaktifkannya di deployment.

## Testing Decisions

- Tambahkan tes konfigurasi bahwa kunci Gemini tidak wajib dan tanpa kunci tidak ada request jaringan.
- Uji jalur server dengan `fetch`/classifier tiruan: pesan teks menggunakan hasil Gemini yang valid, paling banyak satu kali; pesan non-teks, admin, dan kontak dijeda tidak mengirim request.
- Uji error jaringan/HTTP, timeout, JSON/rute/topik tak valid, serta keyakinan rendah: masing-masing jatuh ke hasil regex yang sama seperti sekarang.
- Uji keenam kelompok pemicu handoff berisiko tinggi di atas: hasil model yang menyatakan `faq` atau `opener` tidak boleh membatalkan handoff regex maupun alasan handoff spesifiknya.
- Uji pesan non-harga yang dikenali Gemini tetap dicatat sebagai pertanyaan untuk admin sesuai ADR-0009; uji harga tetap menggunakan template manual dan tidak pernah memakai teks/angka buatan model.
- Pertahankan tes sinkron `handleInbound(message, context)` yang ada; jangan memerlukan kunci atau akses internet untuk `npm test` maupun typecheck.
- Jalankan `npm test` dan `npm run typecheck`. Dengan kunci Gemini tersedia, gunakan `node scripts/probe-cakupan-gemini.ts` untuk membandingkan dengan baseline regex sebelum integrasi diaktifkan pada deployment; jangan mengklaim peningkatan cakupan tanpa hasil ukur.

## Comments

- Dasar implementasi: `docs/adr/0008-pemaham-bahasa-gemini-hibrida.md`, `docs/adr/0009-fokus-intake-kebutuhan.md`, `src/knowledge/geminiPemaham.ts`, dan `src/conversation/classifyDenganFallback.ts`.
- Handoff terbaru mencatat classifier Gemini belum terpasang ke runtime; regex telah mencapai 118/118 pada korpus yang ada. Karena itu integrasi tetap opt-in dan evaluasi probe/uji coba diperlukan sebelum mengaktifkannya untuk pengguna.
- 2026-10-13 — Selesai dikerjakan. Pemaham Gemini dipasang sebagai classifier opt-in di jalur webhook (`src/conversation/klasifikasiMasuk.ts`); `handleInbound(message, context, hasilKlasifikasi?)` tetap sinkron dan menerima hasil `InboundRouting` yang sudah dihitung, yang juga melekat pada giliran riwayat (`ConversationTurn.routing`) agar semua keputusan pesan itu konsisten saat riwayat diputar ulang. Keputusan dicatat di `docs/adr/0013-pemaham-gemini-di-jalur-webhook.md`.
- Pengaman yang dipasang: enam pemicu handoff berisiko tinggi tetap menang atas hasil model beserta alasan handoff spesifik regex (`putuskanDenganPengaman`); paling banyak satu pemahaman per pesan; pesan kosong/non-teks, pesan admin, dan kontak terjeda tidak dikirim ke pemaham; tenggat total 10 detik di jalur webhook dengan jatuh segera ke regex; hanya teks pesan yang dikirim ke Gemini dan tidak ada isi pesan/kunci/prompt yang dicatat ke log.
- Verifikasi: `npm test` 396 tes (392 lulus, 4 lompat yang sudah ada sebelumnya) dan `npm run typecheck` bersih, semuanya tanpa kunci Gemini dan tanpa jaringan. Baseline regex terukur ulang `node scripts/probe-cakupan-gemini.ts --tanpa-gemini` = 118/118 (tidak berubah). Probe jalur Gemini penuh belum dapat dijalankan dari lingkungan agent (tanpa `GEMINI_API_KEY`); jalankan `node scripts/probe-cakupan-gemini.ts` dengan kunci tersedia dan bandingkan dengan baseline sebelum integrasi diaktifkan pada deployment — belum ada klaim peningkatan cakupan.