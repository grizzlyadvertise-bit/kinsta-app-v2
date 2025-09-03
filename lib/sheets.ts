// lib/sheets.ts
import { JWT } from "google-auth-library";
import { getSetting } from "./settings";

export async function getAccessToken(): Promise<string> {
  const clientEmail = await getSetting("GOOGLE_SA_CLIENT_EMAIL");
  const privateKeyRaw = await getSetting("GOOGLE_SA_PRIVATE_KEY");
  if (!clientEmail || !privateKeyRaw) throw new Error("Service Account not configured");

  // Support either literal "\n" or actual newlines from env
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  const client = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const { access_token } = await client.authorize();
  if (!access_token) throw new Error("Failed to obtain access_token from Google");
  return access_token;
}

export async function appendRows(tab: string, rows: (string | number | null)[][]) {
  const spreadsheetId = await getSetting("SHEETS_SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("SHEETS_SPREADSHEET_ID not set");
  const token = await getAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    tab
  )}:append?valueInputOption=RAW`;

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
