import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

// Helper to parse user agent
function parseUserAgent(userAgent: string) {
  let deviceType = "desktop";
  let browser = "Unknown";
  let os = "Unknown";

  // Device type
  if (/mobile/i.test(userAgent)) deviceType = "mobile";
  else if (/tablet|ipad/i.test(userAgent)) deviceType = "tablet";

  // Browser
  if (/firefox/i.test(userAgent)) browser = "Firefox";
  else if (/edg/i.test(userAgent)) browser = "Edge";
  else if (/chrome/i.test(userAgent)) browser = "Chrome";
  else if (/safari/i.test(userAgent)) browser = "Safari";
  else if (/opera|opr/i.test(userAgent)) browser = "Opera";

  // OS
  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/macintosh|mac os/i.test(userAgent)) os = "macOS";
  else if (/linux/i.test(userAgent)) os = "Linux";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";

  return { deviceType, browser, os };
}

// Helper to log login attempt
async function logLogin(
  userId: string,
  method: "PASSWORD" | "PASSKEY" | "PIN",
  success: boolean,
  failReason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const parsed = userAgent ? parseUserAgent(userAgent) : {};
    await prisma.loginLog.create({
      data: {
        userId,
        method,
        success,
        failReason,
        ipAddress,
        userAgent,
        ...parsed,
      },
    });
  } catch (error) {
    console.error("Failed to log login:", error);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
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
        passkeyVerified: { label: "Passkey Verified", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email) {
          throw new Error("Email is required");
        }

        // Get request headers for logging
        const headersList = await headers();
        const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
        const userAgent = headersList.get("user-agent") || undefined;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            userRole: true,
          },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // Check if this is a passkey-verified login
        if (credentials.passkeyVerified === "true") {
          // Passkey already verified by /api/passkey/authenticate
          // Just check user status

          if (!user.isActive) {
            await logLogin(user.id, "PASSKEY", false, "Account deactivated", ipAddress, userAgent);
            throw new Error("Your account has been deactivated. Please contact administrator.");
          }

          if (user.approvalStatus !== "APPROVED") {
            await logLogin(user.id, "PASSKEY", false, "Account pending approval", ipAddress, userAgent);
            throw new Error("Your account is pending approval");
          }

          if (user.userRole && !user.userRole.isActive) {
            await logLogin(user.id, "PASSKEY", false, "Role deactivated", ipAddress, userAgent);
            throw new Error("Your role has been deactivated. Please contact administrator.");
          }

          // Log successful passkey login
          await logLogin(user.id, "PASSKEY", true, undefined, ipAddress, userAgent);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            userRoleId: user.userRoleId ?? undefined,
            userRoleName: user.userRole?.displayName,
            image: user.profileImage ?? undefined,
          };
        }

        // Regular password login
        if (!credentials.password) {
          throw new Error("Password is required");
        }

        // Check if user account is active
        if (!user.isActive) {
          await logLogin(user.id, "PASSWORD", false, "Account deactivated", ipAddress, userAgent);
          throw new Error("Your account has been deactivated. Please contact administrator.");
        }

        if (user.approvalStatus !== "APPROVED") {
          await logLogin(user.id, "PASSWORD", false, "Account pending approval", ipAddress, userAgent);
          throw new Error("Your account is pending approval");
        }

        // Check if user's role is active
        if (user.userRole && !user.userRole.isActive) {
          await logLogin(user.id, "PASSWORD", false, "Role deactivated", ipAddress, userAgent);
          throw new Error("Your role has been deactivated. Please contact administrator.");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          await logLogin(user.id, "PASSWORD", false, "Invalid password", ipAddress, userAgent);
          throw new Error("Invalid email or password");
        }

        // Log successful password login
        await logLogin(user.id, "PASSWORD", true, undefined, ipAddress, userAgent);

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
