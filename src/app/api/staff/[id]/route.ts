import { NextResponse } from "next/server";
import { getStaffById, updateStaff, type StaffFormData } from "@/lib/staff-service";
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await ctx.params;
  try {
    const staff = await getStaffById(id);
    if (!staff) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json(staff);
  } catch (e) {
    console.error("Staff fetch error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  try {
    const data: Partial<StaffFormData> = await request.json();
    const updated = await updateStaff(id, data);
    if (!updated) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    console.error("Staff update error:", e);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
