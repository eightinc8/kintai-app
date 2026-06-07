export interface DailyReport {
  id: string;
  staffEmail: string;
  date: string;
  todaysPlan: string;
  workDone: string;
  goodPoints: string;
  reflections: string;
  adminComment: string;
  adminCommentBy: string;
  adminCommentAt: string;
  staffReply: string;
  staffReplyAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Idea {
  id: string;
  staffEmail: string;
  date: string;
  content: string;
  category: string;
  isDone: boolean;
  doneAt: string;
  doneBy: string;
  createdAt: string;
}

export interface ReportImage {
  id: string;
  staffEmail: string;
  date: string;
  fileName: string;
  driveFileId: string;
  viewUrl: string;
  createdAt: string;
}
