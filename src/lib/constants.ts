export const SHEET_NAMES = {
  STAFF: "staff",
  ATTENDANCE: "attendance",
  DAILY_REPORTS: "daily_reports",
  IDEAS: "ideas",
} as const;

export const WORK_STYLES = {
  office: "出勤",
  remote: "在宅",
} as const;

export const ROLES = {
  admin: "管理者",
  staff: "スタッフ",
} as const;

export const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);

export const MINUTES = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0")
);
