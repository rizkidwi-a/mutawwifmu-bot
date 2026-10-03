# Handoff Sesi — 2026-10-03: provider aktif pindah ke WhatsApp Cloud API (Meta)

**Untuk sesi baru:** baca file ini lebih dulu. Pekerjaan berikutnya: **smoke test masuk**
dari HP pemilik, lalu keputusan celah bentuk jamak "land arrangements", lalu cutover
produksi tiket 06.
**Aturan aktif:** bila konteks window sudah melewati 25%, buat handoff baru (perbarui
file ini) dan minta pengguna pindah ke sesi baru.

---

## Status repo (branch `main`)

Commit terakhir: **`feat: migrasi provider WhatsApp ke Meta Cloud API (tiket 09)`** —
jalankan `git log -1` untuk hash-nya (hash tidak ditulis di sini agar tidak basi).
**Working tree bersih.** Tidak ada remote — repo ini lokal saja (belum pernah dipush).

Perubahan kode satu-satunya: default `WHATSAPP_API_BASE_URL` dinaikkan `v21.0` → `v26.0`
di `src/config.ts` + ekspektasi di `tests/config.test.ts`. **174 tes hijau**,
`npm run typecheck` bersih.

`.gitignore` diperluas jadi `.env*` + `!.env.example` — penting, karena `.env.backup-fonnte`
berisi token Fonnte dan tidak boleh ter-commit.

Isi commit (10 berkas): `.env.example`, `.gitignore`, `HANDOFF-SESI.md`,
`issues/09-migrasi-ke-meta-cloud-api.md`, `README.md`, `docs/adr/0001-...md`,
`docs/tutorial-migrasi-ke-meta-cloud-api.md`, `scripts/wizard-migrasi-meta.sh`,
`src/config.ts`, `tests/config.test.ts`.

---

## Yang terjadi sesi ini (ringkas)

Pemilik sudah bisa login ke akun Meta Developer, jadi stak WhatsApp dipindahkan dari
**Fonnte (BSP, ADR-0003)** ke **WhatsApp Cloud API resmi Meta (ADR-0001)**.

1. **Perencanaan + panduan mandiri.** Dibuat `docs/tutorial-migrasi-ke-meta-cloud-api.md`
   (10 fase, 3 jalur nomor, troubleshooting, rollback) dan
   `scripts/wizard-migrasi-meta.sh` (wizard interaktif 11 stage: membuka URL dashboard,
   menangkap kredensial, menulis `.env`, memverifikasi handshake + kesehatan token).
2. **Pemilik memilih Jalur A** — memakai **nomor uji Meta**, sehingga nomor pengembangan
   `+62 895 0700 3830` tetap hidup di Fonnte (rollback selalu tersedia).
3. **Temuan: token pemilik salah jenis.** `debug_token` melaporkan `type=USER`,
   `expires_at=2026-10-03T06:00:00Z` (kedaluwarsa hari itu juga), tanpa scope
   `business_management` — itu token sementara dari tombol "Generate access token" di
   API Setup, bukan token System User.
4. **Akar masalah:** system user `test` (ID `61594777541499`) ada, tetapi **tidak punya
   aset yang ditetapkan** ("Tidak Ada Aset yang Ditetapkan"). Token apa pun dari sana
   tidak akan berizin.
5. **Pemilik meminta agent menjalankan dashboard-nya sendiri.** Dikerjakan lewat
   `tabbit-cli` (Playwright) pada sesi browser pemilik yang sudah login:
   - Business Settings → Pengguna sistem → `test` → **Tetapkan Aset**: app `tes`
     (`1113163604491910`) dengan **Akses penuh → Kelola Aplikasi**, dan
     **Test WhatsApp Business Account** → *"test dapat mengakses 2 aset bisnis"*.
   - **Buat token** untuk app `tes`, kedaluwarsa **"Jangan pernah"**, izin
     `business_management` + `whatsapp_business_messaging` + `whatsapp_business_management`.
     Token ditulis langsung ke `.env` tanpa ditampilkan di chat.
   - WhatsApp → Konfigurasi → Webhook: Callback URL + verify token → **Verifikasi dan
     simpan** berhasil; **field `messages` sudah berlangganan**.
6. `WHATSAPP_WEBHOOK_VERIFY_TOKEN` tadinya kosong → diisi 32 char acak.

---

## Konfigurasi `.env` sekarang (semua lewat konfigurasi, tanpa perubahan perilaku)

```
WHATSAPP_PROVIDER        = whatsapp-cloud-api
WHATSAPP_SENDER_NUMBER   = +1 555-631-6757        (nomor uji Meta)
WHATSAPP_PHONE_NUMBER_ID = 1463817500145110
WHATSAPP_API_BASE_URL    = https://graph.facebook.com/v26.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN = [terisi 32 char]
WHATSAPP_API_TOKEN       = [terisi 200 char — token System User permanen]
WHATSAPP_APP_SECRET      = [terisi 32 char]
WHATSAPP_ADMIN_NUMBER    = +62 822 8388 6627      (tidak berubah)
```

Cadangan rollback ke Fonnte: **`.env.backup-fonnte`** (diabaikan git). Kembalikan isinya
ke `.env` lalu restart bot.

---

## Bukti verifikasi (semua lolos)

| Uji | Hasil |
| --- | --- |
| `debug_token` | `valid=true`, `type=SYSTEM_USER`, `expires_at=0` (permanen), 3 izin lengkap |
| Baca Phone Number Id | `+1 555-631-6757` ("Test Number") |
| Handshake lewat tunnel publik | HTTP 200 + challenge `ping12345` dikembalikan |
| **Kirim pesan nyata** `POST /{id}/messages` ke `6289507003830` | HTTP 200 + `wamid` diterima |
| `npm run cutover:check` | `[OK] provider-config`, `[OK] production-sender-number`, status **siap** |
| `npm test` / `npm run typecheck` | 174 hijau / bersih |

---

## Pekerjaan berikutnya

1. **Smoke test MASUK (belum dikerjakan — butuh HP pemilik).** Pemilik mengirim pesan
   WhatsApp dari `+62 895 0700 3830` (sudah terdaftar sebagai penerima uji di API Setup)
   ke `+1 555-631-6757`. Alur yang diharapkan:
   - `Halo` → balasan sapaan asisten otomatis
   - `Apa itu land arrangement?` → dijawab dari materi, tanpa handoff
   - `Saya mau bicara dengan manusia saja` lalu `ya` → **akan GAGAL** karena nomor admin
     belum terdaftar sebagai penerima uji (lihat peringatan 2)
   - `curl http://localhost:3000/metrics` → `faqAnswered` / `handOffsForwarded` bertambah
2. **Keputusan celah bentuk jamak "land arrangements"** (temuan sesi 2026-10-01, MASIH
   terbuka). `src/knowledge/businessFaq.ts:247` memakai pola
   `\bland arrangement\b` sehingga bentuk jamak alami tidak cocok →
   `unsupported-question` → handoff palsu. Usulan: tambah bentuk jamak `land arrangements?`
   — test-first di `tests/knowledge/businessFaq.test.ts` + tes percakapan terkait.
   **Jangan ubah urutan routing** (`classifyInbound`/`handleInbound`) maupun invarian
   Harga Indikatif. **Menunggu keputusan pemilik.**
3. **Cutover produksi tiket 06** (`ready-for-human`) masih tertunda. Nomor produksi
   `+62 877 4587 3159` sudah ditetapkan pemilik. Untuk nomor produksi, jalur Cloud API
   menuntut nomor dilepas dari aplikasi WhatsApp biasa dulu (lihat tutorial, Fase 8).
4. **ADR baru untuk provider produksi.** ADR-0003 menyatakan keputusan provider produksi
   diambil ulang lewat ADR terpisah. Setelah Cloud API terbukti stabil, ADR itu perlu
   ditulis (menggantikan ADR-0003 sebagai pilihan produksi). Fonnte tetap tersedia
   sebagai jalur cadangan lewat konfigurasi.
5. **Tiket 07** (`needs-info`) — sisa penghalangnya penempatan bot di VPS dengan URL
   webhook stabil. Ini sekarang lebih mendesak: URL `trycloudflare` bersifat sementara.

---

## Peringatan penting untuk sesi baru

1. **URL tunnel bersifat sementara.** URL aktif sesi ini:
   `https://meetup-scientists-planning-retailer.trycloudflare.com`
   Kalau tunnel restart, **URL berubah** dan webhook **wajib didaftarkan ulang** di
   dashboard Meta (WhatsApp → Konfigurasi → Webhook). Untuk 24/7 perlu VPS + domain tetap.

2. **Handoff ke admin akan gagal sekarang.** Nomor admin `+62 822 8388 6627` **belum**
   ada di daftar penerima uji (API Setup → kolom **To**). Menambahkannya butuh verifikasi
   kode di HP admin. Uji handoff sebaiknya setelah pindah ke nomor produksi.

3. **Aplikasi Meta yang dipakai bernama `tes`** (`1113163604491910`), bukan nama resmi
   MUTAWWIFMU. Berfungsi penuh karena nomor uji Meta memang milik app itu. Untuk produksi
   sebaiknya app dengan nama tampilan bisnis yang benar.

4. **Override environment (pernah terjadi di sesi 2026-10-01).** Environment agent pernah
   membawa `WHATSAPP_SENDER_NUMBER` / `WHATSAPP_API_TOKEN` / `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   yang **menimpa** `.env`, karena Node `--env-file` tidak menimpa variabel yang sudah ada.
   Di sesi 2026-10-03 variabel itu **tidak ada** (sudah bersih), tetapi periksa dulu:
   `env | grep -i '^WHATSAPP'` — harus kosong. Bila tidak, bersihkan sebelum `npm start`.

5. **Proses bot sesi ini dijalankan agent lewat `nohup`** (PID 20440, log `bot-live.log`).
   Proses ini bisa mati saat sesi berakhir — **start ulang dengan cara di bawah**.

---

## Cara start bot + tunnel

```bash
cd "C:/Users/Advan/.ab/chatbot"

# pastikan environment bersih dulu
env | grep -i '^WHATSAPP'        # harus kosong

nohup npm start > bot-live.log 2>&1 &
nohup cloudflared tunnel --url http://localhost:3000 > tunnel-live.log 2>&1 &
sleep 20
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' tunnel-live.log | tail -1
```

Log yang benar: `Bot WhatsApp MUTAWWIFMU siap — provider whatsapp-cloud-api,
nomor pengirim 15556316757, port 3000`.

Bila URL tunnel berubah, daftarkan ulang di dashboard Meta. Verifikasi handshake lokal:

```bash
node --env-file-if-exists=.env -e '
const b = "https://<url-tunnel>";
fetch(b + "/webhook?hub.mode=subscribe&hub.challenge=ping&hub.verify_token=" + encodeURIComponent(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN))
  .then(async r => console.log(r.status, (await r.text()).trim()));
'
```

---

## Alat yang dipakai sesi ini (bila perlu lagi)

- **Otomasi browser:** `tabbit-cli` di
  `%LOCALAPPDATA%\Tabbit\LocalAgent\bin\tabbit-cli.exe`. Bekerja pada sesi browser
  pemilik yang sudah login. Catatan penting yang ditemukan:
  - konteks JS luar **tidak punya** `document` (pakai `page.evaluate`) dan **tidak
    mewarisi environment shell** — nilai rahasia harus disubstitusi ke berkas skrip
    (pola: tulis skrip dengan placeholder, `sed` isi token, jalankan
    `tabbit-cli nodejs ... < berkas`).
  - halaman dashboard Meta sering perlu tab diklik lewat JS (klik biasa terhalang overlay).
- **Verifikasi Graph API langsung** lebih cepat daripada menebak di dashboard:
  `GET /debug_token?input_token=...&access_token=...` mengungkap tipe token, masa
  berlaku, dan daftar izin.

---

## Konteks singkat (tidak berubah)

- Proyek: bot WhatsApp MUTAWWIFMU. Spec: `.scratch/whatsapp-customer-service-chatbot/spec.md`.
- Seam: `src/conversation/handleInbound.ts` — provider-agnostic; **tidak disentuh** sesi ini.
- Port: `AdminChannel` (`src/adminChannel.ts`), `Metrics` (`src/metrics.ts`),
  `ConversationStore` (`src/conversationStore.ts`), `ConversationTranscript`
  (`src/conversationTranscript.ts`).
- Adapter: `src/adapters/factory.ts` memilih provider dari `WHATSAPP_PROVIDER`;
  `src/adapters/whatsapp-cloud/` (aktif) dan `src/adapters/fonnte/` (cadangan).
- Tiket 01–05, 08 `resolved`. Tiket 06 `ready-for-human`, 07 `needs-info`,
  09 `ready-for-human`.
- Handoff sebelumnya (arsip): lihat riwayat commit `334d568` bila butuh detail tiket 08
  dan temuan kanal admin.
