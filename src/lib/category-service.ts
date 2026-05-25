import { v4 as uuidv4 } from "uuid";
import { getRows, appendRow, findRow, deleteRow } from "@/lib/google-sheets";

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

function rowToCategory(row: Record<string, string>): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
  };
}

function categoryToRow(cat: Category): Record<string, string> {
  return {
    id: cat.id,
    name: cat.name,
    sort_order: String(cat.sortOrder),
    created_at: cat.createdAt,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const rows = await getRows("categories");
  return rows.map(rowToCategory).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addCategory(name: string): Promise<Category> {
  const existing = await getAllCategories();
  const maxOrder = existing.length > 0
    ? Math.max(...existing.map((c) => c.sortOrder))
    : 0;

  const cat: Category = {
    id: uuidv4(),
    name,
    sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };

  await appendRow("categories", categoryToRow(cat));
  return cat;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const result = await findRow("categories", "id", id);
  if (!result) return false;
  await deleteRow("categories", result.rowIndex);
  return true;
}
