import type { NextAuthConfig } from 'next-auth';

/**
 * Auth configuration that can be used in Edge runtime (middleware)
 * This config does NOT include the PrismaAdapter or any database calls
 */
export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  providers: [], // Providers are added in the full auth.ts file
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // Public routes that don't require authentication
      const publicRoutes = ['/', '/login', '/register'];
      const isPublicRoute = publicRoutes.includes(pathname);

      // Auth API routes should always be accessible
      if (pathname.startsWith('/api/auth')) {
        return true;
      }

      // Redirect unauthenticated users to login
      if (!isLoggedIn && !isPublicRoute) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
