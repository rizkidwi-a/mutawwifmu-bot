# 03: Gerbang jeda pada jalur pesan masuk

**What to build:** Pada loop webhook `src/server.ts`, **sebelum** `handleInbound`, tambahkan gerbang jeda (mengikuti pola skip `from === senderNumber` yang sudah ada):

- Kontak yang sedang dijeda, atau saat Nonaktif Sementara global aktif: pesan tetap dicatat ke transkrip CSV (peran calon jemaah) apa adanya, tetapi **tidak** memanggil seam, **tidak** menyimpan/mengubah konteks percakapan, dan **tidak** mengirim balasan apa pun.
- Kontak lain tetap diproses normal seperti sekarang.
- Pesan perintah dari `WHATSAPP_ADMIN_NUMBER` (tiket 02) tetap diproses saat bot nonaktif — inilah jalan kembali (`#bot on`, `#lanjut`).

Efek yang dijaga: draft Permintaan Tindak Lanjut, mode pembaruan setelah handoff, dan riwayat percakapan kontak yang dijeda **utuh** sampai admin `#lanjut` — pesan yang masuk selama jeda tidak menggeser state alur.

**Blocked by:** 01: State jeda persisten (per kontak + global)

**Status:** resolved

- [ ] Gerbang menahan balasan untuk kontak yang dijeda; `sender.sendText` tidak pernah dipanggil untuk kontak tersebut (diuji dengan fake sender).
- [ ] Gerbang menahan balasan untuk semua kontak saat Nonaktif Sementara, kecuali pesan perintah admin.
- [ ] Pesan selama jeda tetap tercatat satu baris di transkrip CSV (peran calon jemaah, teks apa adanya); kegagalan transkrip tidak mengubah keputusan diam.
- [ ] `conversations.load`/`save` tidak dipanggil untuk pesan yang ditahan — state alur dan riwayat tidak berubah (diuji dengan store yang memantau pemanggilan).
- [ ] Pesan dari kontak tidak terjeda tetap dibalas normal; tidak ada perubahan perilaku untuk mereka.
- [ ] Tes baru (mis. `tests/transport/jedaPesanMasuk.test.ts`): kontak dijeda (tanpa balasan + transkrip tercatat + state utuh), kontak lain tetap dibalas, Nonaktif Sementara global, pemulihan setelah `#lanjut`/`#bot on`, pesan non-teks saat jeda ikut tercatat dengan sebutan lampirannya.
- [ ] Keputusan dicatat sebagai `docs/adr/0011-jeda-dan-ambil-alih-admin.md` (status accepted, mengikuti format ADR yang ada).
- [ ] `README.md` bertambah bagian "Jeda & Ambil Alih" (perilaku bot saat jeda, state persisten, batasan: bot diam penuh tanpa pemberitahuan ke pelanggan); `CONTEXT.md` bertambah istilah **Jeda Percakapan** dan **Ambil Alih** mengikuti konvensi domain yang ada.
- [ ] `npm test` dan `npm run typecheck` tetap hijau.

## Testing Decisions

- Seam `handleInbound(message, context)` **tidak berubah**; gerbang diuji dari luar seam lewat `createAppServer` dengan dependency palsu (pola tes `tests/transport/` yang ada).
- Invarian yang dipertahankan: tanpa balasan ke pelanggan selama jeda, tanpa janji waktu balasan, tanpa perubahan nilai percakapan kontak yang dijeda.

## Comments

- Sumber: `.scratch/jeda-ambil-alih/spec.md` (bagian Ruang Lingkup #3).
- Pesan selama jeda sengaja **tidak** masuk riwayat percakapan bot — hanya transkrip CSV. Alasan: memasukkannya akan menggeser state alur (mis. dianggap jawaban pengumpulan kebutuhan) padahal admin yang sedang menangani. Transkrip CSV tetap lengkap sebagai catatan untuk pemilik.
- ADR-0011 menjadi tempat mencatat alasan keputusan (bot diam penuh, tanpa pemberitahuan otomatis ke pelanggan; state jeda persisten di `data/`).
- Selesai: gerbang `deps.jeda.isPaused(pesan.from)` di `src/server.ts` ditempatkan **setelah** pemrosesan perintah admin dan **sebelum** `conversations.load`/`handleInbound`. Pesan yang ditahan hanya menulis satu baris transkrip (peran calon jemaah, teks apa adanya termasuk sebutan lampiran); kegagalan transkrip best-effort tidak mengubah keputusan diam. Tes: `tests/transport/jedaPesanMasuk.test.ts` (7 kasus). Perintah admin tetap jalan kembali karena diproses lebih dulu — `#bot on`/`#lanjut` tidak pernah mencapai gerbang.
