import { NextResponse } from "next/server";
import {
  getAllIdeas,
  submitIdeas,
  toggleIdeaDone,
  updateIdeaCategory,
  deleteIdea,
} from "@/modules/daily-report/services/report-service";
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const ideas = await getAllIdeas();
    return NextResponse.json(ideas);
  } catch (e) {
    console.error("Ideas fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { staffEmail, ideas } = await request.json();
    if (staffEmail !== session!.user.email) {
      return NextResponse.json(
        { error: "他のユーザーとしての操作はできません" },
        { status: 403 }
      );
    }
    const result = await submitIdeas(staffEmail, ideas);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Idea submit error:", e);
    return NextResponse.json(
      { error: "アイディアの投稿に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();

    if (body.category !== undefined) {
      const result = await updateIdeaCategory(body.id, body.category);
      return NextResponse.json(result);
    }

    const doneByEmail = body.doneBy || session!.user.email || "";
    const result = await toggleIdeaDone(body.id, doneByEmail);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Idea update error:", e);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    }
    const result = await deleteIdea(id);
    if (!result) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Idea delete error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
