# Handoff Sesi — 2026-10-01: Tiket 08 (transkrip CSV) selesai; kanal admin lolos uji

**Untuk sesi baru:** baca file ini lebih dulu. Pekerjaan berikutnya: keputusan celah
bentuk jamak "land arrangements", lalu cutover produksi tiket 06 (masih tertunda).
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru.

## Status repo (branch `main`)

Commit tiket 08: `2ee6810` feat: transkrip percakapan CSV untuk pemilik (tiket 08) —
berisi modul transkrip, wiring server, ADR-0007, README, tes, dan penutupan tiket.
Working tree bersih setelah commit handoff ini.

## Yang terjadi sesi ini (ringkas)

1. Pemilik memasukkan nomor produksi + token produksi ke `.env` (10:31), lalu
   **mengembalikan `.env` ke nomor pengembangan** `+62 895 0700 3830` + token perangkat
   dev (12:07) — uji dilakukan di nomor dev; cutover produksi ditunda.
   `npm run cutover:check` dengan `.env` dev = "belum siap" (wajar).
2. **Temuan penting — environment agent membawa nilai produksi:** proses pi/agent ini
   berjalan dengan variabel `WHATSAPP_SENDER_NUMBER=+62 877 4587 3159`,
   `WHATSAPP_API_TOKEN=<token produksi>`, dan `WHATSAPP_WEBHOOK_VERIFY_TOKEN` yang
   berbeda dari `.env`. Node `--env-file` **tidak menimpa** variabel yang sudah ada di
   environment → bot yang di-start dari environment agent memakai nomor/token produksi
   meskipun `.env` dev (gejala: log "nomor pengirim 6287745873159", probe webhook 401).
   Variabel ini **tidak ada** di User/Machine env Windows — hanya di environment sesi
   ini. Jangan start bot dari environment agent tanpa membersihkan dulu.
3. Bot di-start ulang bersih (variabel `WHATSAPP_*` dibuang di launcher): PID 18876,
   log `nomor pengirim 6289507003830`, `bot.err` kosong. Perintah start bersih ada di
   bagian "Cara start bot".
4. Webhook aktif (tunnel cloudflared PID 18400, URL belum berubah):
   `https://rouge-glance-row-forecast.trycloudflare.com/webhook?token=13Kbsp3w9cErpoWDUtag`
   Validasi: POST token benar → 400 "badan permintaan bukan JSON" (token diterima),
   token salah → 401. Fonnte memang tanpa handshake GET (GET /webhook → 404 by design).
5. **Smoke test nomor dev (pemilik):** sapaan ✅; "berapa harga hotel di mekah" ✅
   (`faqAnswered=1`, jawaban Harga Indikatif lengkap); "apa itu land arrangements" ❌
   (lihat temuan); "ya" → handoff ✅ (`handOffsForwarded=1`) dan **pemilik
   mengonfirmasi pesan handoff masuk ke ponsel admin `+62 822 8388 6627`**.
   → Kanal admin (ADR-0006) tervalidasi end-to-end pada nomor dev.
6. **Tiket 08 (transkrip CSV) dikerjakan sampai selesai (sesi ini):** port
   `ConversationTranscript` + implementasi `CsvConversationTranscript`
   (`src/conversationTranscript.ts`), di-wire di `src/server.ts` sebagai efek samping
   best-effort (gagal tulis → log, balasan tetap terkirim). Kolom `waktu` (WIB), `nomor`,
   `peran`, `pesan`; BOM + CRLF + escaping RFC 4180; berkas default
   `data/transkrip-percakapan.csv` dan `data/` masuk `.gitignore`. Tidak ada env var baru;
   seam percakapan, handoff ADR-0006, dan metrik tidak berubah. Keputusan dicatat di
   `docs/adr/0007-transkrip-percakapan-csv.md`; tiket 08 kini `resolved`. 174 tes hijau,
   `npm run typecheck` bersih.

## Temuan: celah bentuk jamak pada pencocokan FAQ

`src/knowledge/businessFaq.ts` memakai pola `\bland arrangement\b`; bentuk jamak alami
"land arrangement**s**" tidak cocok → `matchFaqTopic` null → `unsupported-question` →
handoff, padahal materi kita sendiri memakai "land arrangements". Bukti:

```
"Apa itu land arrangement?" -> land-arrangement  ✅
"apa itu land arrangements" -> null              ❌
```

Usulan (belum dikerjakan, menunggu keputusan pemilik): tambah bentuk jamak pada kata
kunci Inggris yang relevan (mis. `land arrangements?`) — test-first di
`tests/knowledge/businessFaq.test.ts` + tes percakapan terkait; **jangan ubah urutan
routing** (`classifyInbound`/`handleInbound`) dan invarian Harga Indikatif.

## Pekerjaan berikutnya

1. **Keputusan celah bentuk jamak "land arrangements"** (temuan sesi lalu, belum
   dikerjakan): `src/knowledge/businessFaq.ts` memakai pola `\bland arrangement\b`
   sehingga bentuk jamak alami tidak cocok → `unsupported-question` → handoff palsu.
   Usulan: tambah bentuk jamak `land arrangements?` — test-first di
   `tests/knowledge/businessFaq.test.ts` + tes percakapan terkait. Jangan ubah urutan
   routing (`classifyInbound`/`handleInbound`) maupun invarian Harga Indikatif.
   **Menunggu keputusan pemilik.**
2. Cutover produksi tiket 06 (`ready-for-human`) masih tertunda: `.env` kembali ke dev.
   Token produksi pernah diberikan pemilik via chat — **jangan disimpan di repo**;
   minta ulang saat cutover dilanjutkan.
3. (Keputusan pemilik, bila perlu) retensi/pemindahan `data/transkrip-percakapan.csv`
   ketika volumenya bertambah — sekarang masih berkas lokal yang diabaikan git
   (ADR-0007). Cara membaca: buka langsung di Excel/Google Sheets; satu baris per
   pesan teks, waktu WIB.

## Cara start bot (bersih dari override environment)

```powershell
powershell -NoProfile -Command "Set-Location 'C:\Users\Advan\.ab\chatbot';
  Remove-Item Env:WHATSAPP_SENDER_NUMBER,Env:WHATSAPP_API_TOKEN,Env:WHATSAPP_ADMIN_NUMBER,Env:WHATSAPP_WEBHOOK_VERIFY_TOKEN,Env:WHATSAPP_PROVIDER,Env:WHATSAPP_APP_SECRET,Env:WHATSAPP_PHONE_NUMBER_ID -ErrorAction SilentlyContinue;
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -RedirectStandardOutput 'C:\Users\Advan\.ab\chatbot\.scratch\tmp\bot.log' -RedirectStandardError 'C:\Users\Advan\.ab\chatbot\.scratch\tmp\bot.err' -WindowStyle Hidden"
```

Verifikasi log: `nomor pengirim 6289507003830` (dev) atau `6287745873159` (produksi).
Metrik: `http://localhost:3000/metrics`. Tunnel: `cloudflared tunnel --url http://localhost:3000`
(URL berubah bila restart → daftarkan ulang webhook di Fonnte).

## Konteks singkat (tidak berubah)

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam: `src/conversation/handleInbound.ts` (murni — jangan ubah bentuk `BotTurn`).
  Urutan `nextState`/`step` teruji **jangan diubah**; daftar lengkap + urutan entri
  `businessFaq.ts` ada di handoff sebelumnya (`git show d15efe9:.scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md`).
  Tes pelindung: `tests/conversation/followUpRequest.test.ts`, `handOffToAdmin.test.ts`,
  `handleInbound.test.ts` wajib hijau tanpa diubah.
- Kanal admin: `src/adminChannel.ts` (`WhatsAppAdminChannel`, ADR-0006); `deliver` boleh
  async dan **wajib ditunggu** (`src/server.ts` `runActions` sudah `await`).
- Modul pengetahuan: `src/knowledge/businessFaq.ts` (entri `price-*` di atas, urutan
  entri jangan diacak; invarian Harga Indikatif jangan dilonggarkan).
- Konfigurasi: `src/config.ts`; gerbang `npm run cutover:check` (`src/cutoverPreflight.ts`).
- Metrik: `src/metrics.ts` (`faqAnswered` termasuk `price-*`; `handOffsForwarded` hanya
  bila penerusan benar-benar berhasil).
- Riwayat percakapan tidak berpindah antar nomor (provider tidak mendukung).
- Identifier privat di `src/` bahasa Inggris; komentar/dokumen Bahasa Indonesia; helper
  tes boleh Bahasa Indonesia. Tes memeriksa perilaku terlihat pada seam.
- Issue tracker `.scratch/<feature-slug>/issues/NN-slug.md`; status akhir `resolved`.
- Selesai kerja: `/code-review` dulu, baru commit ke `main`; handoff sebagai commit
  `docs(handoff)` terpisah.

## Jebakan yang sudah diketahui (jangan diulang)

- **Environment pi/agent membawa `WHATSAPP_*` produksi** yang menimpa `.env` (Node
  `--env-file` tidak menimpa env yang sudah ada) — selalu start bot dengan cara bersih
  di atas.
- Kata `tersedia`/`available`/`penawaran`/`diskon` = handoff (`QUOTE_OR_AVAILABILITY_REQUEST`),
  bukan Harga Indikatif. Satuan tak tercantum materi → handoff `custom-quote-or-availability`.
- "Berapa harga paket umrah?" / "Berapa harga tour guide?" → handoff (angka tidak
  tercantum materi).
- Kata `document` (kata kerja) jatuh ke `visa-documents`; dokumentasi perjalanan =
  "dokumentasi"/"photographer".
- Invarian groundedness melarang literal `harga final|final price|fixed price|dijamin
  tersedia` dan `\d+\s?(hari|days?|malam|nights?)`; disclaimer wajib "bukan penawaran final".
- Materi transportasi memuat konflik mata uang (SAR vs IDR per grup) — sampaikan apa
  adanya; jangan memilih salah satunya.
- Fonnte: tanpa **Auto Read** webhook tidak pernah dipanggil; URL webhook berubah bila
  tunnel berubah → daftarkan ulang.
- Saat menambah variabel konfigurasi wajib: fixture tes ikut diperbarui (tests/config,
  tests/cutoverPreflight, tests/transport/*) — preseden `WHATSAPP_ADMIN_NUMBER`.

## Proses yang berjalan saat handoff ini ditulis

- Bot: PID 18876 — konfigurasi dev dari `.env`, port 3000.
- Tunnel: cloudflared PID 18400 (`https://rouge-glance-row-forecast.trycloudflare.com`).
- Tidak ada proses agent paralel lain yang diketahui.
