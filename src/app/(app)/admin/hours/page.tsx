"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimePicker } from "@/modules/attendance/components/time-picker";
import type { Attendance, WorkStyle } from "@/types/attendance";
import type { Staff } from "@/types/user";

function calcWorkHours(clockIn: string, clockOut: string, breakMinutes: number = 0): number {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  totalMinutes -= breakMinutes;
  if (totalMinutes < 0) totalMinutes = 0;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

const BREAK_OPTIONS = Array.from({ length: 25 }, (_, i) => i * 5);

export default function HoursPage() {
  const { currentUser } = useAuth();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const [editAtt, setEditAtt] = useState<Attendance | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editBreakMinutes, setEditBreakMinutes] = useState(0);
  const [editTransport, setEditTransport] = useState("0");
  const [editWorkStyle, setEditWorkStyle] = useState<WorkStyle>("office");
  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/attendance?month=${month}`)
        .then((r) => r.json())
        .then(setAttendance)
        .catch(() => {}),
      fetch("/api/staff")
        .then((r) => r.json())
        .then(setStaffList)
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [month]);

  const editWorkHours = useMemo(
    () => calcWorkHours(editClockIn, editClockOut, editBreakMinutes),
    [editClockIn, editClockOut, editBreakMinutes]
  );

  if (currentUser?.role !== "admin") {
    return <p className="text-muted-foreground">管理者のみアクセスできます。</p>;
  }

  const staffName = (email: string) =>
    staffList.find((s) => s.email === email)?.name ?? email;

  const staffSummary = staffList.map((staff) => {
    const records = attendance.filter((a) => a.staffEmail === staff.email);
    return {
      name: staff.name,
      email: staff.email,
      totalDays: new Set(records.map((a) => a.date)).size,
      officeDays: new Set(records.filter((a) => a.workStyle === "office").map((a) => a.date)).size,
      remoteDays: new Set(records.filter((a) => a.workStyle === "remote").map((a) => a.date)).size,
      totalHours: records.reduce((s, a) => s + a.workHours, 0),
      totalTransport: records.reduce((s, a) => s + a.transportCost, 0),
    };
  });

  const detailRecords = [...attendance].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.staffEmail.localeCompare(b.staffEmail);
  });

  const openEdit = (att: Attendance) => {
    setEditAtt(att);
    setEditClockIn(att.clockIn);
    setEditClockOut(att.clockOut);
    setEditBreakMinutes(att.breakMinutes);
    setEditTransport(String(att.transportCost));
    setEditWorkStyle(att.workStyle);
  };

  const saveAttendance = async () => {
    if (!editAtt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editAtt.id,
          data: {
            date: editAtt.date,
            clockIn: editClockIn,
            clockOut: editClockOut,
            breakMinutes: editBreakMinutes,
            transportCost: Number(editTransport),
            workStyle: editWorkStyle,
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("勤怠を更新しました");
      setEditAtt(null);
      load();
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/attendance?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("削除しました");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">勤務時間集計</h2>
        <div className="flex items-center gap-2">
          <Label>月選択</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">サマリー</TabsTrigger>
          <TabsTrigger value="detail">明細</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead className="text-right">出勤日</TableHead>
                    <TableHead className="text-right">在宅日</TableHead>
                    <TableHead className="text-right">合計日数</TableHead>
                    <TableHead className="text-right">合計時間</TableHead>
                    <TableHead className="text-right">交通費</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffSummary.map((s) => (
                    <TableRow key={s.email}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.officeDays} 日</TableCell>
                      <TableCell className="text-right">{s.remoteDays} 日</TableCell>
                      <TableCell className="text-right">{s.totalDays} 日</TableCell>
                      <TableCell className="text-right">{s.totalHours} 時間</TableCell>
                      <TableCell className="text-right">{s.totalTransport.toLocaleString()} 円</TableCell>
                    </TableRow>
                  ))}
                  {staffSummary.length > 0 && (
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>合計</TableCell>
                      <TableCell className="text-right">{staffSummary.reduce((s, r) => s + r.officeDays, 0)} 日</TableCell>
                      <TableCell className="text-right">{staffSummary.reduce((s, r) => s + r.remoteDays, 0)} 日</TableCell>
                      <TableCell className="text-right">{staffSummary.reduce((s, r) => s + r.totalDays, 0)} 日</TableCell>
                      <TableCell className="text-right">{staffSummary.reduce((s, r) => s + r.totalHours, 0)} 時間</TableCell>
                      <TableCell className="text-right">{staffSummary.reduce((s, r) => s + r.totalTransport, 0).toLocaleString()} 円</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>名前</TableHead>
                    <TableHead>出勤</TableHead>
                    <TableHead>退勤</TableHead>
                    <TableHead className="text-right">休憩</TableHead>
                    <TableHead className="text-right">時間</TableHead>
                    <TableHead>スタイル</TableHead>
                    <TableHead className="text-right">交通費</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailRecords.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell>{format(new Date(att.date), "M/d（E）", { locale: ja })}</TableCell>
                      <TableCell className="font-medium">{staffName(att.staffEmail)}</TableCell>
                      <TableCell>{att.clockIn}</TableCell>
                      <TableCell>{att.clockOut}</TableCell>
                      <TableCell className="text-right">{att.breakMinutes > 0 ? `${att.breakMinutes}分` : "-"}</TableCell>
                      <TableCell className="text-right">{att.workHours}h</TableCell>
                      <TableCell>{att.workStyle === "office" ? "出勤" : "在宅"}</TableCell>
                      <TableCell className="text-right">{att.transportCost.toLocaleString()}円</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(att)}>
                            編集
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(att)}
                          >
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {detailRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {loading ? "只今読み込み中です" : "データがありません"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editAtt !== null} onOpenChange={(open) => { if (!open) setEditAtt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              勤怠を編集 - {editAtt && `${staffName(editAtt.staffEmail)} ${format(new Date(editAtt.date), "M月d日", { locale: ja })}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TimePicker label="出勤時間" value={editClockIn} onChange={setEditClockIn} />
              <TimePicker label="退勤時間" value={editClockOut} onChange={setEditClockOut} />
            </div>
            <div className="space-y-1">
              <Label>休憩時間</Label>
              <Select value={String(editBreakMinutes)} onValueChange={(v) => setEditBreakMinutes(Number(v))}>
                <SelectTrigger>
                  <SelectValue>{editBreakMinutes === 0 ? "なし" : `${editBreakMinutes}分`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BREAK_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m === 0 ? "なし" : `${m}分`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">勤務時間：</span>
              <span className="text-lg font-semibold">{editWorkHours} 時間</span>
              {editBreakMinutes > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  （休憩 {editBreakMinutes}分 差引済み）
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>交通費（円）</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={editTransport}
                  onChange={(e) => setEditTransport(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>勤務スタイル</Label>
                <Select value={editWorkStyle} onValueChange={(v) => v && setEditWorkStyle(v as WorkStyle)}>
                  <SelectTrigger>
                    <SelectValue>{editWorkStyle === "office" ? "出勤" : "在宅"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">出勤</SelectItem>
                    <SelectItem value="remote">在宅</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAtt(null)}>キャンセル</Button>
            <Button onClick={saveAttendance} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {deleteTarget && `${staffName(deleteTarget.staffEmail)}の${format(new Date(deleteTarget.date), "M月d日", { locale: ja })}の勤怠データを削除しますか？`}
            この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
