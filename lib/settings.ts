// lib/settings.ts
import { prisma } from "./prisma";
import { encrypt, decrypt } from "./vault";

type KeyDef = { key: string; secret?: boolean; required?: boolean };

export const DEFINITIONS: KeyDef[] = [
  { key: "GOOGLE_CLIENT_ID", secret: true },
  { key: "GOOGLE_CLIENT_SECRET", secret: true },
  { key: "WOO_BASE_URL" },
  { key: "WOO_CONSUMER_KEY", secret: true },
  { key: "WOO_CONSUMER_SECRET", secret: true },
  { key: "WOO_WEBHOOK_SECRET", secret: true },
  { key: "SHEETS_SPREADSHEET_ID" },
  { key: "SHEETS_TAB_ORDERS" },
  { key: "SHEETS_TAB_DEPOSITS" },
  { key: "SHEETS_TAB_UNMATCHED" },
  { key: "MATCH_MIN_CONFIDENCE" },
  { key: "BACKFILL_DAYS" },
  { key: "PARSE_MAX_BODY_CHARS" },
  { key: "ETR_RECIPIENT_EMAILS" },
  { key: "SAFE_MODE" },
  { key: "APP_CRON_SECRET", secret: true },
];

export async function getSetting(key: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return process.env[key];
  return row.isSecret ? decrypt(row.value) : row.value;
}

export async function setSetting(key: string, value: string, isSecret = false) {
  const v = isSecret ? encrypt(value) : value;
  await prisma.setting.upsert({
    where: { key },
    update: { value: v, isSecret },
    create: { key, value: v, isSecret },
  });
}

export async function listSettings() {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r]));
  return DEFINITIONS.map((d) => ({
    key: d.key,
    isSecret: !!d.secret,
    hasValue: !!map.get(d.key) || !!process.env[d.key],
    value: d.secret ? undefined : map.get(d.key)?.value ?? process.env[d.key] ?? "",
  }));
}
