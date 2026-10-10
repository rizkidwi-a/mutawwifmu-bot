import { test } from "node:test";
import assert from "node:assert/strict";
import { handleInbound } from "../../src/conversation/handleInbound.ts";
import type { ConversationContext, InboundMessage } from "../../src/conversation/types.ts";

const konteksBaru: ConversationContext = { history: [] };

function pesan(text: string): InboundMessage {
  return { id: "wamid.tujuan-chat", from: "628123456789", timestamp: "1727000000", text };
}

test("percakapan baru menampilkan pembuka yang disetujui dan fallback menu bernomor", () => {
  const turn = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(turn.reply);
  assert.match(
    turn.reply.text,
    /Terima kasih telah menghubungi Mutawwifmu, Travel Partner Top #1 Personalized Land Arrangement dan Premium Umrah Experience terpercaya untuk perjalanan ibadah dan wisata muslim di seluruh dunia 😇/,
  );
  assert.match(turn.reply.text, /Halo!/);
  assert.match(turn.reply.text, /1\. Calon jemaah \/ informasi paket/);
  assert.match(turn.reply.text, /2\. Vendor \/ mitra bisnis/);
  assert.match(turn.reply.text, /3\. Tim internal Mutawwifmu/);
  assert.match(turn.reply.text, /4\. Keperluan lain \/ ingin menghubungi admin/);
  assert.deepEqual(turn.actions, []);
});

test("salam pembuka dibalas Waalaikumsalam Wr. Wb", () => {
  const turn = handleInbound(pesan("Assalamu'alaikum"), konteksBaru);
  assert.ok(turn.reply);
  assert.match(turn.reply.text, /^Waalaikumsalam Wr\. Wb/);
  assert.match(turn.reply.text, /1\. Calon jemaah/);
  assert.deepEqual(turn.actions, []);
});

test("pilihan calon jemaah membuka intake yang sudah ada tanpa mengisi bidang", () => {
  const pembuka = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(pembuka.reply);
  const konteksMenu: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: pembuka.reply.text },
    ],
  };

  const pilihan = handleInbound(pesan("1"), konteksMenu);
  assert.ok(pilihan.reply);
  assert.match(pilihan.reply.text, /Layanan apa saja yang Anda minati/);
  assert.doesNotMatch(pilihan.reply.text, /Vendor \/ mitra bisnis/);
  assert.deepEqual(pilihan.actions, []);

  const lanjutan = handleInbound(pesan("Mutawwif"), {
    history: [
      ...konteksMenu.history,
      { role: "calon-jemaah", text: "1" },
      { role: "asisten", text: pilihan.reply.text },
    ],
  });
  assert.ok(lanjutan.reply);
  assert.match(lanjutan.reply.text, /Kapan rencana tanggal atau periode perjalanan/);
  assert.doesNotMatch(lanjutan.reply.text, /1\. Calon jemaah/);
});

test("pembuka konsultasi setelah memilih calon jemaah tidak mengisi bidang layanan", () => {
  const menu = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(menu.reply);
  const konteksMenu: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: menu.reply.text },
      { role: "calon-jemaah", text: "1" },
      { role: "asisten", text: "Layanan apa saja yang Anda minati?" },
    ],
  };

  const turn = handleInbound(pesan("Halo, saya ingin konsultasi untuk merencanakan umrah"), konteksMenu);
  assert.ok(turn.reply);
  assert.match(turn.reply.text, /Layanan apa saja yang Anda minati/);
  assert.deepEqual(turn.actions, []);
});

test("pilihan lain langsung handoff berkategori tanpa meminta intake", () => {
  const menu = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(menu.reply);
  const konteksMenu: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: menu.reply.text },
    ],
  };

  for (const [pilihan, reason] of [
    ["2", "vendor_mitra"],
    ["3", "internal"],
    ["4", "other"],
    ["4. Keperluan lain / ingin menghubungi admin", "other"],
    ["Other / contact an admin", "other"],
    ["Saya ingin menghubungi admin", "other"],
    ["Kami dari PT Maju Jaya, agen travel, ingin bekerja sama", "vendor_mitra"],
  ] as const) {
    const turn = handleInbound(pesan(pilihan), konteksMenu);
    assert.ok(turn.reply);
    assert.match(turn.reply.text, /diteruskan/);
    assert.doesNotMatch(turn.reply.text, /Layanan apa saja yang Anda minati/);
    assert.deepEqual(turn.actions, [{ kind: "hand-off-to-admin", reason, request: null }]);
  }
});

test("balasan setelah kegagalan handoff tidak mengklaim sudah diteruskan", () => {
  const menu = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(menu.reply);
  const konteksSetelahGagal: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: menu.reply.text },
      { role: "calon-jemaah", text: "2" },
      {
        role: "asisten",
        text: "Mohon maaf, terjadi gangguan teknis. Silakan kirim ulang pesan Anda beberapa saat lagi.",
      },
    ],
  };

  const turn = handleInbound(pesan("Ada informasi tambahan"), konteksSetelahGagal);
  assert.ok(turn.reply);
  assert.doesNotMatch(turn.reply.text, /diteruskan|forwarded/i);
  assert.doesNotMatch(turn.reply.text, /Layanan apa saja yang Anda minati/);
  assert.deepEqual(turn.actions, []);
});

test("pemicu langsung dari menu tetap diteruskan setelah persetujuan", () => {
  const menu = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(menu.reply);
  const konteksMenu: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: menu.reply.text },
    ],
  };

  for (const [text, reason] of [
    ["Saya mau bicara dengan manusia saja", "human-request"],
    ["Tolong, ini keadaan darurat", "emergency"],
    ["Saya sedang berada di Mekkah sekarang", "active-trip"],
  ] as const) {
    const prompt = handleInbound(pesan(text), konteksMenu);
    assert.ok(prompt.reply);
    const consent = handleInbound(pesan("Ya, setuju"), {
      history: [
        ...konteksMenu.history,
        { role: "calon-jemaah", text },
        { role: "asisten", text: prompt.reply.text },
      ],
    });
    assert.deepEqual(
      consent.actions,
      [{ kind: "hand-off-to-admin", reason, request: null }],
      text,
    );
  }
});

test("pilihan menu tak dikenal diminta ulang tanpa masuk intake", () => {
  const menu = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(menu.reply);
  const konteksMenu: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: menu.reply.text },
    ],
  };

  const turn = handleInbound(pesan("saya mau tanya sesuatu"), konteksMenu);
  assert.ok(turn.reply);
  assert.match(turn.reply.text, /pilihan belum dikenali/i);
  assert.match(turn.reply.text, /1\. Calon jemaah/);
  assert.doesNotMatch(turn.reply.text, /Layanan apa saja yang Anda minati/);
  assert.deepEqual(turn.actions, []);
});

test("permintaan manusia dan kondisi darurat tetap menyela pilihan menu", () => {
  const menu = handleInbound(pesan("Halo"), konteksBaru);
  assert.ok(menu.reply);
  const konteksMenu: ConversationContext = {
    history: [
      { role: "calon-jemaah", text: "Halo" },
      { role: "asisten", text: menu.reply.text },
    ],
  };

  for (const text of [
    "Saya mau bicara dengan manusia saja",
    "Tolong, ini keadaan darurat",
    "Saya sedang berada di Mekkah sekarang",
  ]) {
    const pembukaLangsung = handleInbound(pesan(text), konteksBaru);
    assert.ok(pembukaLangsung.reply);
    assert.match(pembukaLangsung.reply.text, /setuju/i, text);
    assert.doesNotMatch(pembukaLangsung.reply.text, /Calon jemaah \/ informasi paket/);
    assert.deepEqual(pembukaLangsung.actions, [], text);

    const turn = handleInbound(pesan(text), konteksMenu);
    assert.ok(turn.reply);
    assert.match(turn.reply.text, /setuju/i, text);
    assert.doesNotMatch(turn.reply.text, /Calon jemaah \/ informasi paket/);
    assert.deepEqual(turn.actions, [], text);
  }
});
