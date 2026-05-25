import { v4 as uuidv4 } from "uuid";
import type { ReportImage } from "@/types/report";
import {
  findRows,
  findRow,
  appendRow,
  deleteRow,
  uploadFile,
  deleteFile,
} from "@/lib/google-sheets";

function rowToImage(row: Record<string, string>): ReportImage {
  return {
    id: row.id,
    staffEmail: row.staff_email,
    date: row.date,
    fileName: row.file_name,
    driveFileId: row.drive_file_id,
    viewUrl: row.view_url,
    createdAt: row.created_at,
  };
}

function imageToRow(img: ReportImage): Record<string, string> {
  return {
    id: img.id,
    staff_email: img.staffEmail,
    date: img.date,
    file_name: img.fileName,
    drive_file_id: img.driveFileId,
    view_url: img.viewUrl,
    created_at: img.createdAt,
  };
}

export async function getImagesByDate(
  staffEmail: string,
  date: string
): Promise<ReportImage[]> {
  const rows = await findRows("report_images", "staff_email", staffEmail);
  return rows
    .filter((r) => r.data.date === date)
    .map((r) => rowToImage(r.data));
}

export async function getImagesByEmail(
  staffEmail: string
): Promise<ReportImage[]> {
  const rows = await findRows("report_images", "staff_email", staffEmail);
  return rows.map((r) => rowToImage(r.data));
}

export async function getAllImages(): Promise<ReportImage[]> {
  const { getRows } = await import("@/lib/google-sheets");
  const rows = await getRows("report_images");
  return rows.map(rowToImage);
}

export async function uploadReportImage(
  staffEmail: string,
  date: string,
  base64: string,
  fileName: string,
  mimeType: string
): Promise<ReportImage> {
  // Google Driveにアップロード
  const { fileId, viewUrl } = await uploadFile(base64, fileName, mimeType);

  const now = new Date().toISOString();
  const image: ReportImage = {
    id: uuidv4(),
    staffEmail,
    date,
    fileName,
    driveFileId: fileId,
    viewUrl,
    createdAt: now,
  };

  // report_imagesシートに記録
  await appendRow("report_images", imageToRow(image));

  return image;
}

export async function deleteReportImage(id: string): Promise<boolean> {
  const result = await findRow("report_images", "id", id);
  if (!result) return false;

  const image = rowToImage(result.data);

  // Google Driveからファイルを削除
  await deleteFile(image.driveFileId);

  // シートから行を削除
  await deleteRow("report_images", result.rowIndex);

  return true;
}
