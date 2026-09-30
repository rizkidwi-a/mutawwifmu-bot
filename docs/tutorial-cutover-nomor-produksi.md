# Tutorial Cutover ke Nomor Produksi — Panduan untuk Pemilik

Panduan ini disusun agar Anda dapat menjalankan sendiri cutover ke nomor produksi
**`+62 877 4587 3159`** dalam satu sesi kerja, besok. Ikuti urutan fase di bawah apa
adanya — fase 1 sengaja diletakkan paling awal karena paling cepat dan memastikan
jalur handoff ke admin sudah hidup sebelum nomor produksi disentuh.

Kondisi saat tutorial ini ditulis:

| Hal | Nilai |
| --- | --- |
| Nomor pengembangan (aktif sekarang) | `+62 895 0700 3830` (Fonnte) |
| Nomor produksi (akan diaktifkan) | `+62 877 4587 3159` |
| Nomor admin penerima handoff | `+62 822 8388 6627` (sudah dikonfigurasi, ADR-0006) |
| Provider aktif | Fonnte (`WHATSAPP_PROVIDER=fonnte`) |
| Konfigurasi | `.env` di root repo; nomor produksi **belum** di-swap |

---

## Ringkasan urutan (baca dulu, 2 menit)

1. **Uji kanal admin** dengan nomor pengembangan (Fase 1, ±10 menit).
2. **Verifikasi nomor produksi di Fonnte** (Fase 2, ±30 menit — bagian terpanjang).
3. **Ganti konfigurasi** ke nomor produksi + `npm run cutover:check` (Fase 3, ±10 menit).
4. **Smoke test end-to-end** dari ponsel ke nomor produksi (Fase 4, ±10 menit).
5. **Cek kontak publik** + lapor hasil ke agent (Fase 5, ±10 menit).

Sebelum mulai, pastikan tiga hal ini siap:

- [ ] Ponsel dengan SIM `+62 877 4587 3159` hidup dan bisa menerima SMS/telepon (untuk OTP/verifikasi bila diminta).
- [ ] Bisa login ke dashboard **Fonnte** (akun yang sama dengan yang dipakai nomor pengembangan).
- [ ] Ponsel admin `+62 822 8388 6627` di tangan, dan mesin yang menjalankan bot bisa diakses.

---

## Fase 1 — Uji kanal admin dengan nomor pengembangan (kerjakan ini pertama-tama)

Tujuan: memastikan handoff benar-benar sampai ke `+62 822 8388 6627` **sebelum**
nomor produksi disentuh. Konfigurasi nomor admin sudah terisi di `.env`; proses bot
hanya perlu di-restart agar memuatnya.

- [ ] **1.1** Jalankan bot dari folder repo:

  ```bash
  npm start
  ```

  Tampilan yang benar: `Bot WhatsApp MUTAWWIFMU siap — provider fonnte, nomor pengirim 6289507003830, port 3000`.

- [ ] **1.2** Dari ponsel lain (bukan nomor bot), kirim WhatsApp ke nomor pengembangan
  `+62 895 0700 3830`:

  > Saya mau bicara dengan manusia saja

- [ ] **1.3** Bot meminta persetujuan. Balas:

  > ya

- [ ] **1.4** **Cek ponsel admin `+62 822 8388 6627`.** Pesan handoff harus masuk dari
  nomor bot, berisi alasan "Permintaan berbicara dengan manusia", nomor Anda
  (pengirim pesan tadi), dan konteks percakapan.

- [ ] **1.5** Di ponsel penguji tadi, balasan bot menyatakan percakapan **telah
  diteruskan** (tanpa janji waktu balasan admin).

Bila 1.4 tidak masuk: cek log proses bot (isi handoff selalu tercatat di sana sebagai
jejak audit), pastikan nomor admin tidak memblokir nomor bot, dan pastikan tidak ada
variabel `WHATSAPP_API_TOKEN` lama yang menimpa `.env` (lihat Troubleshooting).

✅ **Fase 1 selesai = jalur handoff ke admin hidup.** Lanjut ke Fase 2.

---

## Fase 2 — Verifikasi nomor produksi `+62 877 4587 3159` di Fonnte

Tujuan: menjadikan nomor produksi perangkat WhatsApp yang terhubung ke Fonnte,
sehingga pesan calon jemaah masuk ke bot dan balasan keluar dari nomor itu.

- [ ] **2.1** Buka dashboard Fonnte, menu **Devices / Perangkat**, lalu **tambah
  perangkat baru** dengan nomor `+62 877 4587 3159`.
  - Bila nomor itu sudah terdaftar di WhatsApp biasa/WhatsApp Business, ikuti alur
    migrasi yang ditawarkan Fonnte; nomor harus dapat menerima SMS/telepon OTP.

- [ ] **2.2** Hubungkan perangkat: pindai **QR** yang tampil di dashboard memakai
  WhatsApp di ponsel `+62 877 4587 3159`, atau gunakan **kode Sinkit** bila tersedia.

- [ ] **2.3** Pastikan status perangkat **connected**. (Perangkat `disconnected`
  artinya penautan belum berhasil — ulangi 2.2.)

- [ ] **2.4** Aktifkan **Auto Read** pada perangkat. **Tanpa ini webhook tidak akan
  pernah dipanggil** dan bot tidak akan menjawab apa pun.

- [ ] **2.5** Daftarkan URL webhook pada menu perangkat:

  ```text
  https://<host-publik-anda>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN>
  ```

  Nilai `WHATSAPP_WEBHOOK_VERIFY_TOKEN` ada di `.env` Anda. Untuk pengembangan lokal
  dengan tunnel, URL bentuknya mis. `https://xxxx.ngrok.io/webhook?token=...` —
  daftarkan ulang bila URL tunnel berubah.

- [ ] **2.6** **Salin token perangkat** untuk nomor produksi tersebut (menu
  API/Token). Ini yang akan dipakai di `.env` sebagai `WHATSAPP_API_TOKEN`.

- [ ] **2.7 (opsional tapi disarankan)** Dari nomor lain, kirim pesan apa pun ke
  `+62 877 4587 3159` dan lihat apakah muncul di log Fonnte — tanda pesan masuk
  terbaca perangkat.

✅ **Fase 2 selesai = token perangkat produksi di tangan.** Lanjut ke Fase 3.

---

## Fase 3 — Ganti konfigurasi ke nomor produksi

Ada dua cara — pilih salah satu:

### Cara A (disarankan): serahkan ke agent

Kirim pesan ke agent berisi **token perangkat baru** (Fase 2.6) dan bilang:
*"token perangkat produksi: <token>, lanjutkan cutover"*. Agent akan menukar `.env`,
menjalankan `npm run cutover:check`, restart, dan mendampingi smoke test.

### Cara B: kerjakan sendiri

- [ ] **3.1** Ubah dua baris di `.env` (di folder repo):

  ```bash
  WHATSAPP_SENDER_NUMBER=+62 877 4587 3159
  WHATSAPP_API_TOKEN=<token perangkat produksi dari Fase 2.6>
  ```

  Baris lain — termasuk `WHATSAPP_ADMIN_NUMBER=+62 822 8388 6627` — **tidak diubah**.

- [ ] **3.2** Jalankan pemeriksaan kesiapan:

  ```bash
  npm run cutover:check
  ```

  Tampilan yang benar: `Status: siap untuk uji end-to-end pada nomor produksi.`
  Bila masih `belum siap`, baca baris `[GAGAL]` — biasanya nomor pengembangan masih
  tertinggal atau ada variabel wajib yang kosong.

- [ ] **3.3** Hentikan proses bot lama (Ctrl+C) dan jalankan ulang:

  ```bash
  npm start
  ```

  Tampilan yang benar: `nomor pengirim 6287745873159`.

✅ **Fase 3 selesai = bot sudah menjawab dari nomor produksi.** Lanjut ke Fase 4.

---

## Fase 4 — Smoke test end-to-end lewat nomor produksi

Dari ponsel pribadi, chat `+62 877 4587 3159` dan jalankan percakapan berikut
berurutan:

- [ ] **4.1** Kirim:

  > Halo

  Harus dibalas sapaan asisten otomatis (dalam bahasa pesan Anda).

- [ ] **4.2** Kirim:

  > Apa itu land arrangement?

  Harus dijawab dari materi (memuat penjelasan Private Premium Umrah / Land
  Arrangement), **tanpa** meneruskan ke admin.

- [ ] **4.3** (Opsional, uji Harga Indikatif) Kirim:

  > Berapa harga hotel di Mekkah?

  Harus menyebut "Harga Indikatif", konflik satuan materi (per orang vs per kamar),
  dan bahwa satuan belum terverifikasi — **bukan** harga final.

- [ ] **4.4** Kirim:

  > Saya mau bicara dengan manusia saja

  lalu jawab `ya` saat diminta persetujuan. Balasan menyatakan diteruskan, dan
  **pesan handoff masuk ke ponsel admin `+62 822 8388 6627`**.

- [ ] **4.5** Cek metrik (dari mesin bot):

  ```bash
  curl http://localhost:3000/metrics
  ```

  `faqAnswered` naik setelah 4.2, dan `handOffsForwarded` naik setelah 4.4.

- [ ] **4.6** Cek regresi otomatis:

  ```bash
  npm test
  npm run typecheck
  ```

  Keduanya harus bersih (167 tes hijau).

✅ **Fase 4 selesai = cutover terbukti end-to-end.** Lanjut ke Fase 5.

---

## Fase 5 — Kontak publik & penutupan

Kabar baik: nomor produksi **sama dengan** nomor konsultasi yang sudah tercantum di
materi Anda (`+62 877 4587 3159`), jadi umumnya tidak ada yang perlu diganti — cukup
dipastikan konsisten.

- [ ] **5.1** Pastikan semua permukaan berikut menampilkan `+62 877 4587 3159` dan
  tidak ada yang menampilkan nomor pengembangan:
  - situs `www.mutawwifmu.com` (halaman kontak/footer),
  - akun Instagram `@mutawwifmu` (bio/kontak),
  - `BOOKLET MUTAWWIFMU.md` (baris kontak sampul, bagian "Konsultasi dengan Admin
    via WhatsApp", blok kontak penutup),
  - materi cetak/digital lain yang memuat nomor.

- [ ] **5.2** Jangan cantumkan nomor admin `+62 822 8388 6627` di kontak publik —
  nomor itu khusus menerima handoff.

- [ ] **5.3** Laporkan hasil ke agent (cukup ringkas):

  > Cutover selesai: nomor produksi aktif, smoke test 4.1–4.5 lolos, kontak publik
  > konsisten. Token perangkat: <atau "sudah di .env">.

  Agent akan menandai tiket 06 `resolved`.

- [ ] **5.4 (opsional, setelah stabil beberapa hari)** Pensiunkan nomor pengembangan
  dari Fonnte. **Jangan dihapus sebelum** smoke test lolos dan bot produksi stabil.

---

## Catatan penting

- **Jangan** mengubah `WHATSAPP_WEBHOOK_VERIFY_TOKEN` saat cutover — token itu bagian
  dari URL webhook yang sudah didaftarkan. Bila diganti, webhook wajib didaftarkan
  ulang.
- **Jangan** menjanjikan riwayat chat berpindah ke nomor produksi. Riwayat chat calon
  jemaah tetap berada di chat dengan nomor lama; mereka cukup memulai percakapan baru
  di nomor produksi (lihat `docs/whatsapp-number-cutover.md`, bagian "Batasan migrasi
  riwayat percakapan").
- Untuk operasi 24/7 yang sesungguhnya, proses bot sebaiknya pindah ke **server/VPS
  dengan URL webhook stabil** (tiket 07) — tunnel pengembangan berganti URL setiap
  restart. Ini bisa menyusul setelah cutover.

## Troubleshooting cepat

| Gejala | Penyebab yang paling sering | Perbaikan |
| --- | --- | --- |
| Bot diam, tidak membalas sama sekali | Auto Read mati, atau webhook belum/tidak lagi terdaftar | Aktifkan Auto Read; daftarkan ulang URL webhook |
| Bot start dengan nilai yang tidak sesuai `.env` | Variabel shell menimpa `.env` | PowerShell: cek `$env:WHATSAPP_API_TOKEN`, `$env:WHATSAPP_SENDER_NUMBER`; hapus bila ada |
| `npm run cutover:check` bilang "belum siap" | Nomor pengembangan masih di `WHATSAPP_SENDER_NUMBER`, atau ada variabel wajib kosong | Ikuti baris `[GAGAL]` pada laporannya |
| Balasan keluar tapi dari nomor lama | Token perangkat masih milik perangkat lama | Ganti `WHATSAPP_API_TOKEN` dengan token perangkat produksi |
| Handoff tidak sampai ke admin | Nomor admin memblokir / belum aktif, atau pengiriman gagal | Cek log proses (jejak audit handoff ada di sana); kirim ulang setelah diperbaiki |
| Pesan dari nomor lain justru dibalas ke diri sendiri | — | Jangan khawatir; pesan dari nomor bot sendiri memang diabaikan oleh desain |

## Referensi

- Runbook lengkap + checklist keberhasilan: `docs/whatsapp-number-cutover.md`
- Keputusan kanal admin: `docs/adr/0006-kanal-admin-whatsapp.md`
- Keputusan provider: `docs/adr/0001-provider-whatsapp-cloud-api.md`, `docs/adr/0003-provider-bsp-fonnte.md`
- Status tiket: `.scratch/whatsapp-customer-service-chatbot/issues/06-production-number-cutover.md`
