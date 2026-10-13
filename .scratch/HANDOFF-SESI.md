# Handoff Sesi — 2026-10-13

> Menggantikan `.scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md` (kini arsip).
> Riwayat handoff lama (2026-10-07, 10-08, 10-10, 10-11) ada di riwayat git.
> Analisis transkrip nyata: `.scratch/pencocokan-korpus-transkrip/analisis.md`
> (`resolved`); korpusnya di `tests/korpus/transkrip-nyata.json`.

## Keadaan repo saat ini (2026-10-13 ~21:25 WIB)

- Branch aktif `main` @ `e915131`, **ahead 1** dari `origin/main` (commit terakhir
  belum di-push).
- `npm test` **407 lulus**, `npm run typecheck` bersih; probe
  `node scripts/probe-cakupan.ts` **118/118** rute dan topik (semua kelompok
  hijau: `dasar` 41/41, `transkrip-nyata` 54/54, `topik-gap` 16/16,
  `varian-ejaan` 6/6, `typo` 6/6).
- **Ada pekerjaan yang belum di-commit di working tree.** Jangan `checkout`/
  `reset`/`stash` sembarangan sebelum memutuskan nasibnya:
  - `src/knowledge/transportRute.ts` **baru** + `tests/knowledge/transportRute.test.ts` **baru**
  - `src/conversation/handleInbound.ts`, `src/knowledge/businessFaq.ts` (modifikasi)
  - `tests/conversation/indicativePricing.test.ts`, `tests/knowledge/businessFaq.test.ts` (modifikasi)
  - `.scratch/harga-transportasi-per-rute/` — spec + 4 tiket, semuanya `resolved` (ditandai 21:16)
  - `.scratch/whatsapp-customer-service-chatbot/recover-ssh-22-userdata.sh` (skrip pemulihan SSH, 12 Okt)
  - `.scratch/whatsapp-customer-service-chatbot/HANDOFF-SESI.md` (berkas arsip, termodifikasi)
- Branch **`feat/gemini-runtime-integration`** @ `5104f7b` (base `36a1321`,
  **belum di-merge**): pemaham Gemini opt-in di jalur webhook,
  `docs/adr/0013-pemaham-gemini-di-jalur-webhook.md`, tiket
  `01-wire-gemini-ke-runtime` `resolved`. `main` sudah maju setelah base branch,
  jadi merge butuh penyelesaian konflik `handleInbound.ts`.

## Tujuan sesi berikutnya (satu fokus) — usulan

**Tutup dua utang integrasi sebelum uji coba ulang:** (1) tinjau, commit, dan
push pekerjaan `harga-transportasi-per-rute` yang kini hijau tetapi masih di
working tree; (2) review branch `feat/gemini-runtime-integration` dan putuskan
merge — setelah itu jalankan `node scripts/probe-cakupan-gemini.ts` **dengan
`GEMINI_API_KEY`** untuk mengukur apakah pemaham Gemini mengalahkan baseline
regex 118/118. Setelah keduanya beres, jalankan uji coba ulang bot (perilaku
terkini) dan evaluasi bersama pemilik.

Alasan urutan ini: uji coba sebaiknya mengukur build yang sudah bersih dan
final, bukan working tree yang belum di-commit dengan branch yang belum
digabung.

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
5. **`harga-transportasi-per-rute`** — diimplementasikan di working tree
   (belum di-commit): sumber angka pindah dari BOOKLET ke tabel
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
8. **Cloud API (tiket 09 lama) & cutover nomor produksi** — status tidak
   berubah: keduanya masih `ready-for-human`.

## EC2: status & operasional

### Status terkini (2026-10-13)

Instance **tidak terjangkau dari luar**. Uji ulang hari ini:
`http://` **dan** `https://bot.47.130.22.165.nip.io/metrics` sama-sama
`curl: (28) Connection timed out`. Ini berlanjut sejak 2026-10-11 ~12:15 WIB.
Instance pernah terverifikasi hidup pada 11 Okt (SSH `mutawwifmu`, Node
`v22.23.3`, layanan `mutawwifmu`/`nginx`/`certbot.timer` `enabled` + `active`),
tetapi status kini **tidak dapat dipastikan** dari sini: pengguna IAM `claude`
tidak punya izin `ec2:DescribeInstances`. Dugaan terkuat: instance di-`Stop`
dari konsol AWS oleh pemilik — butuh konfirmasi manusia.

**Jangan** menyimpulkan ada bug aplikasi/nginx dari timeout ini. Timeout total
(termasuk port 22) berarti host mati atau port 22 ter-drop, bukan aplikasi rusak.

Checklist `docs/deploy-ec2.md` masih **6 butir kosong**: systemd start otomatis,
nginx + HTTPS, ufw, hentikan bot lokal + tunnel, arahkan webhook Fonnte ke EC2,
uji end-to-end. Rekonsiliasi dengan verifikasi 11 Okt (nginx/certbot `active`)
perlu dilakukan saat instance hidup kembali.

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
   npm test && npm run typecheck        # terakhir: 407 hijau, typecheck bersih
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

> Arah jangka panjang: jalankan di EC2 (webhook permanen, tanpa tunnel).
> Selama EC2 belum hidup dan checklist `docs/deploy-ec2.md` belum tuntas,
> uji coba tetap lewat tunnel lokal ini.

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

## Peringatan untuk sesi baru

- **Angka/harga tidak boleh digenerasi** — hanya dari template manual;
  `pengamanAngka.ts` menjaganya dan ada tesnya. Larangan spec, bukan selera.
- **Jangan menulis isi `.env`** (token Fonnte, kunci Gemini) atau `mutawwifmu.pem`
  ke berkas handoff/tiket mana pun — cukup rujuk `.env`.
- **URL tunnel berubah setiap restart** → daftarkan ulang webhook Fonnte.
- **Uji selalu dari HP lain.** `6289507003830` nomor bot; bot mengabaikan pesan
  dari nomornya sendiri.
- **Jangan jadikan Meta Cloud API provider produksi** sebelum smoke test masuk
  + handoff selesai dan ADR provider baru dicatat (menggantikan ADR-0003).
  Isu akun bisnis 131031 masih relevan.
- **Gemini belum aktif di `main`.** `GEMINI_API_KEY` di `.env` hanya dipakai
  `scripts/probe-cakupan-gemini.ts` (dan branch `feat/gemini-runtime-integration`).
  Jangan mengira bot sudah "dibantu LLM" saat uji coba dari `main`.
- **EC2 bisa saja `stopped`.** Timeout total (termasuk port 22) berarti host
  mati / port ter-drop, bukan aplikasi rusak. Konfirmasi ke pemilik dulu.
- **Working tree punya pekerjaan belum di-commit yang hijau.** Sebelum
  berpindah branch atau menjalankan perintah git destruktif, pastikan nasib
  pekerjaan `harga-transportasi-per-rute` sudah diputuskan.

## Pekerjaan open (urutan yang diusulkan)

| Butir | Status |
| --- | --- |
| Commit + push pekerjaan `harga-transportasi-per-rute` (hijau, di working tree) | **sesi berikutnya** — verifikasi lalu commit; tiket 01–04 sudah `resolved` |
| Review & putuskan merge `feat/gemini-runtime-integration` (`5104f7b`, ADR-0013) | **sesi berikutnya** — butuh penyelesaian konflik `handleInbound.ts`; lalu probe ber-`GEMINI_API_KEY` |
| Uji coba ulang bot + evaluasi bersama pemilik (perilaku terkini) | setelah dua butir di atas; pakai skenario di dokumen ini |
| Konfirmasi status instance EC2 & uji `https://bot.47.130.22.165.nip.io` dari luar | **terbuka & mendesak** — tidak terjangkau sejak 2026-10-11; butuh konfirmasi pemilik |
| Tutup sisa checklist `docs/deploy-ec2.md` (6 butir) | menunggu instance hidup |
| Migrasi ke WhatsApp Cloud API (tiket 09 lama) | `ready-for-human`: smoke test masuk + handoff; nomor admin belum di penerima uji; ADR provider baru setelah stabil |
| Cutover nomor produksi `+62 877 4587 3159` (tiket 06 lama) | `ready-for-human`: verifikasi nomor di provider, isi `.env`, `npm run cutover:check` sampai siap, smoke test live |
| Tiket 07 lama: adapter provider BSP sebagai fallback | `needs-info` |
| Persistent conversation store / retensi | keputusan belum diambil (README); urgensinya naik karena state jeda sudah persisten tetapi `ConversationStore` masih in-memory |

## Konteks singkat

- Bahasa komunikasi & dokumentasi: **Bahasa Indonesia** (AGENTS.md).
- Runtime: Node >= 22.18, TypeScript via type stripping, **tanpa dependency
  runtime** (ADR-0002).
- Seam percakapan provider-agnostic: `src/conversation/handleInbound.ts`
  (`handleInbound(message, context): BotTurn`) — **jangan dirusak**; 407 tes
  menjaganya. Di branch Gemini, signature menerima hasil klasifikasi opsional.
- Direktori tiket di `.scratch/`: `lead-intake` (issues 01–11, `resolved`),
  `jeda-ambil-alih`, `penyela-pengumpulan`, `tujuan-chat`,
  `harga-transportasi-per-rute`, `pencocokan-korpus-transkrip`.
  Spesifikasi lama `.scratch/whatsapp-customer-service-chatbot/`.
- ADR di `docs/adr/` sampai **ADR-0012** di `main`; **ADR-0013**
  (`pemaham-gemini-di-jalur-webhook`) masih di branch. Terbaru di `main`:
  ADR-0012 penyela pengumpulan, ADR-0011 jeda & ambil alih, ADR-0010 handoff
  tanpa riwayat.
- Deploy EC2: `docs/deploy-ec2.md` (Elastic IP `47.130.22.165`, layanan systemd
  `mutawwifmu`, repo `/home/ubuntu/bot`, domain `bot.47.130.22.165.nip.io`).
- Materi bisnis: `BOOKLET MUTAWWIFMU.md`, `HOTEL RATES MUTAWWIFMU (2).md`,
  `data/transportasi harga/WhatsApp Image 2026-10-12 at 13.48.14.md`.
- `data/` di-gitignore (data pribadi: transkrip + nomor). Korpus uji di
  `tests/korpus/` sengaja ter-versioning; tambah kasus cukup lewat JSON
  (lihat `tests/korpus/README.md`).
