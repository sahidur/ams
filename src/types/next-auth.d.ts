import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    userRoleId?: string;
    userRoleName?: string;
    image?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      userRoleId?: string;
      userRoleName?: string;
      image?: string;
    };
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    userRoleId?: string;
    userRoleName?: string;
    error?: string;
  }
}
