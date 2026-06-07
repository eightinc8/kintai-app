export interface StaffRequest {
  id: string;
  fromEmail: string;
  toEmail: string;
  content: string;
  comments: RequestComment[];
  isDone: boolean;
  doneAt: string;
  createdAt: string;
}

export interface RequestComment {
  email: string;
  text: string;
  at: string;
}
