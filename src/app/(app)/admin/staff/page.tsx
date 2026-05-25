"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Staff, UserRole } from "@/types/user";

function formatStartMonth(value: string): string {
  if (!value) return "";
  // "2022-01-01" → "2022-01", "2022-01" → "2022-01"
  return value.substring(0, 7);
}

function calcTenure(startMonth: string): string {
  if (!startMonth) return "";
  const ym = startMonth.substring(0, 7); // "YYYY-MM"
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

interface StaffFormData {
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

export default function StaffPage() {
  const { currentUser } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StaffFormData>({
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
    fetch("/api/staff")
      .then((r) => r.json())
      .then(setStaffList)
      .catch(() => {});
  };
  useEffect(() => { load(); }, []);

  if (currentUser?.role !== "admin") {
    return <p className="text-muted-foreground">管理者のみアクセスできます。</p>;
  }

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("create failed");
      toast.success("スタッフを登録しました");
      setOpen(false);
      setForm({ name: "", nameKana: "", email: "", role: "staff", startMonth: "", address: "", phone: "", birthday: "", familyComposition: "" });
      load();
    } catch {
      toast.error("登録に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">スタッフ管理</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>新規登録</DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>スタッフ新規登録</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>名前</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>かな</Label>
                <Input value={form.nameKana} onChange={(e) => setForm({ ...form, nameKana: e.target.value })} />
              </div>
              <div>
                <Label>メールアドレス（Googleアカウント）</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>権限</Label>
                <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue>{form.role === "admin" ? "管理者" : "スタッフ"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="staff">スタッフ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>勤務開始月</Label>
                <Input type="month" value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} />
              </div>
              <div>
                <Label>住所</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>電話番号</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>生年月日</Label>
                <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
              </div>
              <div>
                <Label>家族構成</Label>
                <Textarea value={form.familyComposition} onChange={(e) => setForm({ ...form, familyComposition: e.target.value })} placeholder="例：妻、子供2人" />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.name || !form.email}>登録する</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>かな</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>開始月</TableHead>
                <TableHead>在籍期間</TableHead>
                <TableHead>電話番号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/staff/${s.id}`} className="text-primary hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.nameKana}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    <Badge variant={s.role === "admin" ? "default" : "secondary"}>
                      {s.role === "admin" ? "管理者" : "スタッフ"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatStartMonth(s.startMonth)}</TableCell>
                  <TableCell>{calcTenure(s.startMonth)}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
