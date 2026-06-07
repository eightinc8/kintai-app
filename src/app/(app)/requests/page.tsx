"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { StaffRequest } from "@/types/request";
import type { Staff } from "@/types/user";

export default function RequestsPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [filterView, setFilterView] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/requests").then((r) => r.json()).then(setRequests).catch(() => {}),
      fetch("/api/staff").then((r) => r.json()).then(setStaffList).catch(() => {}),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const staffName = (email: string) =>
    staffList.find((s) => s.email === email)?.name ?? email;

  const filtered = requests
    .filter((r) => {
      if (filterView === "from") return r.fromEmail === currentUser?.email;
      if (filterView === "to") return r.toEmail === currentUser?.email;
      return true;
    })
    .filter((r) => {
      if (filterStatus === "done") return r.isDone;
      if (filterStatus === "undone") return !r.isDone;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleComment = async (id: string) => {
    const text = commentMap[id];
    if (!text?.trim() || !currentUser) return;
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, comment: text, email: currentUser.email }),
      });
      if (!res.ok) throw new Error();
      toast.success("コメントを送信しました");
      setCommentMap((prev) => ({ ...prev, [id]: "" }));
      load();
    } catch {
      toast.error("送信に失敗しました");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, toggleDone: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("ステータスを更新しました");
      load();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお願いを削除しますか？")) return;
    try {
      const res = await fetch(`/api/requests?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("削除しました");
      load();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const myEmail = currentUser?.email;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold">お願い一覧</h2>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterView} onValueChange={(v) => { if (v) setFilterView(v); }}>
            <SelectTrigger className="w-36">
              <SelectValue>
                {filterView === "all" ? "すべて" : filterView === "from" ? "お願いした" : "お願いされた"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="from">お願いした</SelectItem>
              <SelectItem value="to">お願いされた</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { if (v) setFilterStatus(v); }}>
            <SelectTrigger className="w-28">
              <SelectValue>
                {filterStatus === "all" ? "すべて" : filterStatus === "done" ? "完了" : "未対応"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="undone">未対応</SelectItem>
              <SelectItem value="done">完了</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {requests.filter((r) => r.fromEmail === myEmail && !r.isDone).length}
            </p>
            <p className="text-xs text-muted-foreground">お願い中</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">
              {requests.filter((r) => r.toEmail === myEmail && !r.isDone).length}
            </p>
            <p className="text-xs text-muted-foreground">依頼されている</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {requests.filter((r) => (r.fromEmail === myEmail || r.toEmail === myEmail) && r.isDone).length}
            </p>
            <p className="text-xs text-muted-foreground">完了</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{requests.length}</p>
            <p className="text-xs text-muted-foreground">全体</p>
          </CardContent>
        </Card>
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          {loading ? "読み込み中..." : "お願いがありません"}
        </p>
      )}

      {filtered.map((req) => {
        const isMine = req.fromEmail === myEmail;
        const isToMe = req.toEmail === myEmail;
        return (
          <Card key={req.id} className={req.isDone ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={req.isDone ? "secondary" : "default"}>
                      {req.isDone ? "完了" : "未対応"}
                    </Badge>
                    {isMine && <Badge variant="outline">自分から</Badge>}
                    {isToMe && <Badge variant="outline" className="border-orange-400 text-orange-600">自分宛て</Badge>}
                  </div>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{staffName(req.fromEmail)}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{staffName(req.toEmail)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(req.createdAt), "M/d（E）HH:mm", { locale: ja })}
                    {req.isDone && req.doneAt && (
                      <span className="ml-2">
                        ・完了 {format(new Date(req.doneAt), "M/d HH:mm", { locale: ja })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(isMine || isToMe || isAdmin) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(req.id)}
                    >
                      {req.isDone ? "未対応に戻す" : "完了にする"}
                    </Button>
                  )}
                  {(isMine || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(req.id)}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{req.content}</p>

              {/* コメントスレッド */}
              {req.comments.length > 0 && (
                <div className="space-y-2 pl-3 border-l-2 border-muted">
                  {req.comments.map((c, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{staffName(c.email)}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.at), "M/d HH:mm", { locale: ja })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* コメント入力 */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="コメントを入力..."
                  value={commentMap[req.id] ?? ""}
                  onChange={(e) => setCommentMap((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleComment(req.id)}
                  disabled={!commentMap[req.id]?.trim()}
                  size="sm"
                  className="self-end"
                >
                  送信
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
