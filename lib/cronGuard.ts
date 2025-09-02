// lib/cronGuard.ts
export function assertCronAuth(req: Request) {
  const secret = process.env.APP_CRON_SECRET || "";
  const url = new URL(req.url);
  const got = req.headers.get("x-app-cron-secret") || url.searchParams.get("key");
  if (!secret || got !== secret) {
    return new Response("Forbidden", { status: 403 });
  }
  return null;
}
