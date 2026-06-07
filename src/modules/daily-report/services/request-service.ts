import { v4 as uuidv4 } from "uuid";
import type { StaffRequest, RequestComment } from "@/types/request";
import {
  getRows,
  findRow,
  appendRow,
  updateRow,
  deleteRow,
} from "@/lib/google-sheets";

function rowToRequest(row: Record<string, string>): StaffRequest {
  let comments: RequestComment[] = [];
  try {
    if (row.comments) {
      comments = JSON.parse(row.comments);
    }
  } catch {
    comments = [];
  }
  return {
    id: row.id,
    fromEmail: row.from_email,
    toEmail: row.to_email,
    content: row.content,
    comments,
    isDone: row.is_done?.toUpperCase() === "TRUE",
    doneAt: row.done_at || "",
    createdAt: row.created_at,
  };
}

function requestToRow(req: StaffRequest): Record<string, string> {
  return {
    id: req.id,
    from_email: req.fromEmail,
    to_email: req.toEmail,
    content: req.content,
    comments: JSON.stringify(req.comments),
    is_done: req.isDone ? "TRUE" : "FALSE",
    done_at: req.doneAt,
    created_at: req.createdAt,
  };
}

export async function getAllRequests(): Promise<StaffRequest[]> {
  const rows = await getRows("requests");
  return rows.map(rowToRequest);
}

export async function createRequest(
  fromEmail: string,
  toEmail: string,
  content: string
): Promise<StaffRequest> {
  const now = new Date().toISOString();
  const req: StaffRequest = {
    id: uuidv4(),
    fromEmail,
    toEmail,
    content,
    comments: [],
    isDone: false,
    doneAt: "",
    createdAt: now,
  };
  await appendRow("requests", requestToRow(req));
  return req;
}

export async function addRequestComment(
  id: string,
  email: string,
  text: string
): Promise<StaffRequest | undefined> {
  const result = await findRow("requests", "id", id);
  if (!result) return undefined;

  const req = rowToRequest(result.data);
  const comment: RequestComment = {
    email,
    text,
    at: new Date().toISOString(),
  };
  req.comments.push(comment);

  await updateRow("requests", result.rowIndex, requestToRow(req));
  return req;
}

export async function toggleRequestDone(
  id: string
): Promise<StaffRequest | undefined> {
  const result = await findRow("requests", "id", id);
  if (!result) return undefined;

  const req = rowToRequest(result.data);
  req.isDone = !req.isDone;
  req.doneAt = req.isDone ? new Date().toISOString() : "";

  await updateRow("requests", result.rowIndex, requestToRow(req));
  return req;
}

export async function deleteRequest(id: string): Promise<boolean> {
  const result = await findRow("requests", "id", id);
  if (!result) return false;
  await deleteRow("requests", result.rowIndex);
  return true;
}
