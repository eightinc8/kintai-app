import { NextResponse } from "next/server";
import { getAllStaff, createStaff, type StaffFormData } from "@/lib/staff-service";
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const staff = await getAllStaff();
    return NextResponse.json(staff);
  } catch (e) {
    console.error("Staff fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const data: StaffFormData = await request.json();
    const staff = await createStaff(data);
    return NextResponse.json(staff);
  } catch (e) {
    console.error("Staff create error:", e);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
