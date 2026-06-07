"use client";

import { AuthProvider } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-18 md:pt-6">{children}</main>
      </div>
    </AuthProvider>
  );
}
