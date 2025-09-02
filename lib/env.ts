// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_ALLOWED_EMAIL: z.string().optional(), // comma-separated allow list

  GOOGLE_SA_CLIENT_EMAIL: z.string(),
  GOOGLE_SA_PRIVATE_KEY: z.string(),

  SHEETS_SPREADSHEET_ID: z.string(),
  SHEETS_TAB_ORDERS: z.string(),
  SHEETS_TAB_DEPOSITS: z.string(),
  SHEETS_TAB_UNMATCHED: z.string(),
  SHEETS_TAB_LEDGER: z.string(),

  DATABASE_URL: z.string(),

  APP_CRON_SECRET: z.string(),

  GMAIL_BACKFILL_DAYS: z.string().transform(v => parseInt(v || "30", 10)).default("30"),

  E_TRANSFER_METHODS: z.string().default(""),
});

export const env = envSchema.parse(process.env);
export const allowedEmails = (env.GOOGLE_ALLOWED_EMAIL || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
