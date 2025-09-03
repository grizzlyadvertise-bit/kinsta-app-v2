export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sheets";

export async function GET() {
  try {
    const token = await getAccessToken();
    // Basic sanity: JWTs are long; return first chars only
    return NextResponse.json({ ok: true, tokenPrefix: token.slice(0, 12) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
