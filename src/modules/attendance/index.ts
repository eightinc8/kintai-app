import type { AppModule } from "../types";

export const attendanceModule: AppModule = {
  id: "attendance",
  name: "勤怠管理",
  description: "出退勤時刻、勤務時間、交通費、勤務スタイルの記録",
  version: "1.0.0",
  navItems: [
    { label: "日次入力", href: "/report", icon: "ClipboardEdit" },
    { label: "ダッシュボード", href: "/dashboard", icon: "BarChart3" },
    { label: "勤務時間集計", href: "/admin/hours", icon: "Clock", adminOnly: true },
  ],
  sheetNames: ["attendance"],
  enabled: true,
};
