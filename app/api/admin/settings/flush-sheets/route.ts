import { prisma } from "@/lib/prisma";
import { appendRows } from "@/lib/sheets";
import { getSetting } from "@/lib/settings";

export async function POST() {
  const safe = (await getSetting("SAFE_MODE"))?.toString().toLowerCase() === "true";
  if (safe) return new Response("SAFE_MODE is true; not writing", { status: 400 });

  const tabOrders = (await getSetting("SHEETS_TAB_ORDERS")) || "Orders";
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "asc" } });

  // header (only if your sheet is empty; safe to append again)
  const rows: (string|number|null)[][] = [
    ["order_id","order_number","created_at","customer","email","total","status","last_synced"],
  ];

  for (const o of orders) {
    rows.push([
      o.id,
      o.number,
      o.createdAt.toISOString(),
      o.billingName ?? "",
      o.billingEmail ?? "",
      (o.totalCents / 100).toFixed(2),
      o.status,
      new Date().toISOString(),
    ]);
  }

  const res = await appendRows(tabOrders, rows);
  return Response.json({ ok: true, appended: rows.length, res });
}
