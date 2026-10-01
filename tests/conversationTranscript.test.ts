/**
 * Tes modul transkrip CSV (tiket 08): pembuatan berkas, header sekali, BOM,
 * CRLF, waktu WIB, dan escaping RFC 4180.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CsvConversationTranscript } from "../src/conversationTranscript.ts";

const HEADER = "waktu,nomor,peran,pesan";

function pathTranskrip(berkas = "transkrip-percakapan.csv"): string {
  return join(mkdtempSync(join(tmpdir(), "transkrip-")), berkas);
}

function baca(path: string): string {
  return readFileSync(path, "utf8");
}

test("berkas dibuat otomatis dengan BOM, header sekali, dan akhir baris CRLF", () => {
  const path = pathTranskrip("nested/dalam/transkrip-percakapan.csv");
  const transkrip = new CsvConversationTranscript(path);

  transkrip.record({
    at: new Date("2026-10-01T03:05:07Z"),
    number: "628123456789",
    role: "calon-jemaah",
    text: "Halo",
  });
  transkrip.record({
    at: new Date("2026-10-01T03:05:08Z"),
    number: "628123456789",
    role: "asisten",
    text: "Selamat datang",
  });

  const isi = baca(path);
  assert.ok(isi.startsWith("\uFEFF" + HEADER + "\r\n"), "BOM dan header di awal berkas");
  assert.equal(isi.split(HEADER).length - 1, 1, "header hanya ditulis sekali");
  assert.equal(isi, "\uFEFF" + HEADER + "\r\n" +
    "2026-10-01 10:05:07,628123456789,calon-jemaah,Halo\r\n" +
    "2026-10-01 10:05:08,628123456789,asisten,Selamat datang\r\n");
});

test("waktu disimpan dalam WIB (UTC+7), bukan UTC proses", () => {
  const path = pathTranskrip();
  const transkrip = new CsvConversationTranscript(path);

  transkrip.record({
    at: new Date("2026-10-01T17:30:00Z"),
    number: "628123456789",
    role: "calon-jemaah",
    text: "Malam",
  });

  assert.match(baca(path), /2026-10-02 00:30:00,628123456789,calon-jemaah,Malam\r\n$/);
});

test("pesan dengan koma, tanda kutip, dan baris baru di-escape sesuai RFC 4180", () => {
  const path = pathTranskrip();
  const transkrip = new CsvConversationTranscript(path);
  const pesan = 'Harga "hotel", untuk 2 orang\nbaris kedua';

  transkrip.record({
    at: new Date("2026-10-01T03:05:07Z"),
    number: "628123456789",
    role: "calon-jemaah",
    text: pesan,
  });

  assert.equal(
    baca(path),
    "\uFEFF" + HEADER + "\r\n" +
      '2026-10-01 10:05:07,628123456789,calon-jemaah,"Harga ""hotel"", untuk 2 orang\nbaris kedua"\r\n',
  );
});

test("berkas yang sudah ada ditambahi tanpa menulis ulang header", () => {
  const path = pathTranskrip();
  writeFileSync(path, "\uFEFF" + HEADER + "\r\n2026-10-01 09:00:00,628111,calon-jemaah,Lama\r\n", "utf8");

  const transkrip = new CsvConversationTranscript(path);
  transkrip.record({
    at: new Date("2026-10-01T03:05:07Z"),
    number: "628222",
    role: "asisten",
    text: "Baru",
  });

  const isi = baca(path);
  assert.equal(isi.split(HEADER).length - 1, 1);
  assert.match(isi, /Lama\r\n2026-10-01 10:05:07,628222,asisten,Baru\r\n$/);
});
