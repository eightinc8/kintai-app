import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Staff } from "@/types/user";
import {
  getRows,
  findRow,
  appendRow,
  updateRow,
} from "@/lib/google-sheets";

export const staffSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  nameKana: z.string().min(1, "かなを入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  role: z.enum(["admin", "staff"]),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM形式で入力してください"),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  birthday: z.string().optional().default(""),
  familyComposition: z.string().optional().default(""),
});

export type StaffFormData = z.infer<typeof staffSchema>;

function rowToStaff(row: Record<string, string>): Staff {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    nameKana: row.name_kana,
    role: row.role as "admin" | "staff",
    startMonth: row.start_month,
    address: row.address,
    phone: row.phone,
    birthday: row.birthday,
    familyComposition: row.family_composition || "",
    isActive: row.is_active !== "FALSE",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function staffToRow(staff: Staff): Record<string, string> {
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    name_kana: staff.nameKana,
    role: staff.role,
    start_month: staff.startMonth,
    address: staff.address,
    phone: staff.phone,
    birthday: staff.birthday,
    family_composition: staff.familyComposition,
    is_active: staff.isActive ? "TRUE" : "FALSE",
    created_at: staff.createdAt,
    updated_at: staff.updatedAt,
  };
}

export async function getAllStaff(): Promise<Staff[]> {
  const rows = await getRows("staff");
  return rows.filter((r) => r.is_active !== "FALSE").map(rowToStaff);
}

export async function getStaffByEmail(
  email: string
): Promise<Staff | undefined> {
  const result = await findRow("staff", "email", email);
  return result ? rowToStaff(result.data) : undefined;
}

export async function getStaffById(id: string): Promise<Staff | undefined> {
  const result = await findRow("staff", "id", id);
  return result ? rowToStaff(result.data) : undefined;
}

export async function createStaff(data: StaffFormData): Promise<Staff> {
  const now = new Date().toISOString();
  const staff: Staff = {
    id: uuidv4(),
    email: data.email,
    name: data.name,
    nameKana: data.nameKana,
    role: data.role,
    startMonth: data.startMonth,
    address: data.address ?? "",
    phone: data.phone ?? "",
    birthday: data.birthday ?? "",
    familyComposition: data.familyComposition ?? "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await appendRow("staff", staffToRow(staff));
  return staff;
}

export async function updateStaff(
  id: string,
  data: Partial<StaffFormData>
): Promise<Staff | undefined> {
  const result = await findRow("staff", "id", id);
  if (!result) return undefined;

  const existing = rowToStaff(result.data);
  const updated: Staff = {
    ...existing,
    ...data,
    nameKana: data.nameKana ?? existing.nameKana,
    startMonth: data.startMonth ?? existing.startMonth,
    updatedAt: new Date().toISOString(),
  };
  await updateRow("staff", result.rowIndex, staffToRow(updated));
  return updated;
}
