# Migrasi ke WhatsApp Cloud API (Meta) — Panduan untuk Pemilik

> **Cara tercepat:** jalankan wizard interaktif yang memandu langkah ini satu per
> satu, membuka URL dashboard Meta, dan menulis kredensial ke `.env` otomatis:
>
> ```bash
> bash scripts/wizard-migrasi-meta.sh
> ```
>
> Wizard bisa dihentikan kapan saja dengan Ctrl-C dan dilanjutkan lagi — nilai
> yang sudah tersimpan di `.env` ditawarkan sebagai default. Dokumen di bawah ini
> adalah versi bacaan dari langkah yang sama, plus penjelasan alasannya.
>
> Sebelum mulai, wizard otomatis membuat salinan `.env` ke `.env.backup-fonnte`
> sebagai titik balik ke Fonnte (berkas itu sudah diabaikan git).

Panduan ini membawa Anda dari provider **Fonnte** (BSP, ADR-0003) ke **WhatsApp
Cloud API** resmi Meta (ADR-0001), langkah demi langkah, tanpa perlu agent.

Kode Cloud API **sudah ada** di repo ini (`src/adapters/whatsapp-cloud/`). Migrasi
ini **tidak mengubah perilaku percakapan** — hanya konfigurasi dan langkah
verifikasi di dashboard Meta. Adapter Fonnte tetap ada sebagai cadangan, jadi
keputusan ini bisa dibatalkan lewat satu baris `.env`.

---

## Kondisi sekarang

| Hal | Nilai |
| --- | --- |
| Provider aktif | `fonnte` |
| Nomor pengirim | `+62 895 0700 3830` |
| Kredensial Meta di `.env` | `WHATSAPP_PHONE_NUMBER_ID` dan `WHATSAPP_APP_SECRET` **kosong** |
| Adapter Cloud API | sudah ada, belum pernah dipakai secara live |
| Perilaku percakapan (FAQ, harga, handoff) | provider-agnostic — tidak disentuh |

---

## Pilih jalur dulu (baca ini sebelum mulai)

Cloud API Meta **menolak nomor yang masih terdaftar di aplikasi WhatsApp biasa
atau WhatsApp Business**. Nomor pengembangan `+62 895 0700 3830` saat ini
terdaftar di WhatsApp biasa (itulah cara Fonnte bekerja lewat QR). Karena satu
nomor tidak bisa dipakai dua tempat, artinya:

> Memindahkan nomor itu ke Meta = **koneksi Fonnte putus** + akun WhatsApp di
> nomor itu harus dilepas + setelah terdaftar di Cloud API, nomor itu **tidak
> bisa dibuka lagi di aplikasi WhatsApp biasa**.

Pilih salah satu:

| Jalur | Nomor yang dipakai | Fonnte | Risiko | Untuk siapa |
| --- | --- | --- | --- | --- |
| **A — Nomor uji Meta** (disarankan) | Nomor uji gratis yang Meta sediakan otomatis | tetap hidup | nol | Membuktikan Cloud API berjalan sebelum menyentuh nomor sendiri |
| **B — Nomor pengembangan** | `+62 895 0700 3830` | putus, tidak bisa dipakai lagi | tinggi | Hanya bila nomor itu memang tidak dipakai lagi |
| **C — Nomor produksi** | `+62 877 4587 3159` | tidak terpengaruh | tinggi | Cutover produksi (tiket 06); nomor itu juga harus lepas dari WhatsApp biasa |

**Panduan ini mengasumsikan Jalur A.** Bagian "Fase 8" menambahkan langkah
khusus bila Anda memilih Jalur B/C. Jalur A punya keterbatasan: nomor uji hanya
bisa mengirim ke maksimal **5 nomor penerima** yang Anda daftarkan di dashboard —
cukup untuk smoke test, tidak untuk produksi.

---

## Yang perlu disiapkan

- [ ] Akun Meta Developer: <https://developers.facebook.com/> (Anda sudah punya).
- [ ] **Meta Business Portfolio** — boleh dibuat baru saat membuat app (Fase 1).
- [ ] Nomor HP Anda sendiri untuk menerima pesan uji (masukkan ke daftar penerima
      nomor uji, Fase 2).
- [ ] Mesin yang menjalankan repo ini, dengan `npm install` sudah dijalankan.
- [ ] Salah satu tunnel HTTPS (Fase 6): `ngrok` atau `cloudflared`.
- [ ] Terminal tempat bot berjalan **harus tetap hidup** selama Fase 6–7: Meta
      mengirim handshake ke bot saat Anda mendaftarkan webhook.

Ringkasan modal waktu: Fase 1–2 ±15 menit, Fase 3–5 ±15 menit, Fase 6–9 ±30
menit. Bisa dihentikan di antar fase dan dilanjutkan nanti — wizard tidak
menghapus apa pun sampai Fase 8.

---

## Fase 1 — Buat Meta App dengan use case WhatsApp

1. Buka <https://developers.facebook.com/apps>.
2. Klik **Create App**.
3. Isi **App name** (mis. `MUTAWWIFMU Chatbot`) dan **email kontak**, klik **Next**.
4. Pilih use case **Connect with customers through WhatsApp**, klik **Next**.
5. Pilih **Business portfolio**: pilih yang sudah ada, atau **create a new one**.
6. Lewati daftar **publishing requirements** (boleh kosong untuk sekarang), **Next**.
7. Periksa ringkasan, klik **Create app**.

Anda akan mendarat di **Customize use case → Connect on WhatsApp → Quickstart**.

✅ **Fase 1 selesai = app WhatsApp + WABA sudah ada.**

---

## Fase 2 — Hubungkan WABA dan catat Phone Number Id (+ tambahkan penerima uji)

1. Di halaman **Quickstart**, klik **Start using the API** → Anda masuk ke
   **API Setup**.
2. Di bagian **API Setup**, hubungkan app ke **WhatsApp Business Account (WABA)**:
   - **WABA yang sudah ada** → pilih dari dropdown.
   - **Belum ada** → klik **Create a WhatsApp Business account**, ikuti promptnya.
3. Setelah terhubung, panel **API Setup** menampilkan:
   - **WhatsApp Business Account ID** — simpan (opsional, untuk rujukan).
   - Dropdown **From** berisi **nomor uji** Meta beserta **Phone number ID**-nya.
4. **Catat Phone number ID nomor uji itu.**
5. Di bagian **To**, tambahkan **nomor HP Anda sendiri** sebagai penerima uji.
   Nomor uji Meta hanya boleh mengirim ke nomor yang terdaftar di sini (batas 5).
6. Klik **Send message** untuk mengirim pesan uji, lalu **balas** pesan itu dari
   HP Anda. Ini membuka jendela layanan 24 jam, syarat bot boleh mengirim pesan
   teks bebas (non-template) saat smoke test.

> Simpan `Phone number ID` itu — di Fase 8 ia menjadi `WHATSAPP_PHONE_NUMBER_ID`.

✅ **Fase 2 selesai = identitas nomor pengirim di tangan + penerima uji terdaftar.**

---

## Fase 3 — Ambil App Secret

1. Di dashboard app, buka **App settings → Basic**.
2. Pada baris **App secret**, klik **Show**, masukkan password akun Facebook Anda.
3. **Salin nilainya** — ini untuk `WHATSAPP_APP_SECRET`.

Fungsi nilai ini: memverifikasi bahwa webhook yang masuk benar-benar dari Meta
(tanda tangan `X-Hub-Signature-256`). Tanpa ini, bot menolak semua pesan masuk
dengan `401 tanda tangan tidak sah`.

> Perlakukan App Secret seperti password. Jangan di-commit, jangan dikirim ke chat.
> `.env` sudah diabaikan git.

✅ **Fase 3 selesai = App Secret di tangan.**

---

## Fase 4 — Buat token akses permanen (System User)

Token sementara di dashboard cepat kedaluwarsa dan tidak layak untuk bot 24/7.

1. Buka **Business Settings**: <https://business.facebook.com/latest/settings>.
2. Di bilah sisi, klik **System users** (Pengguna sistem).
3. Klik **Add+** di kanan atas, buat pengguna sistem baru (mis. `mutawwifmu-bot`,
   peran **Admin**), ikuti promptnya.
4. Pilih pengguna sistem tadi → klik **Assign Assets**:
   - Pilih **app** Anda → aktifkan **Manage app** di bagian **Full control**.
   - Pilih **WhatsApp account** Anda → aktifkan **Manage WhatsApp Business
     accounts** di bagian **Full control**.
   - Klik **Assign assets**.
5. Klik **Generate token**, lalu tambahkan izin berikut:
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. **Salin token** yang muncul — ini untuk `WHATSAPP_API_TOKEN`.

> Token ini **hanya ditampilkan sekali**. Kalau terlewat, buat ulang.

✅ **Fase 4 selesai = token permanen di tangan.**

---

## Fase 5 — Tentukan Verify Token webhook

Ini **bukan** nilai dari Meta — Anda yang mengarangnya. Fungsinya: Meta
mengirimnya saat handshake pendaftaran webhook, dan bot membandingkannya dengan
nilai di `.env`.

1. Buat string acak, mis.:
   - PowerShell: `-join ((48..57) + (97..122) | Get-Random -Count 32 | % {[char]$_})`
   - atau cukup ketik frasa acak panjang yang hanya Anda tahu.
2. Simpan untuk `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

> Bila Anda sudah punya nilai ini di `.env` dari era Fonnte, **boleh dipakai
> ulang** — nilainya netral terhadap provider. Yang penting: nilai di `.env` dan
> nilai yang Anda ketik di dashboard Meta (Fase 7) harus **sama persis**.

✅ **Fase 5 selesai = verify token ditentukan.**

---

## Fase 6 — Hidupkan bot dan URL HTTPS publik

Meta memanggil webhook Anda lewat HTTPS publik. Untuk pengembangan, pakai tunnel.

1. Terminal 1 — jalankan bot. **Belum perlu ubah `.env`**; bot masih melayani
   Fonnte. Yang kita butuh di fase ini hanya prosesnya hidup:

   ```bash
   npm start
   ```

2. Terminal 2 — buka tunnel ke port bot (default `3000`):

   ```bash
   ngrok http 3000
   # atau: cloudflared tunnel --url http://localhost:3000
   ```

3. **Catat URL HTTPS publiknya**, mis. `https://abcd-1234.ngrok-free.app`.

4. Uji dari terminal ketiga bahwa endpoint webhook benar-benar hidup. Pada
   provider `fonnte` yang sedang aktif, `GET /webhook` memang membalas 404 —
   itu **normal** dan bukan indikator masalah di fase ini:

   ```bash
   curl -i https://<url-publik-anda>/webhook
   ```

> URL tunnel biasa berubah setiap restart. Kalau tunnel Anda restart, ulangi
> Fase 7. Untuk operasional 24/7 (dan saat cutover produksi), bot sebaiknya
> pindah ke VPS dengan domain tetap — itu di luar cakupan panduan ini.

✅ **Fase 6 selesai = bot hidup dan punya URL HTTPS publik.**

---

## Fase 7 — Daftarkan webhook di Meta dan subscribe field `messages`

Ini bagian yang paling mudah salah. Kerjakan **sambil bot tetap hidup**.

### 7a. Ubah `.env` ke Cloud API lebih dulu

Meta akan langsung mengirim handshake ke bot saat Anda menekan **Verify and
save**. Bot harus sudah memakai provider Cloud API dengan verify token yang
benar **saat itu**, jadi tukar konfigurasi dulu:

Buka `.env` dan ubah/isi baris berikut:

```env
WHATSAPP_PROVIDER=whatsapp-cloud-api
WHATSAPP_SENDER_NUMBER=<nomor uji Meta, mis. 15551234567>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<dari Fase 5>
WHATSAPP_PHONE_NUMBER_ID=<Phone number ID dari Fase 2>
WHATSAPP_API_TOKEN=<token permanen dari Fase 4>
WHATSAPP_APP_SECRET=<App Secret dari Fase 3>
WHATSAPP_API_BASE_URL=https://graph.facebook.com/v26.0
```

Catatan:
- `WHATSAPP_SENDER_NUMBER` = nomor uji Meta (digit saja atau dengan tanda `+`,
  keduanya diterima; bot menormalkannya).
- `WHATSAPP_ADMIN_NUMBER` **jangan diubah**.
- `WHATSAPP_API_BASE_URL` boleh dihilangkan untuk memakai default kode. Nilai
  yang didukung dicatat di <https://developers.facebook.com/docs/graph-api/changelog>.

Restart bot (Ctrl+C di Terminal 1, lalu `npm start`). Banner yang benar:

```
Bot WhatsApp MUTAWWIFMU siap — provider whatsapp-cloud-api, nomor pengirim <nomor uji>, port 3000
```

### 7b. Daftarkan webhook

1. Di dashboard app: **WhatsApp → Configuration**.
2. Pada bagian **Webhook**, klik **Edit**.
3. Isi:
   - **Callback URL**: `https://<url-publik-anda>/webhook`
   - **Verify token**: nilai `WHATSAPP_WEBHOOK_VERIFY_TOKEN` Anda (persis sama)
4. Klik **Verify and save**. Meta mengirim `GET /webhook?hub.mode=subscribe&...`
   ke bot Anda.
   - Berhasil → dialog tertutup tanpa error.
   - Gagal → lihat Troubleshooting.
5. Setelah tersimpan, klik **Manage** di samping field webhook, lalu
   **subscribe** field **`messages`**. Tanpa langganan field ini, Meta tidak
   pernah mengirim pesan masuk ke bot — bot akan diam.

Verifikasi cepat dari sisi bot (opsional, setelah webhook tersimpan) — handshake
yang benar membalas nilai challenge:

```bash
curl -i "https://<url-publik-anda>/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=12345"
# harus: HTTP 200 dan badan respons berisi 12345
```

✅ **Fase 7 selesai = webhook terverifikasi dan field `messages` berlangganan.**

---

## Fase 8 — Pastikan konfigurasi siap

```bash
npm run cutover:check
```

Harus berakhir dengan:

```
Status: siap untuk uji end-to-end pada nomor produksi.
```

> Pemeriksaan ini hanya menilai konfigurasi lokal (kelengkapan kredensial provider
> + nomor pengirim bukan nomor pengembangan). Verifikasi nomor di Meta dan smoke
> test tetap manual — itu memang Fase 9.

### Bila Anda memilih Jalur B atau C (nomor sendiri)

Tambahan sebelum menjalankan `cutover:check`:

- **B — nomor pengembangan** `+62 895 0700 3830`:
  1. Hentikan perangkat di dashboard Fonnte (atau biarkan — begitu nomor
     terdaftar di Meta, koneksi QR-nya mati sendiri).
  2. Buka WhatsApp di HP nomor itu → **Pengaturan → Akun → Hapus akun saya**
     (nomor harus bersih dari aplikasi WhatsApp sebelum bisa didaftarkan ke Cloud API).
  3. Dashboard Meta → **WhatsApp → Phone numbers → Add phone number**, isi nomor,
     verifikasi lewat **SMS atau telepon (OTP)**.
  4. Catat **Phone number ID baru**, ganti `WHATSAPP_PHONE_NUMBER_ID` dan
     `WHATSAPP_SENDER_NUMBER`.
- **C — nomor produksi** `+62 877 4587 3159`: langkah sama seperti B, lalu ikuti
  juga smoke test dan langkah kontak publik di tiket 06 /
  `docs/tutorial-cutover-nomor-produksi.md`.

> Nomor yang sudah didaftarkan ke Cloud API **tidak bisa dibuka lagi di aplikasi
> WhatsApp biasa**. Pastikan Anda memang siap melepas nomor itu.

✅ **Fase 8 selesai = konfigurasi menyatakan siap.**

---

## Fase 9 — Smoke test end-to-end

Dari **HP yang sudah terdaftar sebagai penerima uji** (Fase 2), kirim pesan ke
nomor uji Meta:

- [ ] **9.1** Kirim `Halo` → bot membalas sapaan asisten otomatis (bahasa ikut
      bahasa Anda). Kalau tidak ada balasan, lihat Troubleshooting baris pertama.
- [ ] **9.2** Kirim `Apa itu land arrangement?` → dijawab dari materi, **tanpa**
      handoff.
- [ ] **9.3** (opsional) Kirim `Berapa harga hotel di Mekkah?` → menyebut "Harga
      Indikatif" dan konflik satuan per orang vs per kamar.
- [ ] **9.4** Kirim `Saya mau bicara dengan manusia saja`, lalu balas `ya` →
      balasan menyatakan diteruskan, **dan pesan handoff masuk ke HP admin
      `+62 822 8388 6627`**.

      > Handoff dikirim lewat provider yang sama. Pada nomor uji Meta, pesan ke
      > nomor admin juga tunduk pada daftar penerima uji 5 nomor. Pastikan nomor
      > admin `+62 822 8388 6627` ada di daftar **To** di API Setup, atau langkah
      > ini akan gagal kirim.

- [ ] **9.5** Cek metrik:

      ```bash
      curl http://localhost:3000/metrics
      ```

      `faqAnswered` naik setelah 9.2, `handOffsForwarded` naik setelah 9.4.

- [ ] **9.6** Cek regresi otomatis:

      ```bash
      npm test
      npm run typecheck
      ```

      Keduanya harus bersih.

✅ **Fase 9 selesai = Cloud API Meta terbukti end-to-end.**

---

## Fase 10 — Simpan jejak & lanjutkan

- [ ] Catat di tiket `.scratch/whatsapp-customer-service-chatbot/issues/09-*.md`
      hasil tiap langkah di atas.
- [ ] Bila Cloud API sudah stabil dan Anda siap menjadikannya provider produksi,
      minta agent menulis **ADR baru** yang menggantikan ADR-0003 sebagai pilihan
      produksi (ADR-0003 sendiri sudah menyatakan keputusan produksi diambil ulang
      lewat ADR terpisah).
- [ ] Jalur produksi (nomor tetap, VPS, kontak publik) tetap mengikuti
      `docs/tutorial-cutover-nomor-produksi.md`.

### Mengembalikan ke Fonnte (rollback)

Satu baris `.env`, lalu restart:

```env
WHATSAPP_PROVIDER=fonnte
WHATSAPP_API_TOKEN=<token perangkat Fonnte>
```

Adapter Fonnte tidak dihapus, jadi rollback selalu tersedia selama Anda tidak
melepas nomor dari aplikasi WhatsApp (yaitu selama Anda memakai Jalur A).

---

## Troubleshooting

| Gejala | Penyebab yang paling sering | Perbaikan |
| --- | --- | --- |
| Handshake Fase 7 gagal ("URL couldn't be validated") | Bot belum jalan, URL tunnel salah/berubah, atau verify token tidak sama persis | Pastikan `npm start` hidup, cek ulang URL tunnel, samakan verify token di `.env` dan dashboard |
| Handshake berhasil, tapi bot tidak pernah membalas | Field **`messages`** belum di-subscribe; atau handshake dilakukan sebelum `WHATSAPP_PROVIDER` diubah | Fase 7.5 (Manage → subscribe `messages`); pastikan bot sudah `whatsapp-cloud-api` saat verify |
| `POST /webhook` ditolak `401 tanda tangan tidak sah` | `WHATSAPP_APP_SECRET` salah/kosong, atau app berbeda | Samakan dengan App Secret app yang benar (Fase 3) |
| Bot start dengan nilai yang tidak sesuai `.env` | Variabel shell menimpa `.env` | PowerShell: `$env:WHATSAPP_API_TOKEN`, `$env:WHATSAPP_PROVIDER` — hapus bila ada |
| Pengiriman gagal `HTTP 400` dari Graph API | Versi Graph tidak dikenal, atau penerima tidak ada di daftar uji | Set `WHATSAPP_API_BASE_URL=https://graph.facebook.com/v23.0`; daftarkan penerima di API Setup |
| Pengiriman gagal `HTTP 401/403` | Token kedaluwarsa atau izin kurang | Buat ulang token system user dengan 3 izin di Fase 4 |
| Balasan keluar dari nomor yang salah | `WHATSAPP_SENDER_NUMBER` / `WHATSAPP_PHONE_NUMBER_ID` tidak sinkron | Keduanya harus merujuk nomor yang sama |
| Pesan dari HP sendiri diabaikan | Memang desain: bot mengabaikan pesan dari nomor bot sendiri | Gunakan HP/nomor lain sebagai pengirim |

---

## Referensi

- Cloud API Get Started: <https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started>
- Webhook & validasi tanda tangan: <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint>
- Token akses: <https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens>
- Nomor telepon bisnis (verifikasi OTP): <https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers>
- Versi Graph API & masa berlaku: <https://developers.facebook.com/docs/graph-api/changelog>
- Runbook internal: `docs/whatsapp-number-cutover.md`
- Keputusan provider: `docs/adr/0001-provider-whatsapp-cloud-api.md`, `docs/adr/0003-provider-bsp-fonnte.md`
