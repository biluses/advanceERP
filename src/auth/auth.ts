import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db, schema } from "@/db/client";
import { mailConfigured, sendMail } from "@/server/mail";
import { bootstrapWorkspace } from "@/server/workspaces";

const secret = process.env.APP_SECRET?.trim();
/* The build evaluates route modules without the runtime environment; the
   guard is for a server that would otherwise sign sessions with a known
   default. */
const building = process.env.NEXT_PHASE === "phase-production-build";
if (!secret && process.env.NODE_ENV === "production" && !building) {
  throw new Error("Missing APP_SECRET — set it before starting the server");
}

export const auth = betterAuth({
  appName: "Vitrina",
  secret: secret ?? "vitrina-dev-secret-change-me",
  baseURL: process.env.APP_URL?.trim() || undefined,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    /* No mail provider is wired in by default; a self-hosted install has no
       need for a verification round trip, and a SaaS operator can turn it on
       once they have a sender. */
    requireEmailVerification: false,
    /* Password resets go out only when a sender exists; the login page hides
       the link otherwise. */
    sendResetPassword: async ({ user, url }) => {
      if (!mailConfigured()) throw new Error("Password reset is not available on this studio");
      await sendMail({
        to: user.email,
        subject: "Reset your Vitrina password",
        text: `Someone asked to reset the password for ${user.email}. Open this link to choose a new one:\n\n${url}\n\nIf that was not you, ignore this message.`,
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: { deleteUser: { enabled: true } },
  databaseHooks: {
    user: {
      create: {
        /* A person who signs up gets a workspace to work in, their brand kit
           ready to fill in, and the trial credits — in one place, so no route
           can forget a step. */
        after: async (created) => {
          await bootstrapWorkspace({ id: created.id, name: created.name, email: created.email });
        },
      },
    },
  },
  advanced: { database: { generateId: "uuid" } },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
