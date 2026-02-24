import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { NextAuthOptions } from "next-auth";
import { upsertGithubUserIdentity } from "@/app/lib/githubStats";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo admin:repo_hook",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        const githubProfile = profile as
          | {
              login?: string;
              name?: string;
              email?: string;
              avatar_url?: string;
              id?: number;
            }
          | null
          | undefined;

        const login =
          githubProfile?.login ??
          (token as { username?: string } | null | undefined)?.username;
        if (login) {
          token.username = login;
        }

        if (login) {
          try {
            await upsertGithubUserIdentity({
              username: login,
              name: githubProfile?.name || "",
              email: githubProfile?.email || "",
              avatarUrl: githubProfile?.avatar_url || "",
              githubId: githubProfile?.id || null,
              source: "auth_signin",
            });
          } catch {
            // Ignore profile persistence failures so auth flow never breaks.
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.username = token.username as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
