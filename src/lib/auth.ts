import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    // Production PostgreSQL database
    provider: "postgresql",
    url: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Simplified for demo
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      tenantId: {
        type: "string",
        required: false,
      },
      permissions: {
        type: "string",
        defaultValue: "[]", // JSON string of permissions
      }
    }
  }
});

export type Session = typeof auth.$Infer.Session.session & {
  user: typeof auth.$Infer.Session.user;
};
export type User = typeof auth.$Infer.Session.user;