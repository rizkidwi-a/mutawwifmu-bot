/**
 * Konfigurasi aplikasi. Nomor pengirim dan identitas provider WhatsApp dibaca
 * dari environment — tidak ada yang tertanam dalam perilaku percakapan —
 * sehingga pergantian nomor ke nomor produksi cukup lewat konfigurasi.
 *
 * Lihat docs/whatsapp-number-cutover.md untuk jalur pergantian nomor.
 */

export interface WhatsAppConfig {
  /** Identitas provider; saat ini "whatsapp-cloud-api" (lihat ADR-0001). */
  readonly provider: string;
  /** Nomor pengirim dalam format E.164 tanpa tanda '+', mis. "6289507003830". */
  readonly senderNumber: string;
  /** Phone Number Id WhatsApp Cloud API untuk nomor pengirim. */
  readonly phoneNumberId: string;
  readonly apiBaseUrl: string;
  readonly apiToken: string;
  readonly appSecret: string;
  readonly webhookVerifyToken: string;
}

export interface AppConfig {
  readonly whatsapp: WhatsAppConfig;
  readonly port: number;
}

const DEFAULT_API_BASE_URL = "https://graph.facebook.com/v21.0";
const DEFAULT_PORT = 3000;

/** Normalisasi nomor telepon ke digit E.164 tanpa tanda '+'. */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`Nomor telepon tidak valid: "${raw}"`);
  }
  return digits;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const whatsapp: WhatsAppConfig = {
    provider: env.WHATSAPP_PROVIDER ?? "whatsapp-cloud-api",
    senderNumber: normalizePhoneNumber(requiredString(env, "WHATSAPP_SENDER_NUMBER")),
    phoneNumberId: requiredString(env, "WHATSAPP_PHONE_NUMBER_ID"),
    apiBaseUrl: env.WHATSAPP_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    apiToken: requiredString(env, "WHATSAPP_API_TOKEN"),
    appSecret: requiredString(env, "WHATSAPP_APP_SECRET"),
    webhookVerifyToken: requiredString(env, "WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
  };
  return { whatsapp, port: Number(env.PORT ?? DEFAULT_PORT) };
}

function requiredString(env: Record<string, string | undefined>, nama: string): string {
  const nilai = env[nama];
  if (!nilai) {
    throw new Error(`Konfigurasi tidak lengkap: variabel ${nama} wajib diisi`);
  }
  return nilai;
}
