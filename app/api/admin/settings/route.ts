// app/api/admin/settings/route.ts
import { listSettings, setSetting, DEFINITIONS } from "@/lib/settings";
import { NextResponse } from "next/server";

function assertAllowed(req: Request) {
  // First-run: allow access if no GOOGLE_CLIENT_ID is set anywhere.
  const allowed = process.env.GOOGLE_ALLOWED_EMAIL;
  if (!allowed) throw new Error("GOOGLE_ALLOWED_EMAIL not set");
  // (Later, we’ll add NextAuth here. For now, we trust possession of app URL.)
}

export async function GET(_req: Request) {
  assertAllowed(new Request("http://local"));
  const entries = await listSettings();
  return NextResponse.json(entries);
}

export async function PUT(req: Request) {
  assertAllowed(req);
  const items: { key: string; value: string }[] = await req.json();
  for (const it of items) {
    const def = DEFINITIONS.find((d) => d.key === it.key);
    if (!def) continue;
    await setSetting(it.key, String(it.value ?? ""), !!def.secret);
  }
  return NextResponse.json({ ok: true });
}
