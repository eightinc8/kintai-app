"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { TimePicker } from "@/modules/attendance/components/time-picker";
import type { Attendance, WorkStyle } from "@/types/attendance";
import type { DailyReport, ReportImage } from "@/types/report";

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

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [reportImages, setReportImages] = useState<ReportImage[]>([]);

  const [editAtt, setEditAtt] = useState<Attendance | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editBreakMinutes, setEditBreakMinutes] = useState(0);
  const [editTransport, setEditTransport] = useState("0");
  const [editWorkStyle, setEditWorkStyle] = useState<WorkStyle>("office");

  const [editReport, setEditReport] = useState<DailyReport | null>(null);
  const [editTodaysPlan, setEditTodaysPlan] = useState("");
  const [editWorkDone, setEditWorkDone] = useState("");
  const [editGoodPoints, setEditGoodPoints] = useState("");
  const [editReflections, setEditReflections] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ type: "attendance" | "report"; id: string; date: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!currentUser) return;
    setLoading(true);
    const email = encodeURIComponent(currentUser.email);
    Promise.all([
      fetch(`/api/attendance?email=${email}&month=${month}`)
        .then((r) => r.json())
        .then(setAttendance)
        .catch(() => {}),
      fetch("/api/reports")
        .then((r) => r.json())
        .then((all: DailyReport[]) => {
          setReports(
            all.filter(
              (r) => r.staffEmail === currentUser.email && r.date.startsWith(month)
            )
          );
        })
        .catch(() => {}),
      fetch(`/api/report-images?email=${email}`)
        .then((r) => r.json())
        .then((imgs: ReportImage[]) => {
          setReportImages(
            Array.isArray(imgs)
              ? imgs.filter((img) => img.date.startsWith(month))
              : []
          );
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [currentUser, month]);

  const combined = useMemo(() => {
    const dates = new Set([
      ...attendance.map((a) => a.date),
      ...reports.map((r) => r.date),
      ...reportImages.map((img) => img.date),
    ]);
    return Array.from(dates)
      .sort()
      .reverse()
      .map((date) => ({
        date,
        attendances: attendance.filter((a) => a.date === date),
        report: reports.find((r) => r.date === date),
        images: reportImages.filter((img) => img.date === date),
      }));
  }, [attendance, reports, reportImages]);

  const openEditAttendance = (att: Attendance) => {
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

  const openEditReport = (report: DailyReport) => {
    setEditReport(report);
    setEditTodaysPlan(report.todaysPlan);
    setEditWorkDone(report.workDone);
    setEditGoodPoints(report.goodPoints);
    setEditReflections(report.reflections);
  };

  const saveReport = async () => {
    if (!editReport) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editReport.id,
          data: {
            todaysPlan: editTodaysPlan,
            workDone: editWorkDone,
            goodPoints: editGoodPoints,
            reflections: editReflections,
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("日報を更新しました");
      setEditReport(null);
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
      const endpoint = deleteTarget.type === "attendance" ? "/api/attendance" : "/api/reports";
      const res = await fetch(`${endpoint}?id=${deleteTarget.id}`, { method: "DELETE" });
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

  const editWorkHours = useMemo(
    () => calcWorkHours(editClockIn, editClockOut, editBreakMinutes),
    [editClockIn, editClockOut, editBreakMinutes]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">勤怠履歴</h2>
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

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {new Set(attendance.map((a) => a.date)).size} 日
            </p>
            <p className="text-xs text-muted-foreground">出勤日数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {attendance.reduce((s, a) => s + a.workHours, 0)} 時間
            </p>
            <p className="text-xs text-muted-foreground">合計勤務時間</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {attendance.reduce((s, a) => s + a.transportCost, 0).toLocaleString()} 円
            </p>
            <p className="text-xs text-muted-foreground">交通費合計</p>
          </CardContent>
        </Card>
      </div>

      {combined.length === 0 && (
        <p className="text-muted-foreground">{loading ? "只今読み込み中です" : "データがありません。"}</p>
      )}

      {combined.map(({ date, attendances, report, images }) => (
        <Card key={date}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {format(new Date(date), "M月d日（E）", { locale: ja })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendances.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">勤怠</p>
                {attendances.map((att, i) => (
                  <div key={att.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      {attendances.length > 1 && (
                        <p className="text-xs text-muted-foreground">シフト {i + 1}</p>
                      )}
                      <div className="flex gap-1 ml-auto">
                        <Button variant="outline" size="sm" onClick={() => openEditAttendance(att)}>
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteTarget({ type: "attendance", id: att.id, date: att.date })}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium w-24">出勤</TableCell>
                          <TableCell>{att.clockIn}</TableCell>
                          <TableCell className="font-medium w-24">退勤</TableCell>
                          <TableCell>{att.clockOut}</TableCell>
                          <TableCell className="font-medium w-24">時間</TableCell>
                          <TableCell>{att.workHours}h</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">休憩</TableCell>
                          <TableCell>{att.breakMinutes > 0 ? `${att.breakMinutes}分` : "なし"}</TableCell>
                          <TableCell className="font-medium">スタイル</TableCell>
                          <TableCell>{att.workStyle === "office" ? "出勤" : "在宅"}</TableCell>
                          <TableCell className="font-medium">交通費</TableCell>
                          <TableCell>{att.transportCost.toLocaleString()}円</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ))}
                {attendances.length > 1 && (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    <span className="text-muted-foreground">合計：</span>
                    <span className="font-semibold">
                      {attendances.reduce((s, a) => s + a.workHours, 0)} 時間
                    </span>
                  </div>
                )}
              </div>
            )}

            {report && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">日報</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEditReport(report)}>
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget({ type: "report", id: report.id, date: report.date })}
                    >
                      削除
                    </Button>
                  </div>
                </div>
                {report.todaysPlan && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">今日の作業の内容</p>
                    <p className="text-sm whitespace-pre-wrap">{report.todaysPlan}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">今日の作業報告</p>
                  <p className="text-sm whitespace-pre-wrap">{report.workDone}</p>
                </div>
                {report.goodPoints && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">今日の良かった点</p>
                    <p className="text-sm whitespace-pre-wrap">{report.goodPoints}</p>
                  </div>
                )}
                {report.reflections && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">アイディア・要望・改善</p>
                    <p className="text-sm whitespace-pre-wrap">{report.reflections}</p>
                  </div>
                )}
                {report.adminComment && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs font-semibold text-muted-foreground">管理者コメント</p>
                    <p className="text-sm whitespace-pre-wrap">{report.adminComment}</p>
                  </div>
                )}
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">添付画像</p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={img.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={img.viewUrl}
                        alt={img.fileName}
                        className="w-full h-24 object-cover"
                      />
                      <p className="text-xs text-muted-foreground p-1 truncate">
                        {img.fileName}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit Attendance Dialog */}
      <Dialog open={editAtt !== null} onOpenChange={(open) => { if (!open) setEditAtt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              勤怠を編集 - {editAtt && format(new Date(editAtt.date), "M月d日", { locale: ja })}
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

      {/* Edit Report Dialog */}
      <Dialog open={editReport !== null} onOpenChange={(open) => { if (!open) setEditReport(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              日報を編集 - {editReport && format(new Date(editReport.date), "M月d日", { locale: ja })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>今日の作業の内容</Label>
              <Textarea
                value={editTodaysPlan}
                onChange={(e) => setEditTodaysPlan(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>今日の作業報告</Label>
              <Textarea
                value={editWorkDone}
                onChange={(e) => setEditWorkDone(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>今日の良かった点</Label>
              <Textarea
                value={editGoodPoints}
                onChange={(e) => setEditGoodPoints(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>アイディア・要望・改善</Label>
              <Textarea
                value={editReflections}
                onChange={(e) => setEditReflections(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReport(null)}>キャンセル</Button>
            <Button onClick={saveReport} disabled={saving || !editWorkDone.trim()}>
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
            {deleteTarget?.date && format(new Date(deleteTarget.date), "M月d日", { locale: ja })}の
            {deleteTarget?.type === "attendance" ? "勤怠データ" : "日報"}を削除しますか？
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
