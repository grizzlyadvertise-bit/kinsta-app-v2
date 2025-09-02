// lib/gmail.ts
import { google, gmail_v1 } from "googleapis";
import { env } from "./env";

type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
};

export async function gmailClientFromTokens(tokens: TokenSet): Promise<gmail_v1.Gmail> {
  const oAuth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.NEXTAUTH_URL}/api/auth/callback/google`
  );
  oAuth2.setCredentials(tokens);
  return google.gmail({ version: "v1", auth: oAuth2 });
}

export async function listRecentDeposits(
  gmail: gmail_v1.Gmail,
  recipientEmails: string[],
  days: number
): Promise<gmail_v1.Schema$Message[]> {
  const to = recipientEmails.map((e) => `to:${e}`).join(" OR ");
  const q = `${to} newer_than:${days}d`;
  const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 50 });
  return res.data.messages ?? [];
}

export async function parseMessage(
  gmail: gmail_v1.Gmail,
  id: string
): Promise<{
  id: string;
  snippet: string;
  amount?: number;
  senderName: string;
  ts: number;
}> {
  const msg = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const snippet = msg.data.snippet || "";

  // naive amount extraction (adjust to your real patterns)
  const amountMatch = snippet.match(/\$?([0-9]+\.[0-9]{2})/);
  const amount = amountMatch ? Number(amountMatch[1]) : undefined;

  const senderName = (snippet.match(/from ([A-Za-z \-']+)/i)?.[1] ?? "").trim();
  const ts = Number(msg.data.internalDate || Date.now());

  return { id, snippet, amount, senderName, ts };
}
