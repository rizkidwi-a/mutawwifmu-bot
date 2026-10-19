# Handoff Sesi — 2026-10-19

> Menggantikan `.scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md` (kini arsip).
> Riwayat handoff lama (2026-10-07, 10-08, 10-10, 10-11) ada di riwayat git.
> Analisis transkrip nyata: `.scratch/pencocokan-korpus-transkrip/analisis.md`
> (`resolved`); korpusnya di `tests/korpus/transkrip-nyata.json`.

## Keadaan repo saat ini (2026-10-19 ~00:45 WIB)

- Branch aktif `main` @ `3ec96ae`, **sinkron dengan `origin/main`** (ahead 0,
  semua sudah di-push). Working tree **bersih** — seluruh utang commit dari
  handoff 2026-10-13 sudah masuk:
  - `f851ab0` feat(harga): transportasi per rute (tiket 01–04)
  - `6951203` feat(harga): fotografi per lokasi, tasreh, handling CGK
  - `7409fe0` feat(gemini): wire opt-in Gemini classifier (ADR-0013) — branch
    `feat/gemini-runtime-integration` **sudah di-merge ke `main`**
  - `e5dd797` feat(pasca-handoff): menu lanjutan + ulangi percakapan (ADR-0014)
  - `5384c23` fix(harga): jawab pertanyaan harga di semua fase (ADR-0015)
  - `3ec96ae` fix(tujuan-chat): jalan keluar ulangi dari state admin-routed (ADR-0016)
  - `440e9df` docs: poles README portofolio; `4c48a2c` chore: **`.scratch/`
    tidak lagi dilacak git** (di-gitignore; dokumen ini kini berkas lokal saja)
- `npm test` **492 lulus** (0 gagal), `npm run typecheck` bersih; probe
  `node scripts/probe-cakupan.ts` **121/121** rute dan topik, semua kelompok
  hijau (baku 11, campur-inggris 3, gaul 17, parafrase 14, topik-gap 16,
  transkrip-nyata 54, typo 6); tidak ada kasus gagal dipahami maupun topik meleset.
- Branch `feat/gemini-runtime-integration` masih ada tetapi sudah termuat
  penuh di `main` (`git log main..feat/gemini-runtime-integration` kosong) —
  aman dihapus bila mau dirapikan.
- **Probe Gemini ber-kunci belum pernah dijalankan.** Commit `7409fe0`
  mencatat: "Probe jalur Gemini penuh menunggu kunci tersedia". Klaim
  peningkatan cakupan vs baseline regex tetap **belum ada**.

## Tujuan sesi berikutnya (satu fokus) — usulan

Kedua utang integrasi handoff 2026-10-13 **sudah tutup** (commit + push +
merge Gemini). **EC2 sudah hidup dan terkonfirmasi** (pemilik, 2026-10-18):
connect tanpa masalah dan **bot telah diuji dengan baik** di sana. Fokus
berikutnya: jalankan `node scripts/probe-cakupan-gemini.ts` dengan
`GEMINI_API_KEY` untuk mengukur apakah pemaham Gemini mengalahkan baseline
regex, lalu putuskan apakah Gemini diaktifkan di runtime produksi.
Setelah itu: cutover nomor produksi (tiket 06 lama) dan keputusan persistent
conversation store.

## Yang berubah sejak handoff 2026-10-11 (belum tercatat di handoff lama)

1. **`tujuan-chat` `resolved`** — percakapan baru dimulai dengan pengantar
   layanan + menu tujuan: calon jemaah → intake; vendor/mitra (`vendor_mitra`),
   tim internal (`internal`), keperluan lain (`other`) → handoff langsung
   tanpa intake. Lihat `.scratch/tujuan-chat/`.
2. **`jeda-ambil-alih` `resolved`** (ADR-0011) — perintah admin via WhatsApp
   (`#jeda <nomor>`, `#jeda`, `#lanjut <nomor>`, `#bot off`, `#bot on`,
   `#status`) dari `WHATSAPP_ADMIN_NUMBER`; state jeda persisten di
   `data/jeda-state.json`; gerbang jeda pada pesan masuk; **tanpa auto-resume**
   (tiket 04 keputusan pemilik). Deteksi ambil-alih otomatis = `wontfix`
   (tiket 05). Lihat `.scratch/jeda-ambil-alih/`.
3. **`penyela-pengumpulan` `resolved`** (ADR-0012) — pertanyaan menyela
   ("ingin bertanya", "ada yang ingin ditanyakan", dst.) tidak boleh menjadi
   jawaban bidang; tercatat di Bagian Pertanyaan. Perbaikan bidang terarah
   ("hapus bagian tanggal", dst.) mengosongkan bidang, minta ulang, lalu
   kembali ke state sebelumnya. Lihat `.scratch/penyela-pengumpulan/`.
4. **Perubahan perilaku intake 13 Okt** (`e915131`) — pertanyaan anggaran
   **dihapus**, harga visa diubah, periode keberangkatan diperjelas.
5. **`harga-transportasi-per-rute`** — diimplementasikan dan sudah di-commit
   (`f851ab0`): sumber angka pindah dari BOOKLET ke tabel
   `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`
   (23 rute × 6 armada), jawaban `price-transport` kontekstual per rute
   (deterministik), tanpa tujuan → klarifikasi daftar rute (bukan handoff).
   Tiket 01–04 dan spec kini `resolved`. Lihat
   `.scratch/harga-transportasi-per-rute/`.
6. **Gemini wiring** (`feat/gemini-runtime-integration`, ADR-0013) — classifier
   opt-in di jalur webhook; tanpa `GEMINI_API_KEY` perilaku regex tetap default.
   Baseline regex tetap 118/118. **Belum ada klaim peningkatan cakupan** sampai
   probe ber-kunci dijalankan.
7. **Insiden SSH EC2 (12 Okt)** — port 22 sempat ter-DROP di dalam host
   (kemungkinan ufw) meski Security Group mengizinkan tcp/22; pemulihan lewat
   user data cloud-init. Skrip: `recover-ssh-22-userdata.sh`.
8. **Cloud API (tiket 09 lama) dibatalkan; cutover nomor produksi tetap
   `ready-for-human`** — tiket 09 (`09-migrasi-ke-meta-cloud-api.md`),
   `docs/tutorial-migrasi-ke-meta-cloud-api.md`, dan seluruh rujukannya
   (README, `.env.example`, `src/config.ts`) **dihapus 2026-10-19** atas
   keputusan pemilik (tidak relevan lagi); ADR-0001 direvisi mencatat
   pembatalan, provider produksi tetap Fonnte (ADR-0003).
9. **`harga-fotografi-tasreh-cgk`** — diimplementasikan dan sudah di-commit
   (`6951203`), mengikuti resep `.scratch/catatan-sesi-harga-transportasi.md`:
   - jawaban `price-photographer-videographer` kini dirender per lokasi sesi
     dari modul `src/knowledge/fotoHarga.ts` (13 baris dari
     `data/foto harga/WhatsApp Image 2026-10-12 at 13.54.15.md`); label
     **Paket Spesial Ramadan** menggantikan "High season" BOOKLET; ditambah
     durasi, meeting point, exclude (transport) dan add-on (SAR 50/100/300).
   - topik baru `price-tasreh` (**IDR 300.000 per pax**) + `tasreh` non-harga;
     pola `UNSUPPORTED_TOPIC` dipecah agar pertanyaan harga tasreh tetap
     terjawab walau menyebut Raudhah/Nusuk (siskopatuh & kereta Haramain tetap
     handoff).
   - `price-airport-handling`: **Handling Bandara CGK IDR 300.000 per pax**
     menggantikan angka BOOKLET "Handling Bandara Jakarta IDR 350.000"
     (keputusan pemilik: harga memang sudah berubah).
   - pola fotografi kini mengenali kata `foto` ("harga foto di Masjid Nabawi"
     sebelumnya jatuh ke handoff).
   Tiket 01–04 dan spec `resolved`. Lihat `.scratch/harga-fotografi-tasreh-cgk/`.
10. **`feat/gemini-runtime-integration` di-merge ke `main`** (`7409fe0`) —
    ADR-0013 kini di `main`; `handleInbound(message, context, hasilKlasifikasi?)`
    menerima hasil klasifikasi opsional; tenggat 10 detik di jalur webhook
    dengan fallback regex; opt-in hanya lewat `GEMINI_API_KEY`. Tiket
    `01-wire-gemini-ke-runtime` `resolved`.
11. **`pasca-handoff` `resolved`** (ADR-0014, `e5dd797`) — setelah ringkasan
    terkirim (state `sent`): Menu Lanjutan untuk basa-basi/pesan tak dikenali
    (tidak dicatat sebagai Perubahan), kata kunci **Ulangi Percakapan**
    ("ulangi", "mulai dari awal", "reset", dst.), dan penolakan kirim-ulang
    eksplisit. Lihat `.scratch/pasca-handoff/`.
12. **`harga-di-semua-fase` `resolved`** (ADR-0015, `5384c23`) — setiap
    pertanyaan harga selalu memperoleh jawaban harga di **semua** fase
    percakapan (termasuk `admin-routed`, `awaiting-question`,
    `awaiting-consent`); pertanyaan tanpa angka materi dijawab jujur +
    handoff. Lihat `.scratch/harga-di-semua-fase/`.
13. **`tujuan-chat` perbaikan** (ADR-0016, `3ec96ae`) — jalan keluar "ulangi"
    kini juga berfungsi dari state `admin-routed` (vendor/mitra/internal/other).
14. **README dipoles untuk portofolio** (`440e9df`; arsip di
    `.scratch/portfolio-readme/`) dan **`.scratch/` berhenti dilacak git**
    (`4c48a2c`) — tiket/spec kini berkas lokal, tidak lagi masuk riwayat repo.

## EC2: status & operasional

### Status terkini (2026-10-18: HIDUP & terkonfirmasi)

**`resolved`** — pemilik mengonfirmasi (2026-10-18): instance **hidup,
connect tanpa masalah**, dan **bot telah diuji dengan baik** di EC2.
Insiden tidak-terjangkau 2026-10-11 s.d. 10-18 ditutup.

Riwayat (untuk konteks bila terulang): `curl http://` **dan**
`https://bot.47.130.22.165.nip.io/metrics` sempat `Connection timed out`
sejak 2026-10-11 ~12:15 WIB; pengguna IAM `claude` tidak punya izin
`ec2:DescribeInstances` sehingga status tak bisa dipastikan dari sini.

**Jangan** menyimpulkan ada bug aplikasi/nginx dari timeout total. Timeout
termasuk port 22 berarti host mati atau port ter-drop, bukan aplikasi rusak.

Perintah verifikasi setelah instance diyakini hidup:

```bash
ssh mutawwifmu 'systemctl is-active mutawwifmu nginx; curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/metrics'
# diharapkan: active / active / 200

curl -sS -o /dev/null -w "%{http_code}\n" https://bot.47.130.22.165.nip.io/metrics
# diharapkan: 200 — inilah uji dari luar yang masih terbuka
```

### Konfigurasi akses (di mesin pemilik, bukan di repo)

- `C:\Users\Advan\.ssh\config`: blok `Host mutawwifmu muta bot-ec2 ec2` →
  `HostName 47.130.22.165`, `User ubuntu`, `IdentityFile` ke
  `C:\Users\Advan\Downloads\mutawwifmu.pem`, `IdentitiesOnly yes`,
  `ServerAliveInterval 60`.
- Gotcha: alias pada baris `Host` dipisah **spasi**, bukan koma; `ssh_config`
  tidak mewarisi opsi antar blok `Host`, jadi setiap blok harus lengkap.
- Jangan menyalin isi kunci (`.pem`, `.env`) ke berkas repo mana pun.

### Stop → Start vs Terminate

`Stop → Start` tidak perlu konfigurasi ulang: Elastic IP tetap ter-assosiasi
(IP, domain nip.io, URL webhook tidak berubah), host key SSH tetap, EBS root
persisten (`~/bot`, `.env`, `node_modules` utuh), layanan `enabled` naik
otomatis. Yang hilang hanya proses/sesi manual (mis. tmux).

`Terminate` berbeda: IP bisa berubah, host key berubah (perlu
`ssh-keygen -R 47.130.22.165`), deploy harus diulang.

### Perintah harian

```bash
ssh mutawwifmu                                     # login
ssh muta 'systemctl is-active mutawwifmu nginx'    # status layanan
ssh muta 'journalctl -u mutawwifmu -f'             # log realtime
```

Keluar sesi: `exit` atau Ctrl+D (`~.` di awal baris bila menggantung).
`Ctrl+C` bukan keluar.

### Catatan tmux

Kill sesi: `tmux kill-session -t <nama>`; `tmux kill-server` mematikan semua.
Jalankan sebagai `ubuntu`, **jangan** `sudo` (socket per-UID: `/tmp/tmux-1000`
vs `/tmp/tmux-0`, `sudo` akan terlihat "no sessions"). Membunuh tmux **tidak**
mematikan bot karena bot dijalankan systemd, bukan dari dalam tmux.

### Usulan pengerasan (belum dikerjakan)

`/etc/systemd/system/mutawwifmu.service` memakai `After=network.target`. Ganti
ke `After=network-online.target` + `Wants=network-online.target` agar bot tidak
start sebelum jaringan benar-benar siap (relevan karena instance bisa
di-stop/start kapan saja).

## Runbook: menjalankan bot (uji coba lokal / tunnel)

1. **Preflight**

   ```bash
   npm test && npm run typecheck        # terakhir: 492 hijau, typecheck bersih
   cat .env                             # pastikan WHATSAPP_PROVIDER=fonnte & token ada
   ```

   Jangan menulis isi `.env` (token, kunci) ke berkas mana pun.

2. **Perangkat Fonnte** — cek status di dashboard (`https://fonnte.com`);
   **scan ulang QR** bila `disconnect`. Nomor bot `6289507003830`, paket Free,
   expired 31 Oktober 2026.

3. **Start bot + tunnel**

   ```bash
   # Terminal 1 — bot
   node --env-file-if-exists=.env src/main.ts
   # banner: "... provider fonnte, nomor pengirim 6289507003830, port 3000"

   # Terminal 2 — tunnel
   cloudflared tunnel --url http://localhost:3000
   ```

4. **Daftarkan webhook** (wajib bila URL tunnel berubah)

   ```
   https://<url-baru>/webhook?token=<WHATSAPP_WEBHOOK_VERIFY_TOKEN dari .env>
   ```

   `GET /webhook` membalas 404 di Fonnte — itu normal (Fonnte hanya POST).

5. **Pemeriksaan cepat** — `curl http://localhost:3000/metrics`; kirim pesan
   dari HP lain → balasan dalam hitungan detik; `data/transkrip-percakapan.csv`
   bertambah dua baris per pesan.

> Bot produksi kini jalan di EC2 (webhook permanen, tanpa tunnel) —
> terkonfirmasi 2026-10-18. Runbook tunnel lokal di atas tetap berguna
> untuk pengembangan/uji lokal sebelum deploy.

## Skenario uji coba (dari HP lain, diperbarui)

Catat hasilnya apa adanya (screenshot/transkrip) untuk evaluasi — jangan
diperbaiki di tengah jalan.

1. **Pembuka & routing tujuan** — "Assalamualaikum, mau tanya land arrangement
   umroh" → pengantar layanan + menu tujuan; pilih nomor calon jemaah → masuk
   intake.
2. **Routing non-calon-jemaah** — mulai percakapan baru, pilih opsi
   vendor/mitra → handoff langsung **tanpa** intake.
3. **Pengumpulan kebutuhan (tanpa anggaran)** — layanan → tanggal/periode →
   jumlah jemaah → kebutuhan detail. Tidak ada lagi pertanyaan anggaran.
4. **Ringkasan + persetujuan** — Ringkasan Kebutuhan tampil per bidang; setuju
   → admin `+62 822 8388 6627` menerima identitas + Ringkasan Kebutuhan,
   tanpa riwayat percakapan (ADR-0010).
5. **Pembaruan** — "tambah airport handling" → ringkasan diperbarui → setuju →
   admin menerima penanda **PEMBARUAN**.
6. **Perbaikan bidang** — "hapus bagian tanggal" → bot mengosongkan bidang itu,
   minta isi ulang, lalu kembali ke state sebelumnya.
7. **Pertanyaan menyela** — saat bot menanyakan sebuah bidang, kirim
   "ada yang ingin ditanyakan, nanti ongkosnya bisa nego?" → **tidak** mengisi
   bidang; tercatat di Bagian Pertanyaan + prompt bidang dilanjutkan.
8. **Jeda / ambil alih admin** — dari `WHATSAPP_ADMIN_NUMBER`: `#jeda <nomor>`
   → pesan pelanggan berikutnya **tidak** dibalas (tetap masuk transkrip);
   `#status` menampilkan daftar jeda; `#lanjut <nomor>` mengembalikan balasan;
   `#bot off` / `#bot on` untuk global.
9. **Harga Indikatif per rute** — "berapa ongkos dari Jeddah airport ke hotel
   Makkah?" → hanya baris rute itu beserta armada; "berapa harga transportasi?"
   tanpa tujuan → klarifikasi daftar rute (bukan handoff), tetap "Harga
   Indikatif — dapat berubah setelah diperiksa admin".
10. **Topik gap sebagai pesan pertama** — "berapa biaya siskopatuhnya?" → pesan
    dicatat, intake lanjut, pertanyaan muncul di Ringkasan Kebutuhan admin.
11. **Over-faq** — "kalo upgrade ke staria tambahannya brp?" → handoff;
    "muthowif itu biayanya berapa?" → Harga Indikatif mutawwif.
12. **Lampiran** — kirim gambar/dokumen → diakui sebagai lampiran, isinya tidak
    ditafsirkan.
13. **Pemicu manusia** — "saya mau bicara dengan manusia" → langsung handoff.
14. **Harga baru (fotografi / tasreh / CGK)** — "berapa harga foto di Masjid
    Nabawi?" → hanya baris Nabawi + meeting point (tanpa angka lokasi lain);
    "berapa biaya tasreh raudhah?" → Harga Indikatif **IDR 300.000 per pax**
    (bukan handoff); "berapa harga handling bandara CGK?" → **IDR 300.000 per
    pax**, tanpa lagi angka IDR 350.000.
15. **Pasca-handoff: menu lanjutan & ulangi** — setelah ringkasan terkirim ke
    admin, kirim "halo" → dibalas **Menu Lanjutan** (bukan "Terima kasih atas
    pesan Anda" kosong); "ulangi percakapan" → intake mulai dari awal;
    pastikan "halo" **tidak** masuk Ringkasan Kebutuhan sebagai Perubahan.
16. **Harga di semua fase** — setelah handoff/admin-routed, kirim "kisaran
    harganya berapa?" → tetap dijawab dengan Harga Indikatif (bukan hanya
    "terima kasih, pertanyaan Anda saya catat"); pertanyaan harga tanpa angka
    materi → dijawab jujur + handoff.
17. **Ulangi dari admin-routed** — pilih tujuan vendor/mitra (atau internal/
    other) → handoff; kirim "mulai dari awal" → percakapan baru dengan menu
    tujuan, tidak macet di state admin-routed.

## Peringatan untuk sesi baru

- **Angka/harga tidak boleh digenerasi** — hanya dari template manual;
  `pengamanAngka.ts` menjaganya dan ada tesnya. Larangan spec, bukan selera.
- **Jangan menulis isi `.env`** (token Fonnte, kunci Gemini) atau `mutawwifmu.pem`
  ke berkas handoff/tiket mana pun — cukup rujuk `.env`.
- **URL tunnel berubah setiap restart** → daftarkan ulang webhook Fonnte.
- **Uji selalu dari HP lain.** `6289507003830` nomor bot; bot mengabaikan pesan
  dari nomornya sendiri.
- **Meta Cloud API bukan rencana migrasi lagi.** Tiket 09 lama
  (`09-migrasi-ke-meta-cloud-api.md`) dan `docs/tutorial-migrasi-ke-meta-cloud-api.md`
  **dihapus 2026-10-19**; ADR-0001 direvisi mencatat pembatalan — pemilik
  menyatakan sudah tidak relevan. Provider tetap Fonnte (ADR-0003).
- **Gemini sudah di-merge ke `main` tetapi tetap opt-in.** Tanpa
  `GEMINI_API_KEY` di `.env` runtime, perilaku regex yang aktif — jangan
  mengira bot sudah "dibantu LLM" saat uji coba kecuali kunci diset dan
  dibuktikan lewat log. Probe ber-kunci belum pernah dijalankan.
- **EC2 sudah hidup** (konfirmasi pemilik 2026-10-18). Bila kelak timeout
  total lagi (termasuk port 22), itu host mati / port ter-drop, bukan
  aplikasi rusak — konfirmasi ke pemilik dulu.
- **`.scratch/` tidak lagi dilacak git** (di-gitignore sejak `4c48a2c`).
  Tiket/spec di sana adalah berkas lokal — jangan berharap `git checkout`
  mengembalikannya; cadangkan di luar repo bila perlu.
- Branch `feat/gemini-runtime-integration` sudah termuat penuh di `main` —
  tidak ada lagi pekerjaan tertahan di branch itu.

## Pekerjaan open (urutan yang diusulkan)

Selesai sejak handoff 2026-10-13: ✅ commit + push `harga-transportasi-per-rute`
+ `harga-fotografi-tasreh-cgk` (`f851ab0`, `6951203`); ✅ merge
`feat/gemini-runtime-integration` (`7409fe0`, tanpa konflik tersisa);
✅ tiga fitur/perbaikan baru (`pasca-handoff`, `harga-di-semua-fase`,
`ulangi-dari-admin-routed`) — semua tiket `resolved`, `main` sinkron dengan
`origin`, working tree bersih; ✅ **EC2 hidup & bot diuji di sana**
(konfirmasi pemilik 2026-10-18); ✅ **migrasi Cloud API dibatalkan** — tiket
09 lama dihapus 2026-10-19 (tidak relevan).

| Butir | Status |
| --- | --- |
| Jalankan `node scripts/probe-cakupan-gemini.ts` dengan `GEMINI_API_KEY` | **fokus berikutnya** — ukur apakah pemaham Gemini mengalahkan baseline regex; jangan klaim peningkatan sebelum ini; lalu putuskan aktivasi di produksi |
| Cutover nomor produksi `+62 877 4587 3159` (tiket 06 lama) | `ready-for-human`: verifikasi nomor di provider, isi `.env`, `npm run cutover:check` sampai siap, smoke test live |
| Tiket 07 lama: adapter provider BSP sebagai fallback | `needs-info` |
| Persistent conversation store / retensi | keputusan belum diambil (README); urgensinya naik karena state jeda sudah persisten tetapi `ConversationStore` masih in-memory |
| Hapus branch lokal `feat/gemini-runtime-integration` (opsional) | sudah termuat penuh di `main`; hanya kerapian |

## Konteks singkat

- Bahasa komunikasi & dokumentasi: **Bahasa Indonesia** (AGENTS.md).
- Runtime: Node >= 22.18, TypeScript via type stripping, **tanpa dependency
  runtime** (ADR-0002).
- Seam percakapan provider-agnostic: `src/conversation/handleInbound.ts`
  (`handleInbound(message, context, hasilKlasifikasi?): BotTurn` — hasil
  klasifikasi Gemini opsional disuntik dari jalur webhook) — **jangan dirusak**;
  492 tes menjaganya.
- Direktori tiket di `.scratch/` (**tidak lagi dilacak git**): `lead-intake`
  (issues 01–11, `resolved`), `jeda-ambil-alih`, `penyela-pengumpulan`,
  `tujuan-chat`, `harga-transportasi-per-rute`, `harga-fotografi-tasreh-cgk`,
  `harga-di-semua-fase`, `pasca-handoff`, `gemini-runtime-integration`,
  `portfolio-readme`, `pencocokan-korpus-transkrip`.
  Spesifikasi lama `.scratch/whatsapp-customer-service-chatbot/`.
- ADR di `docs/adr/` sampai **ADR-0016** (semua di `main`): ADR-0013 pemaham
  Gemini di jalur webhook, ADR-0014 pasca-handoff menu lanjutan,
  ADR-0015 pertanyaan harga di semua fase, ADR-0016 ulangi dari
  admin-routed. Sebelumnya: ADR-0012 penyela pengumpulan, ADR-0011 jeda &
  ambil alih, ADR-0010 handoff tanpa riwayat.
- Deploy EC2: `docs/deploy-ec2.md` (Elastic IP `47.130.22.165`, layanan systemd
  `mutawwifmu`, repo `/home/ubuntu/bot`, domain `bot.47.130.22.165.nip.io`).
- Materi bisnis: `BOOKLET MUTAWWIFMU.md`, `HOTEL RATES MUTAWWIFMU (2).md`,
  `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`,
  `data/foto harga/WhatsApp Image 2026-10-12 at 13.54.15.md` (harga fotografi);
  angka tasreh & handling CGK dari transkrip admin (`data/Cut Emelia`,
  `data/Vira Arman`).
- `data/` di-gitignore (data pribadi: transkrip + nomor). Korpus uji di
  `tests/korpus/` sengaja ter-versioning; tambah kasus cukup lewat JSON
  (lihat `tests/korpus/README.md`).
