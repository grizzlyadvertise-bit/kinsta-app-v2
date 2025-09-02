import { assertCronAuth } from "@/lib/cronGuard";

export async function GET(req: Request) {
  const bad = assertCronAuth(req);
  if (bad) return bad;
  console.log("[cron] pull-woo tick", new Date().toISOString());
  // TODO: call woo sync worker here
  return Response.json({ ok: true, job: "pull-woo", ts: Date.now() });
}
