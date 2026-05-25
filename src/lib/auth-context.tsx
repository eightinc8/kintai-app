"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { Staff } from "@/types/user";

interface AuthContextType {
  currentUser: Staff | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const currentUser: Staff | null =
    session?.user?.staffId
      ? {
          id: session.user.staffId,
          email: session.user.email ?? "",
          name: session.user.name ?? "",
          nameKana: session.user.nameKana ?? "",
          role: session.user.role ?? "staff",
          startMonth: "",
          address: "",
          phone: "",
          birthday: "",
          familyComposition: "",
          isActive: true,
          createdAt: "",
          updatedAt: "",
        }
      : null;

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
