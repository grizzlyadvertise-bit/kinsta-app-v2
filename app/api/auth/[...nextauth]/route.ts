// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const {
  NEXTAUTH_SECRET,
  NEXTAUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_ALLOWED_EMAIL,
} = process.env;

if (!NEXTAUTH_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXTAUTH_URL) {
  throw new Error("Missing auth env vars");
}

const allowed = (GOOGLE_ALLOWED_EMAIL || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const options: NextAuthOptions = {
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
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = Date.now() + (account.expires_in ?? 0) * 1000;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = token.access_token;
      (session as any).refresh_token = token.refresh_token;
      return session;
    },
  },
  secret: NEXTAUTH_SECRET,
};

const handler = NextAuth(options);
export { handler as GET, handler as POST };
