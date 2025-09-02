// app/api/cron/pull-woo/route.ts
import { assertCronAuth } from "@/lib/cronGuard";
import { listOrdersModifiedSince } from "@/lib/woo";
import { prisma } from "@/lib/prisma";
import { getCursor, setCursor } from "@/lib/cursor";

// Minimal Woo order shape we actually use
type WooOrder = {
  id: number;
  number?: string;
  status?: string;
  total?: string;
  date_created_gmt: string;
  date_modified_gmt: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  payment_method?: string;
  [k: string]: unknown;
};

function toRow(o: WooOrder) {
  const totalCents = Math.round(parseFloat(o.total ?? "0") * 100);
  const name = [o.billing?.first_name, o.billing?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: o.id,
    number: o.number ?? String(o.id),           // <- ensure string
    status: o.status ?? "",                     // <- ensure string
    totalCents,
    createdAt: new Date(o.date_created_gmt + "Z"),
    modifiedAt: new Date(o.date_modified_gmt + "Z"),
    billingName: name || "",                    // <- ensure string
    billingEmail: o.billing?.email ?? "",       // <- ensure string
    paymentMethod: o.payment_method ?? "",      // <- ensure string
  };
}

export async function GET(req: Request) {
  const bad = assertCronAuth(req);
  if (bad) return bad;

  const CURSOR_ID = "woo_last_synced_at";
  const since = await getCursor(CURSOR_ID);
  const startedIso = new Date().toISOString();

  const orders = (await listOrdersModifiedSince(since ?? undefined, 50)) as WooOrder[];

  for (const o of orders) {
    const row = toRow(o);

    const createData = {
      id: row.id,
      number: row.number,
      status: row.status,
      totalCents: row.totalCents,
      createdAt: row.createdAt,
      modifiedAt: row.modifiedAt,
      billingName: row.billingName,
      billingEmail: row.billingEmail,
      paymentMethod: row.paymentMethod,
    };

    const updateData = {
      number: row.number,
      status: row.status,
      totalCents: row.totalCents,
      createdAt: row.createdAt,
      modifiedAt: row.modifiedAt,
      billingName: row.billingName,
      billingEmail: row.billingEmail,
      paymentMethod: row.paymentMethod,
    };

    await prisma.order.upsert({
      where: { id: row.id },
      update: updateData,
      create: createData,
    });
  }

  await setCursor(CURSOR_ID, startedIso);

  console.log(
    `[cron] pull-woo upserted=${orders.length} since=${since ?? "∅"} next=${startedIso}`
  );
  return Response.json({ ok: true, upserted: orders.length, nextCursor: startedIso });
}
