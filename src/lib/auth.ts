import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getStaffByEmail } from "@/lib/staff-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;
      const staff = await getStaffByEmail(profile.email);
      if (!staff || !staff.isActive) return false;
      return true;
    },
    async jwt({ token, trigger, profile }) {
      if (trigger === "signIn" && profile?.email) {
        const staff = await getStaffByEmail(profile.email);
        if (staff) {
          token.staffId = staff.id;
          token.role = staff.role;
          token.nameKana = staff.nameKana;
          token.name = staff.name;
          token.email = staff.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.staffId) {
        session.user.staffId = token.staffId;
        session.user.role = token.role!;
        session.user.nameKana = token.nameKana!;
      }
      return session;
    },
  },
});
