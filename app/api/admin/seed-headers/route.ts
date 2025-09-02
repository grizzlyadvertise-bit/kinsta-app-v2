export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { appendRows } from "@/lib/sheets";

// Minimal readAll using your existing SA token flow.
// Add this small helper so we can check if a tab is empty.
async function readAll(tab: string): Promise<string[][]> {
  // Reuse your lib/sheets token exchange path:
  // We'll import getSetting and do a raw fetch like your appendRows
  const { getSetting } = await import("@/lib/settings");
  const spreadsheetId = await getSetting("SHEETS_SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("SHEETS_SPREADSHEET_ID not set");

  // Borrow your getAccessToken from lib/sheets.ts (we import it dynamically)
  const sheetsLib: any = await import("@/lib/sheets");
  const token = await sheetsLib.getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab)}!A1:ZZ`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return [];
  const json = await r.json();
  return (json.values ?? []) as string[][];
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

  const ensure = async (tab: string, header: string[]) => {
    const cur = await readAll(tab);
    if (cur.length === 0) {
      await appendRows(tab, [header]);
      return { tab, created: true };
    }
    return { tab, created: false };
  };

  const results = [];
  results.push(await ensure(ORDERS, ["id","number","status","totalCents","createdAt","modifiedAt","billingName","billingEmail","paymentMethod"]));
  results.push(await ensure(DEPOSITS, ["id","ts","sender_name","amount","snippet"]));
  results.push(await ensure(UNMATCHED, ["deposit_id","reason","notes","created_at"]));
  results.push(await ensure(LEDGER, ["deposit_id","applied_amount","applied_ts","order_id"]));

  return NextResponse.json({ ok: true, results });
}
