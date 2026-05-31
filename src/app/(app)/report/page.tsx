"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { TimePicker } from "@/modules/attendance/components/time-picker";
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
import { Separator } from "@/components/ui/separator";
import type { WorkStyle } from "@/types/attendance";
import type { ReportImage } from "@/types/report";

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

interface ShiftInput {
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  transportCost: string;
  workStyle: WorkStyle;
}

const DEFAULT_SHIFT: ShiftInput = {
  clockIn: "09:00",
  clockOut: "18:00",
  breakMinutes: 0,
  transportCost: "0",
  workStyle: "office",
};

export default function ReportPage() {
  const { currentUser } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const [date, setDate] = useState(today);
  const [shifts, setShifts] = useState<ShiftInput[]>([{ ...DEFAULT_SHIFT }]);
  const [todaysPlan, setTodaysPlan] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [goodPoints, setGoodPoints] = useState("");
  const [reflections, setReflections] = useState("");
  const [ideas, setIdeas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<ReportImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 日付変更時に既存データを読み込む
  useEffect(() => {
    if (!currentUser) return;
    const email = encodeURIComponent(currentUser.email);

    // 勤怠の既存シフトを読み込み
    fetch(`/api/attendance?email=${email}&date=${date}`)
      .then((r) => r.json())
      .then((existing: { clockIn: string; clockOut: string; breakMinutes: number; transportCost: number; workStyle: WorkStyle }[]) => {
        if (Array.isArray(existing) && existing.length > 0) {
          setShifts(
            existing.map((a) => ({
              clockIn: a.clockIn,
              clockOut: a.clockOut,
              breakMinutes: a.breakMinutes,
              transportCost: String(a.transportCost),
              workStyle: a.workStyle,
            }))
          );
        } else {
          setShifts([{ ...DEFAULT_SHIFT }]);
        }
      })
      .catch(() => setShifts([{ ...DEFAULT_SHIFT }]));

    // 日報の既存データを読み込み
    fetch(`/api/reports?email=${email}&date=${date}`)
      .then((r) => r.json())
      .then((report: { todaysPlan?: string; workDone?: string; goodPoints?: string; reflections?: string } | null) => {
        if (report) {
          setTodaysPlan(report.todaysPlan ?? "");
          setWorkDone(report.workDone ?? "");
          setGoodPoints(report.goodPoints ?? "");
          setReflections(report.reflections ?? "");
        } else {
          setTodaysPlan("");
          setWorkDone("");
          setGoodPoints("");
          setReflections("");
        }
      })
      .catch(() => {});

    // 画像を読み込み
    fetch(`/api/report-images?email=${email}&date=${date}`)
      .then((r) => r.json())
      .then((imgs: ReportImage[]) => {
        setImages(Array.isArray(imgs) ? imgs : []);
      })
      .catch(() => setImages([]));
  }, [date, currentUser]);

  const shiftWorkHours = useMemo(
    () => shifts.map((s) => calcWorkHours(s.clockIn, s.clockOut, s.breakMinutes)),
    [shifts]
  );
  const totalWorkHours = shiftWorkHours.reduce((sum, h) => sum + h, 0);
  const hasRemoteShift = shifts.some((s) => s.workStyle === "remote");

  const updateShift = (index: number, field: keyof ShiftInput, value: string | number) => {
    setShifts((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addShift = () => {
    setShifts((prev) => [...prev, { ...DEFAULT_SHIFT }]);
  };

  const removeShift = (index: number) => {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} は5MBを超えています`);
          continue;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // data:image/png;base64,XXXX の "XXXX" 部分を取得
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/report-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffEmail: currentUser.email,
            date,
            base64,
            fileName: file.name,
            mimeType: file.type,
          }),
        });

        if (!res.ok) throw new Error("upload failed");
        const newImage = await res.json();
        setImages((prev) => [...prev, newImage]);
      }
      toast.success("画像をアップロードしました");
    } catch {
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageDelete = async (imageId: string) => {
    try {
      const res = await fetch(`/api/report-images?id=${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("画像を削除しました");
    } catch {
      toast.error("画像の削除に失敗しました");
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      const [attRes, repRes] = await Promise.all([
        fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffEmail: currentUser.email,
            date,
            shifts: shifts.map((s) => ({
              date,
              clockIn: s.clockIn,
              clockOut: s.clockOut,
              breakMinutes: s.breakMinutes,
              transportCost: Number(s.transportCost),
              workStyle: s.workStyle,
            })),
          }),
        }),
        fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffEmail: currentUser.email,
            data: {
              date,
              todaysPlan: hasRemoteShift ? todaysPlan : "",
              workDone,
              goodPoints,
              reflections,
              ideas,
            },
          }),
        }),
      ]);

      if (!attRes.ok || !repRes.ok) throw new Error("save failed");
      toast.success("日報を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">日報を入力する</h2>
          <p className="text-muted-foreground">
            {format(new Date(date), "yyyy年M月d日（E）", { locale: ja })}
          </p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>勤怠</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shifts.map((shift, index) => (
            <div
              key={index}
              className={`space-y-4 ${shifts.length > 1 ? "border rounded-lg p-4" : ""}`}
            >
              {shifts.length > 1 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    シフト {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-6 px-2"
                    onClick={() => removeShift(index)}
                  >
                    ✕
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <TimePicker
                  label="出勤時間"
                  value={shift.clockIn}
                  onChange={(v) => updateShift(index, "clockIn", v)}
                />
                <TimePicker
                  label="退勤時間"
                  value={shift.clockOut}
                  onChange={(v) => updateShift(index, "clockOut", v)}
                />
              </div>

              <div className="space-y-1">
                <Label>休憩時間</Label>
                <Select
                  value={String(shift.breakMinutes)}
                  onValueChange={(v) => updateShift(index, "breakMinutes", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {shift.breakMinutes === 0 ? "なし" : `${shift.breakMinutes}分`}
                    </SelectValue>
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
                <span className="text-lg font-semibold">{shiftWorkHours[index]} 時間</span>
                {shift.breakMinutes > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    （休憩 {shift.breakMinutes}分 差引済み）
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
                    value={shift.transportCost}
                    onChange={(e) => updateShift(index, "transportCost", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>勤務スタイル</Label>
                  <Select
                    value={shift.workStyle}
                    onValueChange={(v) => v && updateShift(index, "workStyle", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択">
                        {shift.workStyle === "office" ? "出勤" : "在宅"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">出勤</SelectItem>
                      <SelectItem value="remote">在宅</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addShift} className="w-full">
            ＋ シフトを追加
          </Button>

          {shifts.length > 1 && (
            <div className="p-3 bg-primary/10 rounded-md">
              <span className="text-sm text-muted-foreground">合計勤務時間：</span>
              <span className="text-lg font-semibold">{totalWorkHours} 時間</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>業務報告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasRemoteShift && (
            <div className="space-y-1">
              <Label>今日の作業の内容</Label>
              <p className="text-xs text-muted-foreground mb-1">在宅での出勤時に記入</p>
              <Textarea
                placeholder="在宅勤務で取り組む内容を記入..."
                value={todaysPlan}
                onChange={(e) => setTodaysPlan(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>今日の作業報告</Label>
            <p className="text-xs text-muted-foreground mb-1">勤務終了前に記入</p>
            <Textarea
              placeholder="今日行った作業を記入..."
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-1">
            <Label>今日の良かった点</Label>
            <p className="text-xs text-muted-foreground mb-1">勤務終了前に記入</p>
            <Textarea
              placeholder="良かった点を記入..."
              value={goodPoints}
              onChange={(e) => setGoodPoints(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>アイディア・要望・改善</Label>
            <Textarea
              placeholder="アイディアや要望、改善点を記入..."
              value={reflections}
              onChange={(e) => setReflections(e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          <div className="space-y-1">
            <Label>アイディア・要望</Label>
            <Textarea
              placeholder="アイディアや要望を記入（複数ある場合は改行で区切る）..."
              value={ideas}
              onChange={(e) => setIdeas(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              改行ごとに1件のアイディアとして登録されます
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>画像・キャプチャ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "アップロード中..." : "画像を選択してアップロード"}
            </Button>
            <p className="text-xs text-muted-foreground">
              画像ファイル（PNG, JPG等）をアップロードできます（1ファイル5MBまで）
            </p>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative group border rounded-lg overflow-hidden"
                >
                  <img
                    src={img.viewUrl}
                    alt={img.fileName}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleImageDelete(img.id)}
                    >
                      削除
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground p-1 truncate">
                    {img.fileName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitting || !workDone.trim()}
        className="w-full"
        size="lg"
      >
        {submitting ? "保存中..." : "保存する"}
      </Button>
    </div>
  );
}
