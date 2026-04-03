import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";
import {
  consumeOtpChallenge,
  createUser,
  findUserByEmail,
  normalizeDisplayName,
  normalizeEmail,
  normalizeGithubUsername,
} from "@/app/lib/auth/users";
import { verifyPassword } from "@/app/lib/auth/passwords";

function toSessionUser(user: {
  userId?: string;
  email?: string;
  name?: string;
  githubUsername?: string;
} | null) {
  if (!user) return null;

  const userId = normalizeEmail(user.userId || user.email || "");
  if (!userId) return null;

  return {
    id: userId,
    userId,
    email: userId,
    name: normalizeDisplayName(user.name || "") || userId,
    githubUsername: normalizeGithubUsername(user.githubUsername || ""),
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        intent: { label: "Intent", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        challengeId: { label: "Challenge Id", type: "text" },
      },
      async authorize(credentials) {
        const intent = String(credentials?.intent || "login").trim().toLowerCase();
        const email = normalizeEmail(credentials?.email || "");
        const password = String(credentials?.password || "");
        const otp = String(credentials?.otp || "");
        const challengeId = String(credentials?.challengeId || "");

        if (!email || !otp || !challengeId) {
          return null;
        }

        if (intent === "signup") {
          const existingUser = await findUserByEmail(email);
          if (existingUser) {
            return null;
          }

          const challengeMeta = await consumeOtpChallenge({
            challengeId,
            email,
            code: otp,
            purpose: "signup",
          });

          const passwordHash = String(challengeMeta?.passwordHash || "").trim();
          if (!passwordHash) {
            return null;
          }

          const createdUser = await createUser({
            email,
            passwordHash,
            name: String(challengeMeta?.displayName || email.split("@")[0]),
          });

          return toSessionUser(createdUser);
        }

        const user = await findUserByEmail(email);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return null;
        }

        await consumeOtpChallenge({
          challengeId,
          email,
          code: otp,
          purpose: "login",
        });

        return toSessionUser(user);
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const sessionUser = toSessionUser(user as Record<string, string>);
        if (sessionUser) {
          token.userId = sessionUser.userId;
          token.email = sessionUser.email;
          token.name = sessionUser.name;
          token.username = sessionUser.githubUsername;
          token.githubUsername = sessionUser.githubUsername;
        }
      }

      if (trigger === "update" && session) {
        const sessionUpdate = session as {
          name?: string;
          username?: string;
          githubUsername?: string;
        };

        token.name =
          normalizeDisplayName(sessionUpdate.name || String(token.name || "")) ||
          String(token.name || "");

        const nextGithubUsername = normalizeGithubUsername(
          sessionUpdate.githubUsername ||
            sessionUpdate.username ||
            String(token.githubUsername || token.username || "")
        );

        token.username = nextGithubUsername;
        token.githubUsername = nextGithubUsername;
      }

      return token;
    },

    async session({ session, token }) {
      session.user = session.user || {};
      session.user.email = String(token.email || session.user.email || "");
      session.user.name = String(token.name || session.user.name || "");
      session.userId = String(token.userId || token.email || "");
      session.username = String(token.username || "");
      session.githubUsername = String(token.githubUsername || token.username || "");
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
