"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const staffNav = [
  { label: "ダッシュボード", href: "/dashboard", icon: "📊" },
  { label: "日報を入力する", href: "/report", icon: "📝" },
  { label: "日報一覧", href: "/admin/reports", icon: "📄" },
  { label: "勤怠履歴", href: "/history", icon: "📋" },
  { label: "アイディア投稿", href: "/ideas/new", icon: "✨" },
  { label: "アイディア一覧", href: "/ideas", icon: "💡" },
];

const adminNav = [
  { label: "スタッフ管理", href: "/admin/staff", icon: "👥" },
  { label: "勤務時間集計", href: "/admin/hours", icon: "⏰" },
  { label: "カテゴリー管理", href: "/admin/categories", icon: "🏷️" },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  return (
    <>
      <nav className="flex-1 p-3 space-y-1">
        {staffNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
                onClick={onNavigate}
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
    </>
  );
}

export function Sidebar() {
  const { loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ページ遷移時にメニューを閉じる
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <>
        {/* デスクトップ: ローディング */}
        <aside className="hidden md:flex w-64 border-r bg-card items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </aside>
        {/* モバイル: ヘッダー */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center justify-between px-4 z-40">
          <h1 className="text-lg font-bold">勤怠管理</h1>
        </header>
      </>
    );
  }

  return (
    <>
      {/* デスクトップ: 従来のサイドバー */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col h-full">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold">勤怠管理</h1>
          <p className="text-xs text-muted-foreground mt-1">業務報告システム</p>
        </div>
        <NavContent />
      </aside>

      {/* モバイル: 固定ヘッダー + ハンバーガーメニュー */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b flex items-center justify-between px-4 z-40">
        <h1 className="text-lg font-bold">勤怠管理</h1>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="メニューを開く"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* モバイル: オーバーレイメニュー */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* 背景オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* メニューパネル（上から下にスライド） */}
          <div className="absolute top-0 left-0 right-0 bg-card shadow-lg animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">勤怠管理</h1>
                <p className="text-xs text-muted-foreground mt-1">業務報告システム</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="メニューを閉じる"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
