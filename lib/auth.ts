import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);

        if (!validated.success) {
          return null;
        }

        const { email, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
