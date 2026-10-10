/**
 * Tes unit perintah admin (tiket 02): parser murni (teks masuk -> perintah
 * terstruktur atau null) dan efek perintah lewat `JedaStore` palsu.
 *
 * Gerbang pada jalur pesan masuk (`src/server.ts`) diuji terpisah di
 * tests/transport/perintahAdmin.test.ts.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAFTAR_PERINTAH_ADMIN,
  PESAN_NOMOR_TIDAK_VALID,
  applyAdminCommand,
  isCommandText,
  parseAdminCommand,
} from "../src/adminCommands.ts";
import { JedaStorePalsu, MULAI_JEDA } from "./pembantuJeda.ts";

test("perintah dikenali huruf besar/kecil dan spasi longgar", () => {
  assert.deepEqual(parseAdminCommand("#jeda 628123456789"), { kind: "jeda", nomor: "628123456789" });
  assert.deepEqual(parseAdminCommand("  #JEDA   628123456789  "), {
    kind: "jeda",
    nomor: "628123456789",
  });
  assert.deepEqual(parseAdminCommand("#jeda"), { kind: "jeda", nomor: null });
  assert.deepEqual(parseAdminCommand("#Jeda"), { kind: "jeda", nomor: null });
  assert.deepEqual(parseAdminCommand("#lanjut 628123456789"), {
    kind: "lanjut",
    nomor: "628123456789",
  });
  assert.deepEqual(parseAdminCommand("#LanJut 628123456789"), {
    kind: "lanjut",
    nomor: "628123456789",
  });
  assert.deepEqual(parseAdminCommand("#bot off"), { kind: "bot-off" });
  assert.deepEqual(parseAdminCommand("#BOT   OFF"), { kind: "bot-off" });
  assert.deepEqual(parseAdminCommand("#bot on"), { kind: "bot-on" });
  assert.deepEqual(parseAdminCommand("#status"), { kind: "status" });
  assert.deepEqual(parseAdminCommand("#STATUS"), { kind: "status" });
});

test("teks yang bukan perintah dikenali sebagai null", () => {
  assert.equal(parseAdminCommand("Halo, saya mau bertanya"), null);
  assert.equal(parseAdminCommand(null), null);
  assert.equal(parseAdminCommand(""), null);
  assert.equal(parseAdminCommand("   "), null);
});

test("perintah tak dikenal atau argumen kurang/lebih menghasilkan null", () => {
  assert.equal(parseAdminCommand("#foo"), null);
  assert.equal(parseAdminCommand("#bot"), null);
  assert.equal(parseAdminCommand("#bot mungkin"), null);
  assert.equal(parseAdminCommand("#lanjut"), null);
  assert.equal(parseAdminCommand("#status sekarang"), null);
  assert.equal(parseAdminCommand("#jeda 628123456789 tambahan"), null);
});

test("hanya teks berawalan # yang dianggap calon perintah", () => {
  assert.equal(isCommandText("#jeda"), true);
  assert.equal(isCommandText("  #status"), true);
  assert.equal(isCommandText("halo #jeda"), false);
  assert.equal(isCommandText(null), false);
  assert.equal(isCommandText(""), false);
});

test("#jeda <nomor> menjeda kontak dan konfirmasi menyebut nomor serta cara mengembalikannya", () => {
  const store = new JedaStorePalsu();

  const balasan = applyAdminCommand({ kind: "jeda", nomor: "628123456789" }, { store });

  assert.equal(store.isPaused("628123456789"), true);
  assert.match(balasan, /628123456789/);
  assert.match(balasan, /#lanjut 628123456789/);
});

test("#jeda tanpa nomor memakai kontak handoff terakhir", () => {
  const store = new JedaStorePalsu({ lastHandoffContact: "628987654321" });

  const balasan = applyAdminCommand({ kind: "jeda", nomor: null }, { store });

  assert.equal(store.isPaused("628987654321"), true);
  assert.match(balasan, /628987654321/);
});

test("#jeda tanpa nomor dan tanpa handoff terakhir meminta nomor eksplisit tanpa mengubah state", () => {
  const store = new JedaStorePalsu();

  const balasan = applyAdminCommand({ kind: "jeda", nomor: null }, { store });

  assert.match(balasan, /#jeda 628123456789/);
  assert.deepEqual(store.panggilan, []);
  assert.deepEqual(store.snapshot().pausedContacts, []);
});

test("nomor tidak valid pada #jeda ditolak tanpa mengubah state", () => {
  const store = new JedaStorePalsu();

  const balasan = applyAdminCommand({ kind: "jeda", nomor: "bukan-nomor" }, { store });

  assert.equal(balasan, PESAN_NOMOR_TIDAK_VALID);
  assert.deepEqual(store.panggilan, []);
  assert.deepEqual(store.snapshot().pausedContacts, []);
});

test("nomor tidak valid pada #lanjut ditolak tanpa mengubah state", () => {
  const store = new JedaStorePalsu({ dijeda: ["628123456789"] });

  const balasan = applyAdminCommand({ kind: "lanjut", nomor: "12" }, { store });

  assert.equal(balasan, PESAN_NOMOR_TIDAK_VALID);
  assert.deepEqual(store.panggilan, []);
  assert.equal(store.isPaused("628123456789"), true);
});

test("#lanjut <nomor> mengakhiri jeda kontak", () => {
  const store = new JedaStorePalsu({ dijeda: ["628123456789"] });

  const balasan = applyAdminCommand({ kind: "lanjut", nomor: "628123456789" }, { store });

  assert.equal(store.isPaused("628123456789"), false);
  assert.match(balasan, /628123456789/);
});

test("#bot off menyalakan Nonaktif Sementara, #bot on mematikannya", () => {
  const store = new JedaStorePalsu();

  const off = applyAdminCommand({ kind: "bot-off" }, { store });
  assert.equal(store.snapshot().globallyPaused, true);
  assert.match(off, /#bot on/);

  const on = applyAdminCommand({ kind: "bot-on" }, { store });
  assert.equal(store.snapshot().globallyPaused, false);
});

test("#status meringkas status global dan kontak dijeda beserta waktu mulai", () => {
  const store = new JedaStorePalsu({
    globallyPaused: true,
    dijeda: ["628123456789"],
    lastHandoffContact: "628123456789",
  });

  const balasan = applyAdminCommand({ kind: "status" }, { store });

  assert.match(balasan, /Nonaktif Sementara: aktif/);
  assert.match(balasan, /628123456789/);
  // Waktu mulai ditampilkan dalam WIB (UTC+7) agar mudah dibaca admin.
  assert.match(balasan, /2026-10-10 10:00:00/);
});

test("#status tanpa kontak dijeda tetap menjawab", () => {
  const store = new JedaStorePalsu();

  const balasan = applyAdminCommand({ kind: "status" }, { store });

  assert.match(balasan, /Nonaktif Sementara: tidak aktif/);
  assert.match(balasan, /Kontak dijeda: 0/);
});

test("daftar perintah admin memuat semua perintah yang didukung", () => {
  for (const perintah of ["#jeda", "#lanjut", "#bot off", "#bot on", "#status"]) {
    assert.match(DAFTAR_PERINTAH_ADMIN, new RegExp(perintah.replace("#", "\\#")));
  }
});

test("konfirmasi tidak menjanjikan waktu balasan admin", () => {
  const store = new JedaStorePalsu();
  const balasan = [
    applyAdminCommand({ kind: "jeda", nomor: "628123456789" }, { store }),
    applyAdminCommand({ kind: "bot-off" }, { store }),
    applyAdminCommand({ kind: "bot-on" }, { store }),
  ].join("\n");
  assert.doesNotMatch(balasan, /segera|secepatnya|dalam \d+ (menit|jam|hari)/i);
  assert.equal(MULAI_JEDA.getUTCFullYear(), 2026);
});
