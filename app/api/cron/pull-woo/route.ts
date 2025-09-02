// app/api/cron/pull-woo/route.ts
import { assertCronAuth } from "@/lib/cronGuard";
import { listOrdersModifiedSince } from "@/lib/woo";
import { prisma } from "@/lib/prisma";
import { getCursor, setCursor } from "@/lib/cursor";

function toRow(o: any) {
  const totalCents = Math.round(parseFloat(o.total || "0") * 100);
  const name = [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(" ").trim() || undefined;
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    totalCents,
    createdAt: new Date(o.date_created_gmt + "Z"),
    modifiedAt: new Date(o.date_modified_gmt + "Z"),
    billingName: name,
    billingEmail: o.billing?.email || undefined,
    paymentMethod: o.payment_method || undefined,
  };
}

export async function GET(req: Request) {
  const bad = assertCronAuth(req);
  if (bad) return bad;

  const CURSOR_ID = "woo_last_synced_at";
  const since = await getCursor(CURSOR_ID);
  const startedIso = new Date().toISOString();

  const orders = await listOrdersModifiedSince(since ?? undefined, 50);
  for (const o of orders) {
    const row = toRow(o);
    await prisma.order.upsert({
      where: { id: row.id },
      update: row,
      create: row,
    });
  }

  // advance cursor to "now" (safe even if zero results)
  await setCursor(CURSOR_ID, startedIso);

  console.log(`[cron] pull-woo upserted=${orders.length} since=${since ?? "∅"} next=${startedIso}`);
  return Response.json({ ok: true, upserted: orders.length, nextCursor: startedIso });
}
