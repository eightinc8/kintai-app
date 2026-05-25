"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const staffNav = [
  { label: "日報を入力する", href: "/report", icon: "📝" },
  { label: "勤怠履歴", href: "/history", icon: "📋" },
  { label: "ダッシュボード", href: "/dashboard", icon: "📊" },
  { label: "アイディア一覧", href: "/ideas", icon: "💡" },
];

const adminNav = [
  { label: "スタッフ管理", href: "/admin/staff", icon: "👥" },
  { label: "日報一覧", href: "/admin/reports", icon: "📄" },
  { label: "勤務時間集計", href: "/admin/hours", icon: "⏰" },
  { label: "カテゴリー管理", href: "/admin/categories", icon: "🏷️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, loading } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <aside className="w-64 border-r bg-card flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">勤怠管理</h1>
        <p className="text-xs text-muted-foreground mt-1">業務報告システム</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {staffNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <Separator className="my-3" />
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              管理者メニュー
            </p>
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t space-y-2">
        <div>
          <p className="text-sm font-medium">{currentUser?.name}</p>
          <p className="text-xs text-muted-foreground">
            {currentUser?.role === "admin" ? "管理者" : "スタッフ"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
