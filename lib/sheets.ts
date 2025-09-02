// lib/sheets.ts
import jwt from "jsonwebtoken";
import { getSetting } from "./settings";

async function getAccessToken() {
  const clientEmail = await getSetting("GOOGLE_SA_CLIENT_EMAIL");
  const privateKeyRaw = await getSetting("GOOGLE_SA_PRIVATE_KEY");
  if (!clientEmail || !privateKeyRaw) throw new Error("Service Account not configured");
  const privateKey = privateKeyRaw.includes("\\n") ? privateKeyRaw.replace(/\\n/g, "\n") : privateKeyRaw;

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const assertion = jwt.sign(jwtPayload, privateKey, { algorithm: "RS256" });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!r.ok) throw new Error("Token exchange failed: " + (await r.text()));
  const json = await r.json();
  return json.access_token as string;
}

export async function appendRows(tab: string, rows: (string|number|null)[][]) {
  const spreadsheetId = await getSetting("SHEETS_SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("SHEETS_SPREADSHEET_ID not set");
  const token = await getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab)}:append?valueInputOption=RAW`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: rows }),
  });
  if (!r.ok) throw new Error("Sheets append failed: " + (await r.text()));
  return r.json();
}
