import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { authConfig } from './auth.config';

/**
 * Full auth configuration with PrismaAdapter and Credentials provider
 * Use this for API routes (NOT for middleware, which runs in Edge runtime)
 */
const fullAuthConfig: NextAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma) as never,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
};

export const { handlers, signIn, signOut, auth } = NextAuth(fullAuthConfig);

// For API routes that need the auth options
export const authOptions = fullAuthConfig;
