import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.staffId) {
    return { session: null, error: NextResponse.json({ error: "認証が必要です" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (session!.user.role !== "admin") {
    return { session: null, error: NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 }) };
  }
  return { session, error: null };
}
