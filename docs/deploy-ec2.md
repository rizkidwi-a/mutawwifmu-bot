# Deploy ke EC2 — panduan langkah demi langkah

Panduan ini untuk **manusia maupun agen AI di EC2**. Kerjakan berurutan; centang item yang sudah selesai. Setiap perintah dijalankan di **terminal EC2** kecuali dinyatakan lain.

## Konteks

| Nilai | Keterangan |
| --- | --- |
| IP publik (Elastic IP) | `47.130.22.165` |
| Domain sementara | `bot.47.130.22.165.nip.io` (nip.io menunjuk otomatis ke IP di atas) |
| Lokasi repo di EC2 | `/home/ubuntu/bot` |
| Port proses bot | `3000` (hanya diakses nginx, tidak dibuka ke publik) |
| Nama layanan systemd | `mutawwifmu` |
| Repo GitHub | `https://github.com/rizkidwi-a/mutawwifmu-bot` (publik) |

Prasyarat yang sudah terpenuhi: instance EC2 Ubuntu hidup, Node ≥ 22 terpasang, repo ter-clone ke `~/bot`, `npm install` dan `npm test` lulus, `.env` ada di `~/bot/.env`.

## Status checklist

- [x] EC2 dibuat, Elastic IP `47.130.22.165` ter-assosiasi
- [x] Node 22 + git terpasang
- [x] Kode ter-clone ke `~/bot`, `npm install`, `npm test` lulus
- [x] `.env` di `~/bot/.env` (chmod 600)
- [x] `GET /metrics` merespons (proses bot hidup)
- [ ] systemd: bot start otomatis & restart saat crash
- [ ] nginx + HTTPS (certbot) untuk webhook
- [ ] Firewall host (ufw)
- [ ] Bot lokal + tunnel dihentikan
- [ ] Webhook Fonnte diarahkan ke EC2
- [ ] Uji end-to-end: pesan masuk → balasan bot

## Langkah 1 — Verifikasi & pasang systemd

Bot harus jalan 24/7 tanpa bergantung pada sesi SSH. Periksa dulu:

```bash
systemctl status mutawwifmu --no-pager
```

Kalau output menunjukkan `active (running)`, langkah ini sudah selesai — centang dan lanjut ke Langkah 2.

Jika tidak ada layanan, buat unit file:

```bash
sudo tee /etc/systemd/system/mutawwifmu.service > /dev/null <<'EOF'
[Unit]
Description=MUTAWWIFMU WhatsApp Chatbot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bot
ExecStart=/usr/bin/node --env-file-if-exists=.env src/main.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now mutawwifmu
systemctl status mutawwifmu --no-pager
curl -fsS http://127.0.0.1:3000/metrics
```

Ekspektasi: status `active (running)`; `curl /metrics` mengembalikan JSON metrik (angka 0 adalah normal — metrik in-memory, dimulai ulang tiap proses restart).

> Catatan: kalau sebelumnya bot dijalankan manual (`npm start` di sesi SSH), hentikan proses manual itu dulu (`Ctrl+C`) sebelum `systemctl start`, supaya port 3000 tidak bentrok.

Log realtime:

```bash
journalctl -u mutawwifmu -f
```

## Langkah 2 — nginx + HTTPS (certbot)

Webhook provider (Fonnte) hanya menerima URL HTTPS. Pakai domain sementara `bot.47.130.22.165.nip.io` (gratis, tanpa beli domain).

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/mutawwifmu > /dev/null <<'EOF'
server {
    listen 80;
    server_name bot.47.130.22.165.nip.io;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/mutawwifmu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d bot.47.130.22.165.nip.io --non-interactive --agree-tos --register-unsafely-without-email
```

Ekspektasi: `certbot` melaporkan sertifikat terpasang dan redirect HTTPS aktif. Uji:

```bash
curl -fsS https://bot.47.130.22.165.nip.io/metrics
```

Harus mengembalikan JSON metrik yang sama (tanpa error sertifikat). Kalau `curl` gagal, periksa: record DNS nip.io bisa jadi butuh 1–2 menit; `server_name` harus persis; port 443 terbuka di Security Group AWS (terpisah dari ufw).

## Langkah 3 — Firewall host

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Ekspektasi: OpenSSH, 80, 443 `ALLOW` — **port 3000 tidak ada** di daftar (bot hanya diakses nginx localhost).

Catatan tambahan untuk pemilik: pastikan Security Group AWS instance juga membuka 80 dan 443 dari `0.0.0.0/0`, dan 22 hanya dari IP rumah/kantor.

## Langkah 4 — Hentikan bot lokal (di mesin Windows pemilik)

Sebelum webhook dialihkan, **hentikan semua proses penerima lama di mesin lokal** supaya tidak ada dua penerima pesan: proses `npm start` dan proses tunnel (`ngrok`/`cloudflared`) — masing-masing dihentikan dengan `Ctrl+C`.

## Langkah 5 — Arahkan webhook Fonnte ke EC2

Ini **tidak bisa dari terminal EC2** — harus lewat dashboard Fonnte (fonnte.com → menu perangkat):

1. Ambil token webhook dari `~/bot/.env`, nilai variabel `WHATSAPP_WEBHOOK_VERIFY_TOKEN`:

```bash
grep WHATSAPP_WEBHOOK_VERIFY_TOKEN ~/bot/.env
```

2. Di dashboard Fonnte, isi URL webhook:

```
https://bot.47.130.22.165.nip.io/webhook?token=<nilai WHATSAPP_WEBHOOK_VERIFY_TOKEN>
```

3. Pastikan **auto read aktif** (tanpa ini webhook tidak terpanggil). Simpan.

## Langkah 6 — Uji end-to-end

1. Siapkan log realtime di terminal EC2: `journalctl -u mutawwifmu -f`
2. Dari nomor HP lain (calon jemaah), kirim pesan ke nomor bot, misal: `Halo, saya mau tanya umrah`
3. Ekspektasi: log menunjukkan pesan masuk terproses; HP pengirim menerima balasan bot; `curl -fsS https://bot.47.130.22.165.nip.io/metrics` menunjukkan salah satu angka naik.

Troubleshooting bila tidak ada yang masuk:

- Periksa nilai token di URL dashboard Fonnte sama persis dengan isi `.env` (kurang/lebih karakter menyebabkan Fonnte menolak request-nya).
- Cek auto read aktif di dashboard Fonnte.
- Uji jalur HTTPS dari luar: `curl -v "https://bot.47.130.22.165.nip.io/webhook?token=<token>"` — Fonnte hanya melakukan POST; GET dipakai handshake Cloud API, jadi respons GET bukan indikator kegagalan.
- Kalau ada error di log proses, baca `journalctl -u mutawwifmu --since "5 minutes ago"`.

## Langkah 7 — Selesai & pemeliharaan

Semua tercentang = migrasi selesai. Catatan pemeliharaan:

- **Update kode**: `cd ~/bot && git pull && sudo systemctl restart mutawwifmu`
- **Backup `data/`** (transkrip + `jeda-state.json`, berisi data pribadi — jangan masuk git): salin berkala via `scp` dari mesin lokal, atau buat EBS snapshot.
- **Biaya**: micro instance kira-kira USD 8–10/bulan di luar free tier; Elastic IP gratis selama ter-assosiasi instance hidup.
- **Rollback**: bila bermasalah, arahkan kembali webhook Fonnte ke tunnel lokal (`ngrok http 3000`).
- Kelola log: `journalctl -u mutawwifmu --disk-usage` bila perlu membersihkan.
