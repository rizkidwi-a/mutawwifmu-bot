/**
 * Konfigurasi aplikasi. Nomor pengirim dan identitas provider WhatsApp dibaca
 * dari environment — tidak ada yang tertanam dalam perilaku percakapan —
 * sehingga pergantian nomor ke nomor produksi cukup lewat konfigurasi.
 *
 * Bentuk konfigurasi mengikuti provider yang dipilih: setiap provider hanya
 * diwajibkan mengisi kredensialnya sendiri (lihat .env.example). Perilaku
 * percakapan tidak bergantung pada pilihan ini.
 *
 * Lihat docs/whatsapp-number-cutover.md untuk jalur pergantian nomor dan
 * docs/adr/0003-provider-bsp-fonnte.md untuk keputusan provider.
 */

export const CLOUD_API_PROVIDER = "whatsapp-cloud-api";
export const FONNTE_PROVIDER = "fonnte";
export const SUPPORTED_PROVIDERS: readonly string[] = [CLOUD_API_PROVIDER, FONNTE_PROVIDER];

/** Bagian yang dipakai server dan seam percakapan, apa pun providernya. */
interface ProviderConfigBase {
  /** Nomor pengirim dalam format E.164 tanpa tanda '+', mis. "6289507003830". */
  readonly senderNumber: string;
  /**
   * Rahasia endpoint webhook. Maknanya mengikuti provider: pada Cloud API ini
   * token handshake, pada BSP token yang disisipkan pada URL webhook.
   */
  readonly webhookVerifyToken: string;
}

export interface WhatsAppCloudConfig extends ProviderConfigBase {
  readonly provider: typeof CLOUD_API_PROVIDER;
  /** Phone Number Id WhatsApp Cloud API untuk nomor pengirim. */
  readonly phoneNumberId: string;
  readonly apiBaseUrl: string;
  readonly apiToken: string;
  readonly appSecret: string;
}

export interface FonnteConfig extends ProviderConfigBase {
  readonly provider: typeof FONNTE_PROVIDER;
  readonly apiBaseUrl: string;
  readonly apiToken: string;
  /** Kode negara tujuan; Fonnte menambahkannya pada nomor tanpa awalan 0. */
  readonly countryCode: string;
}

export type WhatsAppConfig = WhatsAppCloudConfig | FonnteConfig;

export interface AppConfig {
  readonly whatsapp: WhatsAppConfig;
  /** Nomor WhatsApp admin penerima handoff (E.164 tanpa tanda '+'), lihat ADR-0006. */
  readonly adminNumber: string;
  readonly port: number;
}

const DEFAULT_CLOUD_API_BASE_URL = "https://graph.facebook.com/v21.0";
const DEFAULT_FONNTE_BASE_URL = "https://api.fonnte.com";
const DEFAULT_COUNTRY_CODE = "62";
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
  const senderNumber = normalizePhoneNumber(requiredString(env, "WHATSAPP_SENDER_NUMBER"));
  const adminNumber = normalizePhoneNumber(requiredString(env, "WHATSAPP_ADMIN_NUMBER"));
  const webhookVerifyToken = requiredString(env, "WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  const provider = env.WHATSAPP_PROVIDER ?? CLOUD_API_PROVIDER;
  const port = Number(env.PORT ?? DEFAULT_PORT);

  switch (provider) {
    case CLOUD_API_PROVIDER:
      return {
        whatsapp: {
          provider: CLOUD_API_PROVIDER,
          senderNumber,
          webhookVerifyToken,
          phoneNumberId: requiredString(env, "WHATSAPP_PHONE_NUMBER_ID"),
          apiBaseUrl: env.WHATSAPP_API_BASE_URL ?? DEFAULT_CLOUD_API_BASE_URL,
          apiToken: requiredString(env, "WHATSAPP_API_TOKEN"),
          appSecret: requiredString(env, "WHATSAPP_APP_SECRET"),
        },
        adminNumber,
        port,
      };
    case FONNTE_PROVIDER:
      return {
        whatsapp: {
          provider: FONNTE_PROVIDER,
          senderNumber,
          webhookVerifyToken,
          apiBaseUrl: env.WHATSAPP_API_BASE_URL ?? DEFAULT_FONNTE_BASE_URL,
          apiToken: requiredString(env, "WHATSAPP_API_TOKEN"),
          countryCode: env.WHATSAPP_COUNTRY_CODE ?? DEFAULT_COUNTRY_CODE,
        },
        adminNumber,
        port,
      };
    default:
      throw new Error(
        `Provider WhatsApp tidak dikenal: "${provider}". Pilihan yang didukung: ${SUPPORTED_PROVIDERS.join(", ")}`,
      );
  }
}

function requiredString(env: Record<string, string | undefined>, nama: string): string {
  const nilai = env[nama];
  if (!nilai) {
    throw new Error(`Konfigurasi tidak lengkap: variabel ${nama} wajib diisi`);
  }
  return nilai;
}
