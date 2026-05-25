import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/user";

declare module "next-auth" {
  interface Session {
    user: {
      staffId: string;
      role: UserRole;
      nameKana: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    staffId?: string;
    role?: UserRole;
    nameKana?: string;
  }
}
