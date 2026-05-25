"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { TimePicker } from "@/modules/attendance/components/time-picker";
import { toast } from "sonner";
import type { DailyReport, ReportImage } from "@/types/report";
import type { Staff } from "@/types/user";
import type { Attendance, WorkStyle } from "@/types/attendance";

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

export default function AdminReportsPage() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [reportImages, setReportImages] = useState<ReportImage[]>([]);
  const [filterEmail, setFilterEmail] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<DailyReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editReport, setEditReport] = useState<DailyReport | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editBreakMinutes, setEditBreakMinutes] = useState(0);
  const [editTransport, setEditTransport] = useState("0");
  const [editWorkStyle, setEditWorkStyle] = useState<WorkStyle>("office");
  const [editTodaysPlan, setEditTodaysPlan] = useState("");
  const [editWorkDone, setEditWorkDone] = useState("");
  const [editGoodPoints, setEditGoodPoints] = useState("");
  const [editReflections, setEditReflections] = useState("");

  const monthStr = format(currentMonth, "yyyy-MM");

  const editWorkHours = useMemo(
    () => calcWorkHours(editClockIn, editClockOut, editBreakMinutes),
    [editClockIn, editClockOut, editBreakMinutes]
  );

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/reports").then((r) => r.json()).then(setReports).catch(() => {}),
      fetch(`/api/attendance?month=${monthStr}`).then((r) => r.json()).then(setAttendance).catch(() => {}),
      fetch("/api/staff").then((r) => r.json()).then(setStaffList).catch(() => {}),
      fetch("/api/report-images")
        .then((r) => r.json())
        .then((imgs: ReportImage[]) => setReportImages(Array.isArray(imgs) ? imgs : []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [monthStr]);

  if (currentUser?.role !== "admin") {
    return <p className="text-muted-foreground">管理者のみアクセスできます。</p>;
  }

  const filtered = reports
    .filter((r) => r.date.startsWith(monthStr))
    .filter((r) => filterEmail === "all" || r.staffEmail === filterEmail)
    .sort((a, b) => b.date.localeCompare(a.date));

  const staffName = (email: string) =>
    staffList.find((s) => s.email === email)?.name ?? email;

  const getAttendances = (email: string, date: string) =>
    attendance.filter((a) => a.staffEmail === email && a.date === date);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reports?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("日報を削除しました");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (report: DailyReport) => {
    const atts = getAttendances(report.staffEmail, report.date);
    const att = atts.length > 0 ? atts[0] : null;
    setEditReport(report);
    setEditClockIn(att?.clockIn ?? "09:00");
    setEditClockOut(att?.clockOut ?? "18:00");
    setEditBreakMinutes(att?.breakMinutes ?? 0);
    setEditTransport(String(att?.transportCost ?? 0));
    setEditWorkStyle(att?.workStyle ?? "office");
    setEditTodaysPlan(report.todaysPlan ?? "");
    setEditWorkDone(report.workDone ?? "");
    setEditGoodPoints(report.goodPoints ?? "");
    setEditReflections(report.reflections ?? "");
  };

  const saveEdit = async () => {
    if (!editReport) return;
    setSaving(true);
    try {
      const atts = getAttendances(editReport.staffEmail, editReport.date);
      const att = atts.length > 0 ? atts[0] : null;
      const promises: Promise<Response>[] = [];

      // Update attendance (first shift only)
      if (att) {
        promises.push(
          fetch("/api/attendance", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: att.id,
              data: {
                date: att.date,
                clockIn: editClockIn,
                clockOut: editClockOut,
                breakMinutes: editBreakMinutes,
                transportCost: Number(editTransport),
                workStyle: editWorkStyle,
              },
            }),
          })
        );
      }

      // Update report
      promises.push(
        fetch("/api/reports", {
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
        })
      );

      const results = await Promise.all(promises);
      if (results.some((r) => !r.ok)) throw new Error();
      toast.success("更新しました");
      setEditReport(null);
      load();
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async (reportId: string) => {
    const comment = commentMap[reportId];
    if (!comment?.trim() || !currentUser) return;
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, comment, adminEmail: currentUser.email }),
      });
      if (!res.ok) throw new Error("comment failed");
      toast.success("コメントを保存しました");
      setCommentMap((prev) => ({ ...prev, [reportId]: "" }));
      load();
    } catch {
      toast.error("コメントの保存に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold">日報一覧</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              ◀
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              ▶
            </Button>
          </div>
          <Select value={filterEmail} onValueChange={(v) => v && setFilterEmail(v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="スタッフ絞り込み">
                {filterEmail === "all" ? "全員" : staffName(filterEmail)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全員</SelectItem>
              {staffList.map((s) => (
                <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground">{loading ? "只今読み込み中です" : "日報がありません。"}</p>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {deleteTarget && `${staffName(deleteTarget.staffEmail)}の${format(new Date(deleteTarget.date), "M月d日", { locale: ja })}の日報を削除しますか？`}
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

      {/* Edit Dialog */}
      <Dialog open={editReport !== null} onOpenChange={(open) => { if (!open) setEditReport(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              編集 - {editReport && `${staffName(editReport.staffEmail)} ${format(new Date(editReport.date), "M月d日", { locale: ja })}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* 勤怠セクション */}
            <div>
              <p className="text-sm font-semibold mb-3">勤怠情報</p>
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
            </div>

            <Separator />

            {/* 業務報告セクション */}
            <div>
              <p className="text-sm font-semibold mb-3">業務報告</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>今日のやること</Label>
                  <Textarea
                    value={editTodaysPlan}
                    onChange={(e) => setEditTodaysPlan(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label>作業内容</Label>
                  <Textarea
                    value={editWorkDone}
                    onChange={(e) => setEditWorkDone(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label>良かった点</Label>
                  <Textarea
                    value={editGoodPoints}
                    onChange={(e) => setEditGoodPoints(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label>反省・改善点</Label>
                  <Textarea
                    value={editReflections}
                    onChange={(e) => setEditReflections(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReport(null)}>キャンセル</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filtered.map((report) => (
        <Card key={report.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">
                {staffName(report.staffEmail)} - {format(new Date(report.date), "yyyy年M月d日（E）", { locale: ja })}
              </CardTitle>
              <div className="flex items-center gap-2">
                {report.adminComment && <Badge>コメント済み</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(report)}
                >
                  編集
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(report)}
                >
                  削除
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const atts = getAttendances(report.staffEmail, report.date);
              return atts.length > 0 ? (
                <div className="space-y-1">
                  {atts.map((att, i) => (
                    <div key={att.id} className="flex items-center gap-4 text-sm p-2 bg-muted/50 rounded-md flex-wrap">
                      {atts.length > 1 && (
                        <span className="text-xs text-muted-foreground">シフト {i + 1}</span>
                      )}
                      <div>
                        <span className="text-muted-foreground">出勤 </span>
                        <span className="font-medium">{att.clockIn}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">退勤 </span>
                        <span className="font-medium">{att.clockOut}</span>
                      </div>
                      {att.breakMinutes > 0 && (
                        <div>
                          <span className="text-muted-foreground">休憩 </span>
                          <span className="font-medium">{att.breakMinutes}分</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">合計 </span>
                        <span className="font-semibold">{att.workHours}時間</span>
                      </div>
                      <Badge variant="outline">
                        {att.workStyle === "office" ? "出勤" : "在宅"}
                      </Badge>
                    </div>
                  ))}
                  {atts.length > 1 && (
                    <div className="text-sm text-muted-foreground pl-2">
                      合計：{atts.reduce((s, a) => s + a.workHours, 0)} 時間
                    </div>
                  )}
                </div>
              ) : null;
            })()}
            {report.todaysPlan && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">今日のやること</p>
                <p className="text-sm whitespace-pre-wrap">{report.todaysPlan}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">作業内容</p>
              <p className="text-sm whitespace-pre-wrap">{report.workDone}</p>
            </div>
            {report.goodPoints && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">良かった点</p>
                <p className="text-sm whitespace-pre-wrap">{report.goodPoints}</p>
              </div>
            )}
            {report.reflections && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">反省・改善点</p>
                <p className="text-sm whitespace-pre-wrap">{report.reflections}</p>
              </div>
            )}

            {(() => {
              const imgs = reportImages.filter(
                (img) => img.staffEmail === report.staffEmail && img.date === report.date
              );
              return imgs.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">添付画像</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imgs.map((img) => (
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
              ) : null;
            })()}

            {report.adminComment && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs font-semibold text-muted-foreground">管理者コメント</p>
                <p className="text-sm whitespace-pre-wrap">{report.adminComment}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="コメントを入力..."
                value={commentMap[report.id] ?? ""}
                onChange={(e) => setCommentMap((prev) => ({ ...prev, [report.id]: e.target.value }))}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={() => handleComment(report.id)}
                disabled={!commentMap[report.id]?.trim()}
                size="sm"
                className="self-end"
              >
                送信
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
