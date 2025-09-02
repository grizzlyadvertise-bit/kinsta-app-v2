import { assertCronAuth } from "@/lib/cronGuard";

export async function GET(req: Request) {
  const bad = assertCronAuth(req);
  if (bad) return bad;
  console.log("[cron] parse-gmail tick", new Date().toISOString());
  // TODO: call gmail sync worker here
  return Response.json({ ok: true, job: "parse-gmail", ts: Date.now() });
}
