// app/api/admin/settings/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { DEFINITIONS, getSetting, setSetting, listSettings } from "@/lib/settings";

function isAuthed(req: NextRequest): boolean {
  const key = req.nextUrl.searchParams.get("key") || "";
  return Boolean(process.env.APP_CRON_SECRET && key === process.env.APP_CRON_SECRET);
}

// GET /api/admin/settings?key=APP_CRON_SECRET
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const items = await listSettings();
  return NextResponse.json({ ok: true, items });
}

// POST /api/admin/settings?key=APP_CRON_SECRET
// body: { key: string; value: string; isSecret?: boolean }
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { key?: string; value?: string; isSecret?: boolean }
    | null;

  if (!body?.key) {
    return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
  }
  const def = DEFINITIONS.find(d => d.key === body.key);
  if (!def) {
    return NextResponse.json({ ok: false, error: `unknown key: ${body.key}` }, { status: 400 });
  }
  await setSetting(body.key, String(body.value ?? ""), body.isSecret ?? !!def.secret);
  const saved = await getSetting(body.key);
  return NextResponse.json({
    ok: true,
    key: body.key,
    saved: def?.secret ? "(hidden)" : saved ?? "",
  });
}

// PUT /api/admin/settings?key=APP_CRON_SECRET
// body: [{ key: string; value: string }]
export async function PUT(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const items = (await req.json().catch(() => null)) as { key?: string; value?: string }[] | null;
  if (!Array.isArray(items)) {
    return NextResponse.json({ ok: false, error: "array body required" }, { status: 400 });
  }

  const results: Array<{ key: string; saved: string }> = [];
  for (const it of items) {
    if (!it?.key) continue;
    const def = DEFINITIONS.find(d => d.key === it.key);
    if (!def) continue;
    await setSetting(it.key, String(it.value ?? ""), !!def.secret);
    results.push({ key: it.key, saved: def.secret ? "(hidden)" : String(it.value ?? "") });
  }
  return NextResponse.json({ ok: true, results });
}
