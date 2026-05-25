import type { AppModule } from "../types";

export const dailyReportModule: AppModule = {
  id: "daily-report",
  name: "業務報告",
  description: "日報、振り返り、アイディアストックの管理",
  version: "1.0.0",
  navItems: [
    { label: "日報一覧", href: "/admin/reports", icon: "FileText", adminOnly: true },
    { label: "アイディア", href: "/admin/ideas", icon: "Lightbulb", adminOnly: true },
  ],
  sheetNames: ["daily_reports", "ideas"],
  enabled: true,
};
