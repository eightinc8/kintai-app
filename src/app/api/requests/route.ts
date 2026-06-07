import { NextResponse } from "next/server";
import {
  getAllRequests,
  createRequest,
  addRequestComment,
  toggleRequestDone,
  deleteRequest,
} from "@/modules/daily-report/services/request-service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const requests = await getAllRequests();
    return NextResponse.json(requests);
  } catch (e) {
    console.error("Requests fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { fromEmail, toEmail, content } = await request.json();
    if (fromEmail !== session!.user.email) {
      return NextResponse.json({ error: "不正な操作です" }, { status: 403 });
    }
    const result = await createRequest(fromEmail, toEmail, content);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Request create error:", e);
    return NextResponse.json({ error: "投稿に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();

    // コメント追加
    if (body.comment !== undefined) {
      const result = await addRequestComment(body.id, body.email, body.comment);
      return NextResponse.json(result);
    }

    // ステータス切替
    if (body.toggleDone) {
      const result = await toggleRequestDone(body.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "無効な操作です" }, { status: 400 });
  } catch (e) {
    console.error("Request update error:", e);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    }
    const result = await deleteRequest(id);
    if (!result) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Request delete error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
