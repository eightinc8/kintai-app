import { NextResponse } from "next/server";
import {
  getAllCategories,
  addCategory,
  deleteCategory,
} from "@/lib/category-service";
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error("Categories fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
    }
    const category = await addCategory(body.name.trim());
    return NextResponse.json(category);
  } catch (e) {
    console.error("Category create error:", e);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
    }
    const result = await deleteCategory(id);
    if (!result) {
      return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Category delete error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
