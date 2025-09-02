// lib/gmail.ts
// Gmail via the *signed-in user* (NextAuth Google). We store tokens in JWT and refresh via googleapis.
import { google } from "googleapis";
import { env } from "./env";

type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
};

export async function gmailClientFromTokens(tokens: TokenSet) {
  const oAuth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.NEXTAUTH_URL}/api/auth/callback/google`);
  oAuth2.setCredentials(tokens);
  return google.gmail({ version: "v1", auth: oAuth2 });
}

export async function listRecentDeposits(gmail: ReturnType<typeof google.gmail>, recipientEmails: string[], days: number) {
  const after = Math.floor(Date.now() / 1000) - days * 86400;
  const to = recipientEmails.map(e => `to:${e}`).join(" OR ");
  const q = `${to} newer_than:${days}d`;
  const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 50 });
  return res.data.messages ?? [];
}

// Very simple parser placeholder (adjust to your actual emails)
export async function parseMessage(gmail: ReturnType<typeof google.gmail>, id: string) {
  const msg = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const snippet = msg.data.snippet || "";
  // Try to extract amount, name—adjust to your format
  const amountMatch = snippet.match(/\$?([0-9]+\.[0-9]{2})/);
  const amount = amountMatch ? Number(amountMatch[1]) : undefined;
  return {
    id,
    snippet,
    amount,
    senderName: (snippet.match(/from ([A-Za-z \-']+)/i)?.[1] ?? "").trim(),
    ts: Number(msg.data.internalDate || Date.now()),
  };
}
