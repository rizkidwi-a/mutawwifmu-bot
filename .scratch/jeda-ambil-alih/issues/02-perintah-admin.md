# 02: Perintah admin via WhatsApp

**What to build:** Pengenalan perintah kendali bot dari pesan WhatsApp masuk, diproses di layer server **sebelum** seam percakapan. Hanya `WHATSAPP_ADMIN_NUMBER` yang diperintahnya; nomor lain tidak pernah membuka kendali bot.

Daftar perintah (huruf besar/kecil dan spasi longgar ditoleransi):

| Perintah | Efek |
| --- | --- |
| `#jeda <nomor>` | Jeda Percakapan untuk kontak tersebut (Ambil Alih) |
| `#jeda` | Jeda kontak dari handoff terakhir; bila tidak ada, bot meminta nomor eksplisit |
| `#lanjut <nomor>` | Akhiri Jeda Percakapan untuk kontak tersebut |
| `#bot off` | Nonaktif Sementara global (semua kontak) |
| `#bot on` | Aktifkan kembali balasan otomatis |
| `#status` | Ringkasan: status global + daftar kontak dijeda beserta waktu mulai |

Konfirmasi dikirim hanya ke nomor admin, singkat, tanpa janji waktu balasan; konfirmasi `#jeda` menyebut nomor yang dijeda dan cara mengembalikannya (`#lanjut <nomor>`) agar bisa disalin. Pesan berawalan `#` dari nomor admin yang tidak dikenal → balas daftar perintah; dari nomor selain admin → diperlakukan sebagai pesan biasa ke jalur percakapan normal.

**Blocked by:** 01: State jeda persisten (per kontak + global)

**Status:** ready-for-agent

- [ ] Perintah pada tabel di atas dikenali dan efeknya diterapkan lewat port state jeda (tiket 01).
- [ ] Hanya `WHATSAPP_ADMIN_NUMBER` yang diperintahnya; nomor lain yang mengirim `#jeda`/`#bot off`/dsb. diperlakukan sebagai pesan calon jemaah biasa (diuji dengan tes).
- [ ] Perintah diproses sebelum seam dan tidak pernah memicu balasan `handleInbound`; `#bot on` tetap bekerja saat Nonaktif Sementara aktif.
- [ ] Nomor pada parameter dinormalisasi E.164 seperti `normalizePhoneNumber`; nomor tidak valid → balasan minta nomor yang benar, state tidak berubah.
- [ ] Setiap perintah tercatat ke log proses (siapa, perintah apa) — bukan ke transkrip CSV pelanggan.
- [ ] Tes baru (mis. `tests/transport/perintahAdmin.test.ts`): tiap perintah + efeknya, `#jeda` tanpa nomor (dengan/tanpa handoff terakhir), nomor tidak valid, perintah tak dikenal dari admin, `#`-perintah dari nomor lain tetap masuk jalur normal, `#bot on` saat bot nonaktif.
- [ ] `README.md` bertambah bagian perintah admin (tabel di atas + peringatan: perintah hanya dari nomor admin, jangan diketik di chat pelanggan karena akan terkirim ke pelanggan).
- [ ] `npm test` dan `npm run typecheck` tetap hijau.

## Testing Decisions

- Parser perintah diuji sebagai unit murni (teks masuk → perintah terstruktur atau null); efek perintah diuji lewat fake `JedaStore` + fake `MessageSender`.
- "Kontak handoff terakhir" diambil dari state jeda (tiket 01); tes mencakup restart (state persisten) dan keadaan kosong.

## Comments

- Sumber: keputusan pemilik 2026-10-10 — opsi 3 (kill switch global + jeda per kontak), dimulai dari perintah eksplisit.
- Kanal perintah sengaja nomor admin (ADR-0006: nomor terpisah dari nomor bot), karena admin membalas pelanggan dari nomor bot — perintah yang diketik di chat pelanggan akan terkirim ke pelanggan. README harus menegaskan ini.
- Bila kelak `WHATSAPP_ADMIN_NUMBER` disamakan dengan nomor bot, jalur perintah ini perlu ditinjau ulang (pesan dari nomor bot saat ini di-skip di `src/server.ts`); di luar lingkup tiket ini.
