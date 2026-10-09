/**
 * Kasus tes negatif dari kumpulan misfire `.scratch/eval-classify.txt` (tiket 06).
 *
 * Kumpulan itu adalah 55 pesan percakapan nyata (sumber `data/Vira Arman/chat.md`)
 * yang pada evaluasi terdahulu pernah menghasilkan "jawaban salah konteks" dan
 * "pesan informasi dijawab template yang tidak nyambung". Setiap kasus
 * diproses lewat seam `handleInbound` pada tiga konteks — percakapan baru,
 * tengah pengumpulan, dan setelah Ringkasan Kebutuhan terkirim — dan tidak
 * boleh memunculkan balasan template materi mana pun.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Percakapan, teksBalasan } from "../conversation/pembantuPercakapan.ts";
import { templateDalamBalasan } from "./deteksiMisfire.ts";

/** Kasus misfire: label evaluasi lama beserta pesan (terpotong) apa adanya. */
interface Kasus {
  readonly label: string;
  readonly pesan: string;
}

function muatKasus(): Kasus[] {
  const isi = readFileSync(new URL("../../.scratch/eval-classify.txt", import.meta.url), "utf8");
  return isi
    .split("\n")
    .filter((baris) => /^(OPENER\s|\w+\/)/.test(baris))
    .map((baris) => {
      const [label = "", ...sisa] = baris.split("|");
      return { label: label.trim(), pesan: sisa.join("|").trim() };
    });
}

const KASUS: readonly Kasus[] = muatKasus();

/** Kasus misfire yang paling sering muncul: pernyataan bermuatan kata harga. */
const PERNYATAAN_HARGA = "sebenernya kita bukannya mau ganti hotel si.. cuma ganti dari harga fr";

/** Konteks percakapan tempat kasus dijalankan. */
const KONTEKS: ReadonlyArray<readonly [nama: string, siapkan: (p: Percakapan) => void]> = [
  ["percakapan baru", () => {}],
  [
    "tengah pengumpulan",
    (percakapan) => {
      percakapan.kirim("Halo");
      percakapan.kirim("Umrah premium, tujuan Mekkah");
    },
  ],
  [
    "setelah ringkasan terkirim",
    (percakapan) => {
      percakapan.kirim("Halo");
      percakapan.kirim("Umrah premium, tujuan Mekkah");
      percakapan.kirim("Rencana Desember 2025");
      percakapan.kirim("4 orang");
      percakapan.kirim("Butuh kamar keluarga");
      percakapan.kirim("tidak usah");
      percakapan.kirim("Ya, setuju");
    },
  ],
];

test("kumpulan misfire eval-classify berisi 55 kasus yang utuh", () => {
  assert.equal(KASUS.length, 55);
  assert.ok(KASUS.some((k) => k.pesan === PERNYATAAN_HARGA));
});

for (const [nama, siapkan] of KONTEKS) {
  test(`tidak ada kasus misfire yang dijawab template materi saat ${nama}`, () => {
    for (const kasus of KASUS) {
      const percakapan = new Percakapan();
      siapkan(percakapan);
      const balasan = teksBalasan(percakapan.kirim(kasus.pesan));
      assert.deepEqual(
        templateDalamBalasan(balasan),
        [],
        `misfire ${kasus.label} saat ${nama}: ${kasus.pesan}\n>> ${balasan.slice(0, 160)}`,
      );
    }
  });
}

test("kasus HARGA/price-hotel diperlakukan sebagai informasi kebutuhan, bukan template harga", () => {
  const percakapan = new Percakapan();
  percakapan.kirim("Halo");
  percakapan.kirim("Umrah premium, tujuan Mekkah");
  percakapan.kirim("Rencana Desember 2025");
  percakapan.kirim("4 orang");
  percakapan.kirim("Butuh kamar keluarga");
  percakapan.kirim("tidak usah");
  percakapan.kirim("Ya, setuju");
  const balasan = teksBalasan(percakapan.kirim(PERNYATAAN_HARGA));
  assert.deepEqual(templateDalamBalasan(balasan), []);
  assert.match(balasan, /perubahan kebutuhan Anda saya catat/i);
  assert.ok(balasan.includes(`- Perubahan: ${PERNYATAAN_HARGA}`));
});
