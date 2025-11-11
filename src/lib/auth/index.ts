import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export enum UserRole {
  user = "user",
  admin = "admin",
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth/adapters" {
  interface AdapterUser {
    login?: string;
    role?: UserRole;
    dashboardEnabled?: boolean;
    isTeamAdmin?: boolean;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
      role?: UserRole;
      dashboardEnabled?: boolean;
      isAdmin?: boolean;
      expires?: string;
      isTeamAdmin?: boolean;
    };
    accessToken?: string;
  }

  export interface Profile {
    login: string;
  }

  interface User {
    role?: UserRole;
    login?: string;
    expires?: string;
    isTeamAdmin?: boolean;
    isAdmin?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Development-only credentials provider for quick testing
    ...(process.env.NODE_ENV !== "production"
      ? [
          CredentialsProvider({
            id: "credentials",
            name: "Credentials (Dev Only)",
            credentials: {
              email: {
                label: "Email",
                type: "email",
                placeholder: "test@example.com",
              },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) {
                return null;
              }

              // Find or create user for development
              let user = await prisma.user.findUnique({
                where: { email: credentials.email },
              });

              if (!user) {
                // Create new user for dev testing
                const hashedPassword = await bcrypt.hash(credentials.password, 10);
                user = await prisma.user.create({
                  data: {
                    email: credentials.email,
                    name: credentials.email.split("@")[0],
                    hashedPassword,
                    role: UserRole.user,
                  },
                });
              } else {
                // Verify password for existing user
                if (!user.hashedPassword) {
                  // If user exists but has no password, set it
                  const hashedPassword = await bcrypt.hash(
                    credentials.password,
                    10
                  );
                  user = await prisma.user.update({
                    where: { id: user.id },
                    data: { hashedPassword },
                  });
                } else {
                  // Verify password
                  const isValid = await bcrypt.compare(
                    credentials.password,
                    user.hashedPassword
                  );
                  if (!isValid) {
                    return null;
                  }
                }
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role ? (user.role as UserRole) : undefined,
              };
            },
          }),
        ]
      : []),
    // Email provider (requires EMAIL_SERVER_PASSWORD in production)
    ...(process.env.EMAIL_SERVER_PASSWORD
      ? [
          EmailProvider({
            server: {
              host: "smtp.resend.com",
              port: 465,
              auth: {
                user: "resend",
                pass: process.env.EMAIL_SERVER_PASSWORD,
              },
            },
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          }),
        ]
      : []),
  ],
  session: {
    // Use JWT for credentials provider (dev), database for email provider
    strategy: process.env.NODE_ENV !== "production" ? "jwt" : "database",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      try {
        const email = user?.email;
        if (!email) return false;

        // Credentials provider doesn't use adapter, so we allow it
        if (account?.provider === "credentials") {
          return true;
        }

        // Check if email is on allowlist (required for production)
        // Skip allowlist check in development mode
        if (process.env.NODE_ENV === "production") {
          const inAllowlist = await prisma.allowlist.findUnique({
            where: { email },
          });

          if (!inAllowlist) {
            console.error(`[NextAuth] Access denied: ${email} is not on allowlist`);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },
    async session({ session, user, token }) {
      try {
        // JWT strategy (dev mode with credentials)
        if (token) {
          // Fetch latest user data from DB
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
          });
          if (dbUser) {
            return {
              ...session,
              user: {
                ...session.user,
                id: dbUser.id,
                email: dbUser.email ?? token.email as string,
                name: dbUser.name ?? token.name as string,
                role: dbUser.role ?? (token.role as UserRole),
                login: dbUser.login,
                isAdmin: dbUser.isAdmin ?? (token.isAdmin as boolean),
              },
            };
          }
        }

        // Database strategy (production with email provider)
        if (user) {
          return {
            ...session,
            user: {
              ...session.user,
              id: user.id,
              role: user.role,
              login: user.login,
              isAdmin: user.isAdmin,
            },
          };
        }

        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
    async jwt({ token, user, account: _account }) {
      // Store user info in token for credentials provider
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
