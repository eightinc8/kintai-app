import { NextResponse } from "next/server";
import {
  getImagesByDate,
  getImagesByEmail,
  getAllImages,
  uploadReportImage,
  deleteReportImage,
} from "@/modules/daily-report/services/image-service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const date = searchParams.get("date");

    if (email && date) {
      const images = await getImagesByDate(email, date);
      return NextResponse.json(images);
    }

    if (email) {
      const images = await getImagesByEmail(email);
      return NextResponse.json(images);
    }

    // 全件取得（管理者向け）
    const images = await getAllImages();
    return NextResponse.json(images);
  } catch (e) {
    console.error("Report images fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { staffEmail, date, base64, fileName, mimeType } =
      await request.json();

    if (staffEmail !== session!.user.email) {
      return NextResponse.json(
        { error: "他のユーザーとしての操作はできません" },
        { status: 403 }
      );
    }

    if (!base64 || !fileName) {
      return NextResponse.json(
        { error: "ファイルデータが必要です" },
        { status: 400 }
      );
    }

    const image = await uploadReportImage(
      staffEmail,
      date,
      base64,
      fileName,
      mimeType || "image/png"
    );
    return NextResponse.json(image);
  } catch (e) {
    console.error("Image upload error:", e);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    }

    const success = await deleteReportImage(id);
    if (!success) {
      return NextResponse.json(
        { error: "画像が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Image delete error:", e);
    return NextResponse.json(
      { error: "削除に失敗しました" },
      { status: 500 }
    );
  }
}
