/**
 * Regresi end-to-end dari dialog nyata (tiket 06).
 *
 * Skenario multi-giliran di bawah disusun dari dialog nyata
 * `data/Vira Arman/chat.md` (dianonimkan; `data/` tidak ter-versioning) dan
 * diproses apa adanya lewat seam `handleInbound`. Kriteria: tidak ada pesan
 * yang salah dijawab topik lain (tidak ada misfire), pesan informasi tidak
 * dijawab template yang tidak nyambung, basa-basi dibalas singkat tanpa
 * merusak alur intake, pertanyaan yang tidak didukung terbawa ke admin, dan
 * kebutuhan utama skenario muncul lengkap pada Ringkasan Kebutuhan untuk admin.
 *
 * Bila direktori `data/` tersedia, seluruh transkrip jemaah yang ada
 * (Vira Arman, Cut Emelia, Evi N, +62 812-1008-778) ikut direplay sebagai
 * sumber regresi tambahan; tes terkait dilewati bila `data/` tidak ada.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Percakapan, teksBalasan } from "../conversation/pembantuPercakapan.ts";
import { templateDalamBalasan } from "./deteksiMisfire.ts";
import { pesanJemaah } from "./transkrip.ts";
import { formatAdminHandoff } from "../../src/adminChannel.ts";
import { classifyInbound } from "../../src/conversation/classifyInbound.ts";
import type { FaqTopic } from "../../src/knowledge/businessFaq.ts";
import type { BotTurn, FollowUpRequest } from "../../src/conversation/types.ts";

/**
 * Skenario dari `data/Vira Arman/chat.md`, dianonimkan (nama dan nomor dibuang).
 * Urutan mengikuti alur intake bot: pembukaan → layanan → tanggal → pax →
 * kebutuhan detail (visa + rute) → pertanyaan harga → anggaran → persetujuan →
 * perubahan kebutuhan. Teks sengaja dipertahankan mendekati dialog aslinya.
 */
const SKENARIO: readonly string[] = [
  // Pembukaan (2 Okt, 4.07).
  "Assalamualaikum kak, salam kenal. Mau tanya-tanya soal land arrangement umroh, apa bisa?",
  // Basa-basi di tengah pengumpulan (14.30).
  "makasi ya kak",
  // Layanan yang diminati — disusun dari daftar LA yang disepakati dialog
  // (1 visa, 2 transport, 4 mutawwif, 5-6 ziarah) dan balasan "fokus 1-2-4-5-6".
  "fokus ke visa umroh, transport GMC, mutawwif, sama ziarah Makkah dan Madinah aja ya kak",
  // Tanggal/periode (12.52).
  "dari 13 Januari - 24 Januari",
  // Jumlah jemaah (15.09).
  "5 Pax: 1. saya 2. suami 3. anak saya 2 tahun 4. Bapak Mertua 5. Ibu Mertua",
  // Kebutuhan detail (12.52): kebutuhan visa per jemaah + rute keberangkatan.
  "yang butuh pengurusan visa cuma Bapak & Ibu Mertua. beliau terbang dari Jakarta, " +
    "saya & kel dari Amsterdam.",
  // Pertanyaan harga yang tidak didukung materi: permintaan cek harga hotel spesifik (16.13).
  "boleh tolong di check gak yaa untuk harganya: 13-20 Januari - Jumeirah Jabal Omar - " +
    "Deluxe Room Haram View. 20-24 Januari - Diyar Ajwa. King Room.",
  // Pertanyaan yang tidak didukung lain (17.23).
  "kak, mau tanya lagi.. kalo harramain train itu sbnrnya on-time banget ga yah?",
  // Anggaran opsional dilewati.
  "tidak usah",
  // Persetujuan penerusan Ringkasan Kebutuhan.
  "ya, setuju",
  // Perubahan kebutuhan (17.09) — sekaligus kasus misfire HARGA/price-hotel.
  "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga free cancellation " +
    "to non refundable soalnya bedanya jauh",
  // Persetujuan pengiriman ulang ringkasan yang diperbarui.
  "ya",
];

/** Kebutuhan utama skenario yang wajib muncul pada Ringkasan Kebutuhan admin. */
const KEBUTUHAN_UTAMA: ReadonlyArray<readonly [nama: string, pola: RegExp]> = [
  ["tanggal keberangkatan", /13 Januari/],
  ["tanggal kepulangan", /24 Januari/],
  ["jumlah jemaah", /5 Pax/i],
  ["rincian jemaah", /Bapak Mertua/],
  ["rincian jemaah", /Ibu Mertua/],
  ["layanan visa", /visa umroh/i],
  ["layanan transport", /transport/i],
  ["layanan mutawwif", /mutawwif/i],
  ["layanan ziarah", /ziarah/i],
  ["kebutuhan visa per jemaah", /visa cuma Bapak & Ibu Mertua/i],
  ["rute keberangkatan", /Jakarta/],
  ["rute keberangkatan", /Amsterdam/],
];

/**
 * Pertanyaan harga yang angkanya tercantum materi dan diizinkan dijawab
 * Harga Indikatif saat replay. Sisanya tidak boleh memunculkan template.
 * Tiga kasus ini masih jatuh ke handoff (tiket 09) — diizinkan agar kriteria
 * "tanpa misfire" tidak tertukar dengan kriteria tiket 09.
 */
const HARGA_TERDUKUNG: readonly (readonly [kunci: string, topik: FaqTopic])[] = [
  ["Mutowwif nya ini mendampingi", "price-mutawwif"],
  ["kl kita mau tambah pakai muthawif", "price-mutawwif"],
  ["mohon nanti dapat diinfokan juga jasanya apa saja", "price-mutawwif"],
];

interface HasilSkenario {
  readonly balasan: readonly string[];
  readonly aksi: readonly BotTurn["actions"][number][];
}

/** Jalankan skenario lewat seam `handleInbound`, kumpulkan balasan dan aksi. */
function jalankanSkenario(): HasilSkenario {
  const percakapan = new Percakapan();
  const balasan: string[] = [];
  const aksi: BotTurn["actions"][number][] = [];
  for (const pesan of SKENARIO) {
    const turn = percakapan.kirim(pesan);
    assert.ok(turn.reply, `pesan "${pesan.slice(0, 40)}" harus dibalas`);
    balasan.push(turn.reply.text);
    aksi.push(...turn.actions);
  }
  return { balasan, aksi };
}

/** Ringkasan Kebutuhan terakhir yang tercatat untuk admin, bila ada. */
function ringkasanTerakhir(aksi: HasilSkenario["aksi"]): FollowUpRequest {
  const catat = aksi.filter((a) => a.kind === "record-follow-up-request");
  const terakhir = catat.at(-1);
  assert.ok(terakhir && terakhir.kind === "record-follow-up-request", "ringkasan harus tercatat");
  return terakhir.request;
}

/** Teks yang diterima admin untuk sebuah Ringkasan Kebutuhan (ADR-0010). */
function pesanAdmin(request: FollowUpRequest, revision = false): string {
  return formatAdminHandoff({
    from: "628123456789",
    reason: "follow-up-request",
    request,
    ...(revision ? { revision: true as const } : {}),
  });
}

test("skenario multi-giliran dari dialog nyata berjalan tanpa misfire", () => {
  const { balasan } = jalankanSkenario();
  for (const [indeks, balasanTeks] of balasan.entries()) {
    assert.deepEqual(
      templateDalamBalasan(balasanTeks),
      [],
      `misfire pada giliran ${indeks} (${SKENARIO[indeks]}):\n>> ${balasanTeks.slice(0, 160)}`,
    );
  }
});

test("Ringkasan Kebutuhan untuk admin memuat seluruh kebutuhan utama skenario", () => {
  const request = ringkasanTerakhir(jalankanSkenario().aksi);
  const teks = pesanAdmin(request, true);
  for (const [nama, pola] of KEBUTUHAN_UTAMA) {
    assert.match(teks, pola, `kebutuhan utama ${nama} belum muncul pada ringkasan admin`);
  }
});

test("basa-basi pada skenario dibalas singkat tanpa merusak alur intake", () => {
  const { balasan, aksi } = jalankanSkenario();
  const indeks = SKENARIO.indexOf("makasi ya kak");
  assert.ok(indeks >= 0);
  const [lead, ...sisa] = (balasan[indeks] ?? "").split("\n\n");
  assert.ok(lead && lead.length < 120, `balasan basa-basi harus singkat, dapat: ${lead}`);
  // Bidang yang sedang ditanya (layanan) diulang, bukan dijawab oleh basa-basi.
  assert.match(sisa.join("\n\n"), /minati|tanggal|periode/i);
  // Basa-basi tidak mencemari Ringkasan Kebutuhan.
  assert.doesNotMatch(pesanAdmin(ringkasanTerakhir(aksi)), /makasi ya kak/);
});

test("pertanyaan yang tidak didukung pada skenario terbawa ke admin", () => {
  const { aksi } = jalankanSkenario();
  const request = ringkasanTerakhir(aksi);
  for (const pesan of SKENARIO) {
    if (pesan.startsWith("boleh tolong di check") || pesan.startsWith("kak, mau tanya lagi")) {
      assert.ok(
        request.notedQuestions.some((q) => q === pesan),
        `pertanyaan tidak didukung tidak terbawa ke admin: ${pesan.slice(0, 50)}`,
      );
    }
  }
});

test("perubahan kebutuhan pada skenario dikirim ulang dengan penanda PEMBARUAN", () => {
  const { balasan, aksi } = jalankanSkenario();
  const perubahan = SKENARIO.at(-2);
  assert.ok(perubahan && perubahan.startsWith("sebenernya kita bukannya"));
  const balasanPerubahan = balasan[SKENARIO.length - 2] ?? "";
  assert.deepEqual(templateDalamBalasan(balasanPerubahan), []);
  assert.match(balasanPerubahan, /perubahan kebutuhan Anda saya catat/i);
  const teruskan = aksi.filter((a) => a.kind === "hand-off-to-admin").at(-1);
  assert.ok(teruskan && teruskan.kind === "hand-off-to-admin");
  assert.equal(teruskan.revision, true);
  const teksAdmin = pesanAdmin(ringkasanTerakhir(aksi), true);
  assert.match(teksAdmin, /PEMBARUAN/);
  assert.ok(teksAdmin.includes(`- Perubahan: ${perubahan}`));
});

// ---------------------------------------------------------------------------
// Replay seluruh transkrip nyata di `data/` (dilewati bila tidak tersedia).
// ---------------------------------------------------------------------------

const DIREKTORI_DATA = fileURLToPath(new URL("../../data", import.meta.url));
const dataTersedia = existsSync(DIREKTORI_DATA);
const alasanLewat = "direktori data/ (transkrip pribadi) tidak tersedia";
const TRANSKRIP = dataTersedia
  ? readdirSync(DIREKTORI_DATA, { withFileTypes: true })
      .filter((entri) => entri.isDirectory() && existsSync(join(DIREKTORI_DATA, entri.name, "chat.md")))
      .map((entri) => entri.name)
      .sort()
  : [];

interface HasilReplay {
  readonly nama: string;
  readonly pesan: readonly string[];
  readonly balasan: readonly string[];
  readonly aksi: readonly BotTurn["actions"][number][];
}

/** Replay seluruh pesan jemaah sebuah transkrip lewat seam `handleInbound`. */
function replayTranskrip(nama: string): HasilReplay {
  const pesan = pesanJemaah(join(DIREKTORI_DATA, nama, "chat.md"));
  const percakapan = new Percakapan();
  const balasan: string[] = [];
  const aksi: BotTurn["actions"][number][] = [];
  for (const teks of pesan) {
    const turn = percakapan.kirim(teks);
    assert.ok(turn.reply, `pesan "${teks.slice(0, 40)}" pada ${nama} harus dibalas`);
    balasan.push(turn.reply.text);
    aksi.push(...turn.actions);
  }
  return { nama, pesan, balasan, aksi };
}

test("replay keempat transkrip nyata berjalan tanpa error", { skip: dataTersedia ? false : alasanLewat }, () => {
  assert.ok(TRANSKRIP.length >= 4, `harapkan minimal 4 transkrip, dapat ${TRANSKRIP.length}`);
  for (const nama of TRANSKRIP) {
    const { pesan, balasan } = replayTranskrip(nama);
    assert.equal(balasan.length, pesan.length, `setiap pesan ${nama} harus dibalas`);
  }
});

test("tidak ada balasan template topik lain pada replay transkrip nyata", { skip: dataTersedia ? false : alasanLewat }, () => {
  for (const nama of TRANSKRIP) {
    const { pesan, balasan } = replayTranskrip(nama);
    for (const [indeks, balasanTeks] of balasan.entries()) {
      const pesanTeks = pesan[indeks] ?? "";
      const diizinkan = HARGA_TERDUKUNG.filter(([kunci]) => pesanTeks.includes(kunci)).map(
        ([, topik]) => topik,
      );
      const template = templateDalamBalasan(balasanTeks);
      assert.deepEqual(
        template.filter((topik) => !diizinkan.includes(topik)),
        [],
        `misfire ${nama} #${indeks} (${pesanTeks.slice(0, 60)}):\n>> ${balasanTeks.slice(0, 160)}`,
      );
    }
  }
});

test("kebutuhan utama dialog Vira Arman muncul pada Ringkasan Kebutuhan admin", { skip: dataTersedia ? false : alasanLewat }, () => {
  const { aksi } = replayTranskrip("Vira Arman");
  const request = ringkasanTerakhir(aksi);
  const teksAdmin = pesanAdmin(request);
  const faktaDialog: ReadonlyArray<readonly [string, RegExp]> = [
    ["tanggal", /13 Januari/],
    ["tanggal", /24 Januari/],
    ["jumlah jemaah", /5 pax/i],
    ["rincian jemaah", /Bapak Mertua/],
    ["kebutuhan visa", /visa/i],
    ["rute", /Jakarta/],
    ["rute", /Amsterdam/],
    ["layanan", /land arrangement/i],
    ["layanan", /mutawwif/i],
    ["layanan", /transport/i],
  ];
  for (const [nama, pola] of faktaDialog) {
    assert.match(teksAdmin, pola, `kebutuhan utama ${nama} dialog belum muncul pada ringkasan`);
  }
});

test("basa-basi pada dialog nyata tidak mencemari Ringkasan Kebutuhan", { skip: dataTersedia ? false : alasanLewat }, () => {
  const { aksi } = replayTranskrip("Vira Arman");
  const teksAdmin = pesanAdmin(ringkasanTerakhir(aksi));
  assert.doesNotMatch(teksAdmin, /makasi ya kak/);
});

// ---------------------------------------------------------------------------
// Kriteria dua temuan analisis pencocokan transkrip (`.scratch/
// pencocokan-korpus-transkrip/analisis.md`). Perbaikannya milik tiket 08 dan
// 09 — dicatat di sini sebagai kriteria replay; perbaikan tiket 08 sudah
// terpenuhi dan dijaga sebagai tes biasa, perbaikan tiket 09 masih tertunda.
// ---------------------------------------------------------------------------

test("kriteria tiket 08: kasus transkrip-nyata berlabel handoff tidak jatuh ke jalur FAQ", () => {
  const korpus = JSON.parse(
    readFileSync(new URL("../../tests/korpus/transkrip-nyata.json", import.meta.url), "utf8"),
  ) as { kasus: { pesan: string; harapan: { jenis: string } }[] };
  for (const kasus of korpus.kasus) {
    if (kasus.harapan.jenis !== "handoff") {
      continue;
    }
    assert.equal(
      classifyInbound(kasus.pesan).kind,
      "handoff",
      `over-faq: ${kasus.pesan.slice(0, 60)}`,
    );
  }
});

test("kriteria tiket 09: pertanyaan terdukung tidak jatuh ke handoff", { todo: "perbaikan pola milik tiket 09" }, () => {
  const kasus: ReadonlyArray<readonly [pesan: string, topik: FaqTopic]> = [
    ["kl kita mau tambah pakai muthawif itu biayanya berapa ?", "price-mutawwif"],
    ["Mutowwif nya ini mendampingi dari awal proses umroh sampai selesai untuk kami bertiga kan mba harganya?", "price-mutawwif"],
    ["Jika tersedia, mohon nanti dapat diinfokan juga jasanya apa saja selain membimbing saat umroh, beserta tarifnya", "price-mutawwif"],
    ["Paspor nya apakah halaman depan aja atau semuanya?", "visa-documents"],
  ];
  for (const [pesan, topik] of kasus) {
    const routing = classifyInbound(pesan);
    assert.ok(
      routing.kind === "faq" || routing.kind === "indicative-price",
      `pertanyaan terdukung jatuh ke handoff: ${pesan}`,
    );
    assert.equal(routing.topic, topik, pesan);
  }
});
