import { assertCronAuth } from "@/lib/cronGuard";

export async function GET(req: Request) {
  const bad = assertCronAuth(req);
  if (bad) return bad;
  console.log("[cron] retry-unmatched tick", new Date().toISOString());
  // TODO: call matcher retry worker here
  return Response.json({ ok: true, job: "retry-unmatched", ts: Date.now() });
}
