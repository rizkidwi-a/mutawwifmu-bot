/**
 * Tes port state jeda (tiket 01): Jeda Percakapan per kontak + Nonaktif
 * Sementara global, persisten lintas "restart" lewat berkas JSON.
 *
 * Diuji murni lewat berkas sementara per tes; tidak menyentuh `data/` nyata.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizePhoneNumber } from "../src/config.ts";
import { DEFAULT_JEDA_STATE_PATH, FileJedaStore } from "../src/jedaStore.ts";

function pathState(): string {
  return join(mkdtempSync(join(tmpdir(), "jeda-")), "jeda-state.json");
}

/** Waktu mulai jeda yang dapat diprediksi di tes. */
const MULAI = new Date("2026-10-10T03:00:00.000Z");

test("berkas state default berada di data/jeda-state.json", () => {
  assert.ok(DEFAULT_JEDA_STATE_PATH.endsWith(join("data", "jeda-state.json")));
});

test("jeda kontak tercatat di status beserta waktu mulai", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });

  store.pauseContact("628123456789");

  const status = store.snapshot();
  assert.equal(status.globallyPaused, false);
  assert.deepEqual(status.pausedContacts, [{ number: "628123456789", since: MULAI }]);
  assert.equal(store.isPaused("628123456789"), true);
});

test("lanjut kontak mengakhiri jeda; mengulangnya tidak mengubah state", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });

  store.pauseContact("628123456789");
  store.resumeContact("628123456789");
  store.resumeContact("628123456789");

  assert.equal(store.isPaused("628123456789"), false);
  assert.deepEqual(store.snapshot().pausedContacts, []);
});

test("Nonaktif Sementara global menahan semua kontak, aktifkan kembali melepasnya", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });

  store.pauseGlobally();
  assert.equal(store.snapshot().globallyPaused, true);
  assert.equal(store.isPaused("628123456789"), true);
  assert.equal(store.isPaused("628987654321"), true);

  store.resumeGlobally();
  assert.equal(store.snapshot().globallyPaused, false);
  assert.equal(store.isPaused("628123456789"), false);
});

test("aktifkan global tidak menghapus jeda per kontak", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });

  store.pauseContact("628123456789");
  store.pauseGlobally();
  store.resumeGlobally();

  const status = store.snapshot();
  assert.equal(status.globallyPaused, false);
  assert.deepEqual(status.pausedContacts, [{ number: "628123456789", since: MULAI }]);
});

test("kontak handoff terakhir disimpan dan dibaca kembali", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });

  assert.equal(store.snapshot().lastHandoffContact, null);

  store.setLastHandoffContact("628123456789");
  assert.equal(store.snapshot().lastHandoffContact, "628123456789");

  store.setLastHandoffContact("628987654321");
  assert.equal(store.snapshot().lastHandoffContact, "628987654321");
});

test("restart membaca kembali jeda kontak, Nonaktif Sementara, dan handoff terakhir", () => {
  const path = pathState();
  const sesi1 = new FileJedaStore(path, { now: () => MULAI });
  sesi1.pauseContact("628123456789");
  sesi1.pauseGlobally();
  sesi1.setLastHandoffContact("628987654321");

  // "Restart": instansi baru membaca berkas yang sama.
  const sesi2 = new FileJedaStore(path);
  const status = sesi2.snapshot();
  assert.equal(status.globallyPaused, true);
  assert.deepEqual(status.pausedContacts, [{ number: "628123456789", since: MULAI }]);
  assert.equal(status.lastHandoffContact, "628987654321");
  assert.equal(sesi2.isPaused("628123456789"), true);
});

test("berkas belum ada -> state kosong tanpa peringatan", () => {
  const peringatan: string[] = [];
  const store = new FileJedaStore(pathState(), { warn: (message) => peringatan.push(message) });

  assert.deepEqual(store.snapshot(), {
    globallyPaused: false,
    pausedContacts: [],
    lastHandoffContact: null,
  });
  assert.deepEqual(peringatan, []);
});

test("berkas korup -> state kosong dengan peringatan, bukan fail-closed", () => {
  const path = pathState();
  writeFileSync(path, "{ ini bukan json", "utf8");
  const peringatan: string[] = [];

  const store = new FileJedaStore(path, { warn: (message) => peringatan.push(message) });

  assert.deepEqual(store.snapshot(), {
    globallyPaused: false,
    pausedContacts: [],
    lastHandoffContact: null,
  });
  assert.equal(peringatan.length, 1);
  assert.match(peringatan[0] ?? "", /rusak/i);
});

test("berkas dengan bentuk tak terduga -> state kosong dengan peringatan", () => {
  const path = pathState();
  writeFileSync(path, JSON.stringify({ nonaktifGlobal: "ya", dijeda: 5 }), "utf8");
  const peringatan: string[] = [];

  const store = new FileJedaStore(path, { warn: (message) => peringatan.push(message) });

  assert.equal(store.snapshot().globallyPaused, false);
  assert.equal(peringatan.length, 1);
});

test("berkas rusak dapat ditimpa state baru saat admin menjeda lagi", () => {
  const path = pathState();
  writeFileSync(path, "bukan json", "utf8");
  const store = new FileJedaStore(path, { now: () => MULAI, warn: () => {} });

  store.pauseContact("628123456789");

  const sesiBaru = new FileJedaStore(path);
  assert.deepEqual(sesiBaru.snapshot().pausedContacts, [
    { number: "628123456789", since: MULAI },
  ]);
});

test("nomor dinormalisasi E.164 sebagai kunci kontak, sama seperti normalizePhoneNumber", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });
  const mentah = "+62 812-3456-789";

  store.pauseContact(mentah);

  assert.equal(normalizePhoneNumber(mentah), "628123456789");
  assert.equal(store.isPaused("628123456789"), true);
  assert.equal(store.snapshot().pausedContacts[0]?.number, "628123456789");
});

test("nomor tidak valid ditolak dan tidak mengubah state", () => {
  const store = new FileJedaStore(pathState(), { now: () => MULAI });

  assert.throws(() => store.pauseContact("123"));
  assert.throws(() => store.setLastHandoffContact("bukan-nomor"));

  assert.deepEqual(store.snapshot(), {
    globallyPaused: false,
    pausedContacts: [],
    lastHandoffContact: null,
  });
});

test("berkas state berbentuk JSON datar yang dapat dibaca manual", () => {
  const path = pathState();
  const store = new FileJedaStore(path, { now: () => MULAI });

  store.pauseContact("628123456789");

  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), {
    nonaktifGlobal: false,
    dijeda: [{ nomor: "628123456789", mulai: MULAI.toISOString() }],
    kontakHandoffTerakhir: null,
  });
});

test("jeda ulang kontak yang sama mempertahankan waktu mulai pertama dan berkas tidak berubah", () => {
  const path = pathState();
  let sekarang = MULAI;
  const store = new FileJedaStore(path, { now: () => sekarang });

  store.pauseContact("628123456789");
  const isiPertama = readFileSync(path, "utf8");

  sekarang = new Date("2026-10-11T03:00:00.000Z");
  store.pauseContact("628123456789");

  assert.equal(readFileSync(path, "utf8"), isiPertama);
  assert.deepEqual(store.snapshot().pausedContacts, [
    { number: "628123456789", since: MULAI },
  ]);
});

test("operasi berulang yang tidak mengubah state tidak menulis ulang berkas", () => {
  const path = pathState();
  const store = new FileJedaStore(path, { now: () => MULAI });
  store.pauseContact("628123456789");
  store.pauseGlobally();
  store.setLastHandoffContact("628987654321");
  const acuanNonaktif = readFileSync(path, "utf8");

  // Semua panggilan berikut tidak mengubah state (idempoten).
  store.pauseContact("628123456789");
  store.pauseGlobally();
  store.resumeContact("628111111111");
  store.setLastHandoffContact("628987654321");

  assert.equal(readFileSync(path, "utf8"), acuanNonaktif);

  store.resumeGlobally();
  const acuanAktif = readFileSync(path, "utf8");
  store.resumeGlobally();
  store.resumeContact("628111111111");

  assert.equal(readFileSync(path, "utf8"), acuanAktif);

  store.resumeContact("628123456789");
  const acuanLanjut = readFileSync(path, "utf8");
  store.resumeContact("628123456789");

  assert.equal(readFileSync(path, "utf8"), acuanLanjut);
});

test("kegagalan tulis dicatat ke log dan tidak melempar ke pemanggil", () => {
  const path = join(mkdtempSync(join(tmpdir(), "jeda-")), "state-sebagai-direktori");
  mkdirSync(path);
  const peringatan: string[] = [];
  const store = new FileJedaStore(path, {
    now: () => MULAI,
    warn: (message) => peringatan.push(message),
  });
  peringatan.length = 0;

  assert.doesNotThrow(() => store.pauseContact("628123456789"));
  assert.doesNotThrow(() => store.pauseGlobally());
  assert.doesNotThrow(() => store.setLastHandoffContact("628987654321"));

  assert.equal(store.isPaused("628123456789"), true);
  assert.equal(store.snapshot().globallyPaused, true);
  assert.equal(store.snapshot().lastHandoffContact, "628987654321");
  assert.equal(peringatan.length, 3);
});
