import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            userRole: true,
          },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (user.approvalStatus !== "APPROVED") {
          throw new Error("Your account is pending approval");
        }

        // Check if user's role is active
        if (user.userRole && !user.userRole.isActive) {
          throw new Error("Your role has been deactivated. Please contact administrator.");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          userRoleId: user.userRoleId ?? undefined,
          userRoleName: user.userRole?.displayName,
          image: user.profileImage ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userRoleId = user.userRoleId;
        token.userRoleName = user.userRoleName;
      }
      
      // Re-validate role on session update
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { userRole: true },
        });
        
        if (dbUser?.userRole && !dbUser.userRole.isActive) {
          // Force sign out by returning empty token
          return { ...token, error: "RoleDeactivated" };
        }
        
        if (dbUser) {
          token.userRoleId = dbUser.userRoleId ?? undefined;
          token.userRoleName = dbUser.userRole?.displayName;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userRoleId = token.userRoleId as string | undefined;
        session.user.userRoleName = token.userRoleName as string | undefined;
        
        // Check for role deactivation error
        if (token.error === "RoleDeactivated") {
          session.error = "RoleDeactivated";
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
