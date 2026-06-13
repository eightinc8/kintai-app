import type { Staff } from "@/types/user";
import type { Attendance } from "@/types/attendance";
import type { DailyReport, Idea } from "@/types/report";

const now = new Date().toISOString();

export const mockStaff: Staff[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "管理 太郎",
    nameKana: "かんり たろう",
    role: "admin",
    startMonth: "2024-04",
    address: "東京都渋谷区1-1-1",
    phone: "090-1234-5678",
    birthday: "1990-01-15",
    familyComposition: "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "2",
    email: "staff@example.com",
    name: "社員 花子",
    nameKana: "しゃいん はなこ",
    role: "staff",
    startMonth: "2024-06",
    address: "東京都新宿区2-2-2",
    phone: "090-9876-5432",
    birthday: "1995-05-20",
    familyComposition: "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockAttendance: Attendance[] = [
  {
    id: "a1",
    staffEmail: "staff@example.com",
    date: "2026-05-19",
    clockIn: "09:00",
    clockOut: "18:00",
    breakMinutes: 0,
    workHours: 8,
    transportCost: 500,
    workStyle: "office",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "a2",
    staffEmail: "staff@example.com",
    date: "2026-05-18",
    clockIn: "10:00",
    clockOut: "19:30",
    breakMinutes: 60,
    workHours: 8.5,
    transportCost: 0,
    workStyle: "remote",
    createdAt: now,
    updatedAt: now,
  },
];

export const mockReports: DailyReport[] = [
  {
    id: "r1",
    staffEmail: "staff@example.com",
    date: "2026-05-19",
    todaysPlan: "",
    workDone: "新機能の実装を行いました。",
    goodPoints: "予定通りに完了できた。",
    reflections: "テストコードを先に書くべきだった。",
    amazonCount: 0,
    rakutenCount: 0,
    adminComment: "",
    adminCommentBy: "",
    adminCommentAt: "",
    staffReply: "",
    staffReplyAt: "",
    createdAt: now,
    updatedAt: now,
  },
];

export const mockIdeas: Idea[] = [
  {
    id: "i1",
    staffEmail: "staff@example.com",
    date: "2026-05-19",
    content: "日報の通知機能があると便利",
    category: "",
    isDone: false,
    doneAt: "",
    doneBy: "",
    createdAt: now,
  },
  {
    id: "i2",
    staffEmail: "staff@example.com",
    date: "2026-05-18",
    content: "ダッシュボードにグラフが欲しい",
    category: "",
    isDone: true,
    doneAt: now,
    doneBy: "",
    createdAt: now,
  },
];

let staffStore = [...mockStaff];
let attendanceStore = [...mockAttendance];
let reportStore = [...mockReports];
let ideaStore = [...mockIdeas];

export const mockDb = {
  staff: {
    getAll: () => staffStore.filter((s) => s.isActive),
    getByEmail: (email: string) => staffStore.find((s) => s.email === email),
    getById: (id: string) => staffStore.find((s) => s.id === id),
    create: (staff: Staff) => {
      staffStore.push(staff);
      return staff;
    },
    update: (id: string, data: Partial<Staff>) => {
      staffStore = staffStore.map((s) =>
        s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
      );
      return staffStore.find((s) => s.id === id);
    },
  },
  attendance: {
    getAll: () => attendanceStore,
    getByEmailAndDate: (email: string, date: string) =>
      attendanceStore.find((a) => a.staffEmail === email && a.date === date),
    getByEmailAndMonth: (email: string, yearMonth: string) =>
      attendanceStore.filter(
        (a) => a.staffEmail === email && a.date.startsWith(yearMonth)
      ),
    getAllByMonth: (yearMonth: string) =>
      attendanceStore.filter((a) => a.date.startsWith(yearMonth)),
    upsert: (data: Attendance) => {
      const idx = attendanceStore.findIndex(
        (a) => a.staffEmail === data.staffEmail && a.date === data.date
      );
      if (idx >= 0) {
        attendanceStore[idx] = { ...attendanceStore[idx], ...data, updatedAt: new Date().toISOString() };
      } else {
        attendanceStore.push(data);
      }
      return data;
    },
  },
  reports: {
    getAll: () => reportStore,
    getByEmailAndDate: (email: string, date: string) =>
      reportStore.find((r) => r.staffEmail === email && r.date === date),
    getAllByMonth: (yearMonth: string) =>
      reportStore.filter((r) => r.date.startsWith(yearMonth)),
    upsert: (data: DailyReport) => {
      const idx = reportStore.findIndex(
        (r) => r.staffEmail === data.staffEmail && r.date === data.date
      );
      if (idx >= 0) {
        reportStore[idx] = { ...reportStore[idx], ...data, updatedAt: new Date().toISOString() };
      } else {
        reportStore.push(data);
      }
      return data;
    },
    updateComment: (
      reportId: string,
      comment: string,
      commentBy: string
    ) => {
      reportStore = reportStore.map((r) =>
        r.id === reportId
          ? {
              ...r,
              adminComment: comment,
              adminCommentBy: commentBy,
              adminCommentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : r
      );
      return reportStore.find((r) => r.id === reportId);
    },
  },
  ideas: {
    getAll: () => ideaStore,
    getByEmail: (email: string) =>
      ideaStore.filter((i) => i.staffEmail === email),
    create: (idea: Idea) => {
      ideaStore.push(idea);
      return idea;
    },
    toggleDone: (id: string) => {
      ideaStore = ideaStore.map((i) =>
        i.id === id
          ? { ...i, isDone: !i.isDone, doneAt: !i.isDone ? new Date().toISOString() : "" }
          : i
      );
      return ideaStore.find((i) => i.id === id);
    },
  },
};
