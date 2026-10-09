/**
 * Server webhook WhatsApp. Menerima pesan masuk dari provider, memprosesnya di
 * seam percakapan, lalu mengirim balasan keluar lewat port MessageSender.
 *
 * Proses ini dirancang berjalan setiap saat (long-running), sehingga
 * ketersediaan balasan otomatis tidak bergantung pada jam kerja admin.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AdminChannel } from "./adminChannel.ts";
import type { AppConfig } from "./config.ts";
import { handleInbound, turnForInbound } from "./conversation/handleInbound.ts";
import type { ConversationAction, ConversationTurn } from "./conversation/types.ts";
import type { ConversationStore } from "./conversationStore.ts";
import type { ConversationRole, ConversationTranscript } from "./conversationTranscript.ts";
import type { InboundTransport } from "./inboundTransport.ts";
import type { MessageSender } from "./messageSender.ts";
import type { Metrics } from "./metrics.ts";

export interface AppServerDeps {
  readonly config: AppConfig;
  readonly sender: MessageSender;
  /** Autentikasi dan konversi payload provider; provider-agnostic bagi server. */
  readonly inbound: InboundTransport;
  /** Penyimpanan konteks percakapan per calon jemaah (multi-giliran). */
  readonly conversations: ConversationStore;
  /** Kanal penerimaan admin untuk handoff. */
  readonly adminChannel: AdminChannel;
  /** Metrik keberhasilan; dihitung dari handoff yang berhasil diteruskan. */
  readonly metrics: Metrics;
  /** Catatan transkrip percakapan (tiket 08); efek samping best-effort. */
  readonly transcript: ConversationTranscript;
}

/**
 * Pemberitahuan saat penerusan ke kanal admin gagal — sengaja tidak mengeklaim
 * informasi telah diteruskan dan tidak menjanjikan waktu balasan.
 */
const HANDOFF_FAILURE_NOTICE =
  "Mohon maaf, terjadi gangguan teknis. Silakan kirim ulang pesan Anda beberapa saat lagi. " +
  "/ Sorry, a technical issue occurred. Please send your message again shortly.";

export function createAppServer(deps: AppServerDeps): Server {
  return createServer((req, res) => {
    void handleRequest(req, res, deps).catch((error: unknown) => {
      // Kegagalan di sini (mis. provider menolak pengiriman) tidak boleh senyap:
      // tanpa log, timeout Fonnte atau token kedaluwarsa sulit ditelusuri.
      console.error("Permintaan webhook gagal:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "internal" }));
      }
    });
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, deps: AppServerDeps): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/webhook" && req.method === "GET") {
    const handshake = deps.inbound.handleSubscription(url);
    if (handshake === null) {
      sendJson(res, 404, { error: "tidak ditemukan" });
      return;
    }
    res.writeHead(handshake.status, { "content-type": "text/plain" });
    res.end(handshake.body);
    return;
  }

  if (url.pathname === "/metrics" && req.method === "GET") {
    sendJson(res, 200, deps.metrics.snapshot());
    return;
  }

  if (url.pathname === "/webhook" && req.method === "POST") {
    const rawBody = await readBody(req);
    const result = await deps.inbound.readInbound({ method: req.method, url, headers: req.headers, rawBody });
    if (!result.ok) {
      sendJson(res, result.status, { error: result.reason });
      return;
    }

    let replyCount = 0;
    for (const pesan of result.messages) {
      if (pesan.from === deps.config.whatsapp.senderNumber) {
        continue;
      }
      const konteks = deps.conversations.load(pesan.from);
      const turn = handleInbound(pesan, konteks);
      const deliveryFailed = await runActions(deps, pesan.from, turn.actions);

      let sentText: string | null = null;
      if (turn.reply) {
        sentText = deliveryFailed ? HANDOFF_FAILURE_NOTICE : turn.reply.text;
        await deps.sender.sendText(pesan.from, sentText);
        replyCount += 1;
      }
      // Giliran lampiran (pesan non-teks) ikut direkam apa adanya dengan
      // sebutannya, agar Ringkasan Kebutuhan dan transkrip dapat menyebutnya.
      const giliranMasuk = turnForInbound(pesan);
      recordTranscript(deps, pesan.from, "calon-jemaah", giliranMasuk.text);
      const nextHistory: ConversationTurn[] = [...konteks.history, giliranMasuk];
      if (sentText !== null) {
        nextHistory.push({ role: "asisten", text: sentText });
        recordTranscript(deps, pesan.from, "asisten", sentText);
      }
      deps.conversations.save(pesan.from, { history: nextHistory });
    }
    sendJson(res, 200, { status: "ok", replied: replyCount });
    return;
  }

  sendJson(res, 404, { error: "tidak ditemukan" });
}

/**
 * Catat pesan ke transkrip sebagai efek samping best-effort: kegagalan menulis
 * tidak boleh menggagalkan balasan bot, tetapi tetap terlihat di log proses.
 */
function recordTranscript(
  deps: AppServerDeps,
  number: string,
  role: ConversationRole,
  text: string,
): void {
  try {
    deps.transcript.record({ at: new Date(), number, role, text });
  } catch (error) {
    console.error("Penulisan transkrip percakapan gagal:", error);
  }
}

/**
 * Eksekusi tindakan terlihat dari seam: catat Permintaan Tindak Lanjut dan
 * jawaban FAQ, lalu teruskan handoff ke kanal admin. Penerusan ditunggu hasilnya
 * (boleh asinkron) dan mengembalikan true bila gagal, sehingga balasan tidak
 * mengeklaim informasi telah diteruskan.
 */
async function runActions(
  deps: AppServerDeps,
  from: string,
  actions: readonly ConversationAction[],
): Promise<boolean> {
  let gagal = false;
  for (const aksi of actions) {
    if (aksi.kind === "record-follow-up-request") {
      deps.metrics.recordFollowUpRequest();
      console.log("Permintaan Tindak Lanjut tercatat dari", from);
      continue;
    }
    if (aksi.kind === "record-faq-answer") {
      deps.metrics.recordFaqAnswer();
      continue;
    }
    try {
      await deps.adminChannel.deliver({
        from,
        reason: aksi.reason,
        request: aksi.request,
        revision: aksi.revision,
      });
      deps.metrics.recordHandOffDelivered(aksi.request !== null);
    } catch (error) {
      // Kegagalan penerusan jangan senyap: admin tidak menerima handoff dan
      // calon jemaah tidak boleh diberi klaim palsu.
      console.error("Penerusan ke kanal admin gagal:", error);
      gagal = true;
    }
  }
  return gagal;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
