/**
 * Server webhook WhatsApp. Menerima pesan masuk dari provider, memprosesnya di
 * seam percakapan, lalu mengirim balasan keluar lewat port MessageSender.
 *
 * Proses ini dirancang berjalan setiap saat (long-running), sehingga
 * ketersediaan balasan otomatis tidak bergantung pada jam kerja admin.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isSignatureValid, parseInboundMessages, verifySubscriptionQuery } from "./adapters/whatsapp-cloud/webhook.ts";
import type { AppConfig } from "./config.ts";
import { handleInbound } from "./conversation/handleInbound.ts";
import type { ConversationContext } from "./conversation/types.ts";
import type { MessageSender } from "./messageSender.ts";

export interface AppServerDeps {
  readonly config: AppConfig;
  readonly sender: MessageSender;
}

const percakapanBaru: ConversationContext = { history: [] };

export function createAppServer(deps: AppServerDeps): Server {
  return createServer((req, res) => {
    void tanganiPermintaan(req, res, deps).catch(() => {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "internal" }));
      }
    });
  });
}

async function tanganiPermintaan(req: IncomingMessage, res: ServerResponse, deps: AppServerDeps): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/webhook") {
    const challenge = verifySubscriptionQuery(url.searchParams, deps.config.whatsapp.webhookVerifyToken);
    if (challenge === null) {
      kirim(res, 403, { error: "verify-token tidak cocok" });
      return;
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(challenge);
    return;
  }

  if (req.method === "POST" && url.pathname === "/webhook") {
    const rawBody = await bacaBadan(req);
    const tandaTangan = req.headers["x-hub-signature-256"];
    if (!isSignatureValid(rawBody, Array.isArray(tandaTangan) ? tandaTangan[0] : tandaTangan, deps.config.whatsapp.appSecret)) {
      kirim(res, 401, { error: "tanda tangan tidak sah" });
      return;
    }

    const payload: unknown = JSON.parse(rawBody.toString("utf8"));
    const pesanMasuk = parseInboundMessages(payload);
    let jumlahBalasan = 0;
    for (const pesan of pesanMasuk) {
      if (pesan.from === deps.config.whatsapp.senderNumber) {
        continue;
      }
      const turn = handleInbound(pesan, percakapanBaru);
      if (turn.reply) {
        await deps.sender.sendText(pesan.from, turn.reply.text);
        jumlahBalasan += 1;
      }
    }
    kirim(res, 200, { status: "ok", replied: jumlahBalasan });
    return;
  }

  kirim(res, 404, { error: "tidak ditemukan" });
}

function bacaBadan(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const potongan: Buffer[] = [];
    req.on("data", (c: Buffer) => potongan.push(c));
    req.on("end", () => resolve(Buffer.concat(potongan)));
    req.on("error", reject);
  });
}

function kirim(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
