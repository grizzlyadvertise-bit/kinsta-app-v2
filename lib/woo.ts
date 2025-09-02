// lib/woo.ts
import { getSetting } from "./settings";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function wooFetch<T>(pathAndQuery: string) {
  const base = await getSetting("WOO_BASE_URL");
  const ck = await getSetting("WOO_CONSUMER_KEY");
  const cs = await getSetting("WOO_CONSUMER_SECRET");
  if (!base || !ck || !cs) throw new Error("Woo creds not configured");

  // Auth via query params (Woo standard)
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  const url = joinUrl(base, pathAndQuery) + `${sep}consumer_key=${encodeURIComponent(ck)}&consumer_secret=${encodeURIComponent(cs)}`;

  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Woo fetch ${pathAndQuery} failed ${r.status}: ${txt}`);
  }
  return (await r.json()) as T;
}

// Types we actually use
export type WooOrder = {
  id: number;
  number: string;
  status: string;
  date_created_gmt: string;
  date_modified_gmt: string;
  total: string;
  billing?: { first_name?: string; last_name?: string; email?: string };
  payment_method?: string;
};

// Pull orders modified since an ISO timestamp
export async function listOrdersModifiedSince(iso?: string, perPage = 50) {
  const query = new URLSearchParams({
    per_page: String(perPage),
    orderby: "date",
    order: "asc",
    status: "any",
    ...(iso ? { modified_after: iso } : {}),
  }).toString();

  // Iterate pages
  const results: WooOrder[] = [];
  let page = 1;
  while (true) {
    const list = await wooFetch<WooOrder[]>(`/wp-json/wc/v3/orders?${query}&page=${page}`);
    results.push(...list);
    if (list.length < perPage) break;
    page++;
    if (page > 20) break; // safety
  }
  return results;
}

export async function getOrderById(id: number) {
  return wooFetch<WooOrder>(`/wp-json/wc/v3/orders/${id}`);
}
