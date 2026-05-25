"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Staff, UserRole } from "@/types/user";

function calcTenure(startMonth: string): string {
  if (!startMonth) return "";
  const ym = startMonth.substring(0, 7);
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return "";
  const now = new Date();
  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - m;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "";
  if (years === 0) return `${months}か月`;
  if (months === 0) return `${years}年`;
  return `${years}年${months}か月`;
}

function formatStartMonth(value: string): string {
  if (!value) return "";
  return value.substring(0, 7);
}

interface EditFormData {
  name: string;
  nameKana: string;
  email: string;
  role: string;
  startMonth: string;
  address: string;
  phone: string;
  birthday: string;
  familyComposition: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2">
      <dt className="text-sm text-muted-foreground w-32 shrink-0">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}

export default function StaffDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const staffId = params.id as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditFormData>({
    name: "",
    nameKana: "",
    email: "",
    role: "staff",
    startMonth: "",
    address: "",
    phone: "",
    birthday: "",
    familyComposition: "",
  });

  const load = () => {
    setLoading(true);
    fetch(`/api/staff/${staffId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setStaff)
      .catch(() => setStaff(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (staffId) load();
  }, [staffId]);

  if (currentUser?.role !== "admin") {
    return <p className="text-muted-foreground">管理者のみアクセスできます。</p>;
  }

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (!staff) {
    return (
      <div className="space-y-4">
        <Link href="/admin/staff" className="text-sm text-primary hover:underline">
          ← スタッフ一覧に戻る
        </Link>
        <p className="text-muted-foreground">スタッフが見つかりませんでした。</p>
      </div>
    );
  }

  const openEdit = () => {
    setForm({
      name: staff.name,
      nameKana: staff.nameKana,
      email: staff.email,
      role: staff.role,
      startMonth: formatStartMonth(staff.startMonth),
      address: staff.address,
      phone: staff.phone,
      birthday: staff.birthday,
      familyComposition: staff.familyComposition,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("update failed");
      toast.success("スタッフ情報を更新しました");
      setEditOpen(false);
      load();
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/admin/staff" className="text-sm text-primary hover:underline">
            ← スタッフ一覧に戻る
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{staff.name}</h2>
            <Badge variant={staff.role === "admin" ? "default" : "secondary"}>
              {staff.role === "admin" ? "管理者" : "スタッフ"}
            </Badge>
          </div>
        </div>
        <Button onClick={openEdit}>編集</Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <InfoRow label="名前" value={staff.name} />
            <InfoRow label="かな" value={staff.nameKana} />
            <InfoRow label="メール" value={staff.email} />
            <InfoRow label="権限" value={staff.role === "admin" ? "管理者" : "スタッフ"} />
            <InfoRow label="勤務開始月" value={formatStartMonth(staff.startMonth)} />
            <InfoRow label="在籍期間" value={calcTenure(staff.startMonth)} />
          </dl>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">連絡先</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <InfoRow label="電話番号" value={staff.phone} />
            <InfoRow label="住所" value={staff.address} />
          </dl>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">個人情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <InfoRow label="生年月日" value={staff.birthday} />
            <InfoRow label="家族構成" value={staff.familyComposition} />
          </dl>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>スタッフ情報を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>名前</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>かな</Label>
              <Input
                value={form.nameKana}
                onChange={(e) => setForm({ ...form, nameKana: e.target.value })}
              />
            </div>
            <div>
              <Label>メールアドレス（Googleアカウント）</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>権限</Label>
              <Select
                value={form.role}
                onValueChange={(v) => v && setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.role === "admin" ? "管理者" : "スタッフ"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="staff">スタッフ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>勤務開始月</Label>
              <Input
                type="month"
                value={form.startMonth}
                onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
              />
            </div>

            <Separator />

            <div>
              <Label>電話番号</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>住所</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <Separator />

            <div>
              <Label>生年月日</Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              />
            </div>
            <div>
              <Label>家族構成</Label>
              <Textarea
                value={form.familyComposition}
                onChange={(e) =>
                  setForm({ ...form, familyComposition: e.target.value })
                }
                placeholder="例：妻、子供2人"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.email}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
