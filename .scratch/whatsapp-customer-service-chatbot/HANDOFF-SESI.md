# Handoff Sesi — 2026-10-07: bot hidup di Fonnte + keputusan lapisan pemaham LLM

> Handoff sebelumnya (2026-10-05) diarsipkan dalam riwayat git, judulnya
> "smoke test inbound terblokir 131030 (nomor uji Meta)". Sesinya berlanjut dan
> **masalahnya sudah ditemukan sebab aslinya** — baca bagian "Temuan utama".

## Ringkas: apa yang terjadi sesi ini

Dua babak.

**Babak 1 — infrastruktur (beres).** Melanjutkan sesi 2026-10-05 yang masih
bingung kenapa bot tidak pernah membalas. Penyebab aslinya **bukan** `.env`,
bukan token, bukan nomor: akun WhatsApp Business **dikunci Meta**. Setelah itu
diputuskan pindah ke Fonnte, dan **bot kini berfungsi penuh end-to-end** —
pesan masuk dibalas, terkonfirmasi dari transkrip dan dari log.

**Babak 2 — kualitas jawaban (belum selesai).** Pemilik menilai jawaban bot
"masih sangat terbatas". Dianalisis, diukur baseline-nya, dan disepakati
mengganti lapisan pemahaman dengan **LLM (Gemini)** sambil **mempertahankan
fakta/harga dari template manual**. Persiapan selesai (korpus, API key),
implementasinya menyusul di sesi berikutnya.

## Temuan utama

### 1. `131031 Business Account locked` — sebab asli "bot diam"

Ini yang paling penting. API Meta **selalu membalas HTTP 200 saat pesan diterima
untuk diantrekan**, bukan saat sudah sampai. Kegagalan antar baru dilaporkan
belakangan lewat webhook `statuses` — yang oleh kode bot **dibuang tanpa
catatan**. Jadi kegagalan pengantaran selama ini benar-benar tak terlihat.

Setelah logging ditambahkan, langsung ketahuan:

```
Status pengiriman WhatsApp: failed -> 6289507003830 — code 131031 Business Account locked
```

Status di `business.facebook.com/latest/whatsapp_manager` juga menyatakan
*"akun ini belum bisa mengirim pesan WhatsApp"*. Pemilik tidak dapat
menyelesaikan verifikasi bisnis saat ini.

**Konsekuensi:** jalur Meta Cloud API **terblokir sampai akun bisnis
terverifikasi/terbuka**. Jangan kembali ke Meta sebelum itu.

### 2. Provider Fonnte lebih aman daripada Meta untuk debugging

> "Fonnte membalas HTTP 200 meski penolakan, jadi keberhasilan ditentukan dari
> field status pada badan respons." — `src/adapters/fonnte/sender.ts`

Fonnte **melempar error bila gagal**, jadi kegagalan terlihat di log. Meta
mengembalikan 200 palsu yang menipu. Bedakan ini bila menguji.

### 3. Akun Fonnte masih hidup

```
{"device":"6289507003830","device_status":"disconnect","name":"mutawwifmu",
 "package":"Free","quota":"990","expired":"31 October 2026","status":true}
```

Tidak perlu daftar baru. Perangkat perlu scan ulang QR (kondisi: `disconnect`).

### 4. Keterbatasan jawaban = batas regex, bukan kurang pola

Baseline terukur menunjukkan pola tajam: **sempurna untuk kalimat baku, jatuh
untuk bahasa sehari-hari**. Ini lantai atas pencocokan aturan.

## Baseline terukur (simpan sebagai angka pembanding)

Pengukur: `node scripts/probe-cakupan.ts` — 41 kasus, 5 gaya bahasa.

| Metrik | Hasil |
| --- | --- |
| **Pertanyaan materi terjawab** | **24/33 (73%)** ← ukuran "leluasa memahami" |
| Rute tepat (jawab vs handoff) | 32/41 (78%) |
| Topik tepat | 30/41 (73%) |

Per gaya bahasa (rute tepat):

| Gaya | Hasil |
| --- | --- |
| baku | 9/9 (100%) |
| typo | 1/1 (100%) |
| gaul | 12/14 (86%) |
| **parafrase** | **9/14 (64%)** |
| **campur-inggris** | **1/3 (33%)** |

Sembilan kasus gagal — semuanya parafrase/gaul/campur Inggris, mis.
*"boleh minta pricelist?"*, *"budget buat nginep di makkah kira-kira berapa"*,
*"kendaraannya apa aja ya"*, *"keliling madinah bisa dibantu?"*.

## Keputusan desain: hibrida, fakta tetap manual

Diskusi menyinggung apakah "pencocokan samar" sama dengan "model klasifikasi".
Riset menyimpulkan **tidak sama** — lihat
`.scratch/whatsapp-customer-service-chatbot/riset-pencocokan-samar.md`.
Ringkasnya: Levenshtein & stemming Nazief-Adriani = **algoritma aturan**,
sedangkan fastText/BERT/LLM = **model terlatih**.

Pemilik memilih **hibrida**, dengan penegasan: *"yang penting bagi saya adalah bot
cukup leluasa untuk memahami bahasa indonesia"*. Jadinya:

| Aspek | Keputusan |
| --- | --- |
| Pemahaman bahasa | **LLM (Gemini)** — luwes, tangani gaul/typo/parafrase |
| Fakta & jawaban | Tetap dari template manual yang ditinjau |
| **Angka & harga** | **HANYA template manual. LLM dilarang menyentuh angka** |
| Saat ragu | Handoff ke admin — selalu tersedia |

Alasan pengaman angka tetap dipertahankan: spec baris 92 memasukkan *"mengarang
informasi tentang … **harga**"* sebagai **di luar cakupan/dilarang**. Satu angka
harga yang dikarang = satu masalah nyata dengan calon jemaah. Ini kebutuhan
bisnis, bukan selera arsitektur.

Empat lapis pengaman yang direncanakan: angka tak pernah digenerasi → validasi
grounding (setiap angka harus verbatim di materi) → ambang keyakinan → handoff.

## Perubahan kode sesi ini (BELUM di-commit)

| Berkas | Perubahan |
| --- | --- |
| `src/adapters/whatsapp-cloud/webhook.ts` | **`catatStatusPengiriman()`** — mencatat laporan status pengiriman Meta (sent/delivered/failed) + kode error-nya. **Inilah yang membongkar 131031.** |
| `scripts/probe-cakupan.ts` | **Baru** — pengukur cakupan pemahaman, baca `tests/korpus/*.json` |
| `tests/korpus/dasar.json` | **Baru** — 41 kasus uji bahasa Indonesia |
| `tests/korpus/README.md` | **Baru** — cara menambah korpus |
| `.scratch/.../riset-pencocokan-samar.md` | **Baru** — riset pencocokan samar vs model klasifikasi |

Dari **sesi sebelumnya**, masih terbawa belum di-commit dan **masih relevan**:

| Berkas | Perubahan |
| --- | --- |
| `src/adapters/whatsapp-cloud/sender.ts` | `jelaskanKegagalan()` — pesan error Graph API memuat `code`/`error_subcode` Meta, bukan hanya "HTTP 400" |
| `tests/adapters/whatsappCloudSender.test.ts` | 3 tes untuk itu (termasuk "token dan isi pesan tidak bocor ke pesan error") |

Kondisi terkini: **177 tes lulus, `npm run typecheck` bersih.**

## Kondisi runtime saat sesi ditutup

| Komponen | Status |
| --- | --- |
| Bot | ✅ Hidup, **PID 5148**, port 3000, provider **fonnte** |
| Tunnel cloudflared | ✅ Hidup, **PID 9412** |
| URL publik | `https://modifications-submit-missile-earrings.trycloudflare.com` |
| Webhook terdaftar di Fonnte | ✅ (terkonfirmasi: pesan masuk & dibalas) |

Bukti bot berfungsi — `data/transkrip-percakapan.csv`:

```
22:00:56  6285275258899  calon-jemaah  halo
22:00:56  6285275258899  asisten       Halo! Terima kasih sudah menghubungi MUTAWWIFMU...
22:01:13  6285275258899  calon-jemaah  boleh minta pricelist?
22:01:13  6285275258899  asisten       Mohon maaf ... mau saya teruskan ke tim ...?
```

## Konfigurasi `.env` (BERUBAH sesi ini)

Sekarang memakai **Fonnte**, bukan Meta:

```env
WHATSAPP_PROVIDER=fonnte
WHATSAPP_SENDER_NUMBER=+62 895 0700 3830
WHATSAPP_WEBHOOK_VERIFY_TOKEN=8e444e3723b64a2ee58d552f9186ffc6
WHATSAPP_API_TOKEN=13Kbsp3w9cErpoWDUtag
# WHATSAPP_API_BASE_URL dikosongkan → default https://api.fonnte.com
WHATSAPP_ADMIN_NUMBER=+62 822 8388 6627
```

Baru ditambahkan untuk lapisan pemaham LLM (sudah **divalidasi**: HTTP 200,
50 model tersedia):

```env
# --- Gemini (lapisan pemaham bahasa, lihat ADR-0008) ---
GEMINI_API_KEY=<nilai di .env — jangan pernah ditulis ke berkas mana pun>
GEMINI_MODEL=gemini-2.5-flash
```

Catatan: `WHATSAPP_PHONE_NUMBER_ID` dan `WHATSAPP_APP_SECRET` masih ada di
`.env` tapi **tidak dibaca** saat provider `fonnte` (hanya dipakai jalur Meta).

## Langkah untuk sesi berikutnya (urutan)

1. **Tulis ADR-0008** — mencatat penyimpangan dari ADR-0004 yang melarang
   jawaban generatif. ADR-0004 menyebut eksplisit: *"Bila kelak jawaban generatif
   dipertimbangkan, keputusan itu wajib dicatat ADR baru"*. Sertakan lapisan
   pengaman angka sebagai bagian keputusan, bukan catatan kaki.
2. **`src/knowledge/geminiPemaham.ts`** — lapisan pemaham bahasa. Panggil
   Gemini dengan `fetch` bawaan Node (sesuai ADR-0002: *"Panggilan API provider:
   `fetch` global"*) → **nol dependency npm baru**. Hasil terstruktur
   `{ rute, topik, keyakinan }`.
3. **Lapisan pengaman angka** — validasi otomatis; angka di jawaban harus ada
   verbatim di materi, kalau tidak → fallback handoff.
4. **Fallback ke regex** — bila Gemini error/timeout, turun ke jalur aturan lama.
   Bot tidak boleh diam hanya karena LLM mati. Sebaiknya diuji dengan tes
   "LLM tidak tersedia".
5. **Ukur ulang** dengan `node scripts/probe-cakupan.ts` — bandingkan **73%**
   (angka "leluasa memahami" sekarang) dengan hasil baru. Jangan klaim naik
   tanpa angka.
6. Baru setelah angkanya bagus, pikirkan memperluas jawaban dari `BOOKLET
   MUTAWWIFMU.md` & `HOTEL RATES MUTAWWIFMU (2).md` yang cakupannya masih jauh
   dari terpakai semua.

## Peringatan untuk sesi baru

- **URL tunnel berubah setiap restart.** cloudflared = *quick tunnel*, URL
  `trycloudflare.com` acak. Bila tunnel di-restart, **daftarkan ulang** URL
  webhook di dashboard Fonnte:
  `https://<url-baru>/webhook?token=8e444e3723b64a2ee58d552f9186ffc6`
- **Uji selalu dari HP lain.** `6289507003830` sekarang nomor bot, dan bot
  mengabaikan pesan dari nomornya sendiri. Penguji terakhir memakai
  `6285275258899`.
- **Jangan kembali ke Meta Cloud API** sebelum akun bisnis tidak lagi terkunci
  (131031) dan verifikasi bisnis selesai.
- **Angka/harga tidak boleh digenerasi LLM.** Ini larangan spec, bukan selera.
  Ada tes groundedness yang menjaganya — jangan dilonggarkan.
- **`GET /webhook` membalas 404 pada provider Fonnte — itu normal.** Fonnte
  hanya mengirim POST. Jangan dianggap rusak.

## Pekerjaan open yang masih tertunda

| Butir | Status |
| --- | --- |
| Commit perubahan kode sesi ini + sesi sebelumnya | belum |
| ADR-0008 (jawaban generatif hibrida) | belum ditulis |
| Modul `geminiPemaham.ts` | belum dibuat |
| Lapisan pengaman angka | belum dibuat |
| Ukur ulang cakupan (bandingan vs 73%) | belum |
| Smoke test lengkap alur handoff (`ya` → admin `+62 822 8388 6627`) | belum diuji sejak pindah Fonnte |
| VPS + domain tetap (pengganti tunnel, tiket 07) | belum |
| Nomor produksi `+62 877 4587 3159` (tiket 06) | tertunda, terkunci isu Meta |

## Cara start bot + tunnel

```bash
# Terminal 1 — bot (Windows: pakai Start-Process agar tahan lama)
node --env-file-if-exists=.env src/main.ts
# banner benar: "Bot WhatsApp MUTAWWIFMU siap — provider fonnte, nomor pengirim 6289507003830, port 3000"

# Terminal 2 — tunnel
cloudflared tunnel --url http://localhost:3000
# catat URL https://....trycloudflare.com → daftarkan ke Fonnte bila URL berubah

# Pemeriksaan cepat
curl http://localhost:3000/metrics
node scripts/probe-cakupan.ts
npm test && npm run typecheck
```

## Konteks singkat (tidak berubah)

- Bahasa komunikasi & dokumentasi: **Bahasa Indonesia** (AGENTS.md).
- Runtime: Node >= 22.18, TypeScript via type stripping, **tanpa dependency
  runtime** (ADR-0002).
- Seam percakapan provider-agnostic: `src/conversation/handleInbound.ts`
  (`handleInbound(message, context): BotTurn`) — **jangan dirusak**, 177 tes
  menjaganya.
- Materi bisnis: `BOOKLET MUTAWWIFMU.md`, `HOTEL RATES MUTAWWIFMU (2).md`.
- ADR di `docs/adr/`, spec & tiket di `.scratch/whatsapp-customer-service-chatbot/`.
- `data/` di-gitignore (data pribadi: transkrip + nomor). Korpus uji sengaja
  ditaruh di `tests/korpus/` agar **ter-versioning**.
