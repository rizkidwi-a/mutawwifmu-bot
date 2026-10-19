# Jeda Bot & Ambil Alih Admin

Status: ready-for-agent

## Problem Statement

Admin melanjutkan membalas pelanggan **lewat nomor yang sama dengan bot** (nomor bisnis 6289507003830). Saat ini setiap pesan masuk selalu diproses `handleInbound` dan dibalas bot (`src/server.ts`), sehingga balasan berikutnya dari pelanggan "direbut" bot dan merusak percakapan manual admin. Tidak ada mekanisme jeda sama sekali: satu-satunya cara mematikan balasan otomatis adalah menghentikan proses, yang (a) bersifat global — semua pelanggan ikut tidak dilayani, (b) menghapus state percakapan karena store masih in-memory, dan (c) karena deployment memakai Cloudflare quick tunnel (lihat `.scratch/webhook-aktif.md`), memaksa pendaftaran ulang webhook Fonnte setiap kali proses dinyalakan lagi.

## Solution

Beri admin kendali atas kapan bot membalas, tanpa mematikan proses:

1. **Jeda Percakapan** per calon jemaah — bot berhenti membalas satu kontak karena admin menangani langsung (Ambil Alih).
2. **Nonaktif Sementara** global — bot berhenti membalas semua kontak sementara.

Keduanya dikendalikan lewat perintah WhatsApp dari `WHATSAPP_ADMIN_NUMBER` (nomor admin yang sudah dikonfigurasi, terpisah dari nomor bot — ADR-0006). Pesan yang masuk saat jeda tetap dicatat ke transkrip CSV (ADR-0007) tetapi tidak dibalas dan tidak mengubah state alur percakapan bot. State jeda disimpan persisten di `data/` sehingga bertahan saat proses restart. Untuk cakupan saat ini, Ambil Alih dilakukan manual melalui perintah admin; deteksi otomatis pesan keluar tidak termasuk scope aktif.

## Ruang Lingkup

1. **State jeda persisten.** Daftar kontak yang dijeda + status Nonaktif Sementara global, disimpan di `data/jeda-state.json`, bertahan lintas restart.
2. **Perintah admin via WhatsApp.** `#jeda <nomor>`, `#jeda` (kontak handoff terakhir), `#lanjut <nomor>`, `#bot off`, `#bot on`, `#status` — hanya diterima dari `WHATSAPP_ADMIN_NUMBER`, dengan konfirmasi singkat kembali ke nomor admin.
3. **Gerbang jeda pada pesan masuk.** Kontak yang dijeda (atau saat Nonaktif Sementara): pesan dicatat ke transkrip, tanpa balasan, tanpa perubahan state alur. Kontak lain tetap dibalas normal. Perintah admin tetap diproses saat bot nonaktif.
4. **Batas waktu jeda.** Diputuskan pemilik (2026-10-10): **tanpa auto-resume** — Jeda Percakapan hanya berakhir lewat perintah eksplisit `#lanjut` / `#bot on` (tiket 04).
5. **Ambil Alih otomatis di luar cakupan saat ini.** Perintah eksplisit admin `#jeda` dan `#lanjut` menjadi satu-satunya pemicu Jeda Percakapan.

## Di Luar Lingkup

- Perubahan seam `handleInbound(message, context)` dan perilaku percakapan intake (ADR-0009 tetap berlaku utuh).
- Pembatasan jam operasional / auto-reply di luar jam kerja — kebutuhan berbeda dari jeda manual.
- Pesan pemberitahuan ke pelanggan saat jeda (mis. "admin akan segera membalas") — bot diam penuh, tanpa janji waktu balasan (invarian lama).
- Perubahan kanal handoff admin (ADR-0006) dan format Ringkasan Kebutuhan.

## Testing Decisions

- Seam `handleInbound(message, context)` **tidak berubah**; gerbang jeda hidup di luar seam (layer server/transport), mengikuti pola skip `from === senderNumber` yang sudah ada.
- Perintah admin diproses di layer server **sebelum** seam; pesan berawalan `#` dari nomor selain `WHATSAPP_ADMIN_NUMBER` diperlakukan sebagai pesan biasa — perintah tidak pernah membuka kendali bot bagi pelanggan.
- Pesan saat jeda: satu baris transkrip CSV tetap tercatat, tidak ada `sender.sendText` keluar, dan `conversations.load/save` tidak dipanggil — draft Permintaan Tindak Lanjut maupun mode pembaruan tetap utuh sampai admin `#lanjut`.
- State jeda persisten: dibuktikan dengan tes "restart" (instansi store baru membaca berkas yang sama); `data/` tetap di-ignore git.
- Invarian: tanpa balasan ke pelanggan selama jeda, tanpa janji waktu balasan, konfirmasi perintah hanya ke nomor admin, perintah admin tercatat di log proses (bukan transkrip pelanggan).

## Referensi

- Keputusan kanal admin: `docs/adr/0006-kanal-admin-whatsapp.md`
- Transkrip CSV: `docs/adr/0007-transkrip-percakapan-csv.md`
- Fokus intake (yang dijaga tetap utuh): `docs/adr/0009-fokus-intake-kebutuhan.md`
- Deployment saat ini (Fonnte + quick tunnel): `.scratch/webhook-aktif.md`
- Jalur pesan masuk: `src/server.ts`; penyimpanan percakapan: `src/conversationStore.ts`
