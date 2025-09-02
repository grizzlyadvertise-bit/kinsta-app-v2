// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions, type Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { type JWT } from "next-auth/jwt";

// Small helper to assert envs are present and typed
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const NEXTAUTH_SECRET = requireEnv("NEXTAUTH_SECRET");
const GOOGLE_CLIENT_ID = requireEnv("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = requireEnv("GOOGLE_CLIENT_SECRET");
const GOOGLE_ALLOWED_EMAIL = process.env.GOOGLE_ALLOWED_EMAIL || "";

const allowed = GOOGLE_ALLOWED_EMAIL
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Extend the token/session types locally (avoid `any`)
type TokenWithGoogle = JWT & {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

type SessionWithTokens = Session & {
  accessToken?: string;
  refreshToken?: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (allowed.length === 0) return true;
      const email = (user?.email || "").toLowerCase();
      return allowed.includes(email);
    },
    async jwt({ token, account }) {
      const t = token as TokenWithGoogle;
      if (account) {
        // Persist Google tokens from the provider account
        t.access_token = (account.access_token as string | undefined) ?? t.access_token;
        t.refresh_token = (account.refresh_token as string | undefined) ?? t.refresh_token;

        // Some providers give expires_at (epoch seconds); others give expires_in (seconds)
        const expiresInMs =
          account.expires_in !== undefined ? Number(account.expires_in) * 1000 : 0;
        const expiresAtMs =
          (account as { expires_at?: number }).expires_at !== undefined
            ? Number((account as { expires_at?: number }).expires_at) * 1000
            : 0;

        if (expiresAtMs > 0) t.expires_at = expiresAtMs;
        else if (expiresInMs > 0) t.expires_at = Date.now() + expiresInMs;
      }
      return t;
    },
    async session({ session, token }) {
      const s = session as SessionWithTokens;
      const t = token as TokenWithGoogle;
      s.accessToken = t.access_token;
      s.refreshToken = t.refresh_token;
      return s;
    },
  },
  secret: NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
