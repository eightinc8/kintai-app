"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
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

  const staffId = session?.user?.staffId;
  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? "";
  const nameKana = session?.user?.nameKana ?? "";
  const role = session?.user?.role ?? "staff";

  // 毎回新しいオブジェクトを作ると、タブを切り替えてセッションが再取得された
  // だけで currentUser が別物になり、入力中の画面が読み込み直されてしまう。
  const currentUser: Staff | null = useMemo(
    () =>
      staffId
        ? {
            id: staffId,
            email,
            name,
            nameKana,
            role,
            startMonth: "",
            address: "",
            phone: "",
            birthday: "",
            familyComposition: "",
            isActive: true,
            createdAt: "",
            updatedAt: "",
          }
        : null,
    [staffId, email, name, nameKana, role]
  );

  const value = useMemo(() => ({ currentUser, loading }), [currentUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
