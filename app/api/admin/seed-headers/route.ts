// app/api/admin/seed-headers/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { appendRows, getAccessToken } from "@/lib/sheets";
import { getSetting } from "@/lib/settings";

// Minimal typed helpers
type SeedResult = { tab: string; created: boolean };

async function readAll(tab: string): Promise<string[][]> {
  const spreadsheetId = await getSetting("SHEETS_SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("SHEETS_SPREADSHEET_ID not set");
  const token = await getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab)}!A1:ZZ`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    // If the tab is missing, treat as empty for the purposes of seeding headers
    return [];
  }
  const json = (await r.json()) as { values?: string[][] };
  return json.values ?? [];
}

async function ensureHeader(tab: string, header: string[]): Promise<SeedResult> {
  const cur = await readAll(tab);
  if (cur.length === 0) {
    await appendRows(tab, [header]);
    return { tab, created: true };
  }
  return { tab, created: false };
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.APP_CRON_SECRET || key !== process.env.APP_CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ORDERS = process.env.SHEETS_TAB_ORDERS || "Orders";
  const DEPOSITS = process.env.SHEETS_TAB_DEPOSITS || "Deposits";
  const UNMATCHED = process.env.SHEETS_TAB_UNMATCHED || "Unmatched";
  const LEDGER = process.env.SHEETS_TAB_LEDGER || "Ledger";

  const results: SeedResult[] = [];
  results.push(await ensureHeader(ORDERS,   ["id","number","status","totalCents","createdAt","modifiedAt","billingName","billingEmail","paymentMethod"]));
  results.push(await ensureHeader(DEPOSITS, ["id","ts","sender_name","amount","snippet"]));
  results.push(await ensureHeader(UNMATCHED,["deposit_id","reason","notes","created_at"]));
  results.push(await ensureHeader(LEDGER,   ["deposit_id","applied_amount","applied_ts","order_id"]));

  return NextResponse.json({ ok: true, results });
}
