// app/api/woo/webhook/route.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { getOrderById, WooOrder } from "@/lib/woo";

function verify(signatureB64: string| null, secret: string, body: Buffer) {
  if (!signatureB64) return false;
  const h = crypto.createHmac("sha256", secret).update(body).digest("base64");
  // constant-time compare
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signatureB64));
}

function toOrderRow(o: WooOrder) {
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

export async function POST(req: Request) {
  const secret = await getSetting("WOO_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret not set", { status: 500 });

  const buf = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("x-wc-webhook-signature");

  if (!verify(sig, secret, buf)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const evt = JSON.parse(buf.toString("utf8"));
  // Events commonly include order ID in "id" or "resource_id"
  const orderId: number | undefined = evt?.id ?? evt?.resource_id;
  if (!orderId) return Response.json({ ok: true, note: "no order id" });

  const woo = await getOrderById(orderId);
  const row = toOrderRow(woo);
  await prisma.order.upsert({
    where: { id: row.id },
    update: row,
    create: row,
  });

  console.log("[webhook] order upserted", row.id, row.status, row.modifiedAt.toISOString());
  return Response.json({ ok: true });
}
