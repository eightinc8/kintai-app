"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import type { Idea } from "@/types/report";
import type { Staff } from "@/types/user";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export default function IdeasPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterEmail, setFilterEmail] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/ideas").then((r) => r.json()).then(setIdeas).catch(() => {}),
      fetch("/api/staff").then((r) => r.json()).then(setStaffList).catch(() => {}),
      fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {}),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const [filterHandledByMe, setFilterHandledByMe] = useState(false);

  const filtered = ideas
    .filter((i) => filterEmail === "all" || i.staffEmail === filterEmail)
    .filter((i) => {
      if (filterStatus === "done") return i.isDone;
      if (filterStatus === "undone") return !i.isDone;
      return true;
    })
    .filter((i) => {
      if (filterCategory === "all") return true;
      if (filterCategory === "uncategorized") return !i.category;
      return i.category === filterCategory;
    })
    .filter((i) => {
      if (filterHandledByMe) return i.isDone && i.doneBy === currentUser?.email;
      return true;
    });

  const staffName = (email: string) =>
    staffList.find((s) => s.email === email)?.name ?? email;

  const handleToggle = async (id: string, doneBy?: string) => {
    try {
      const res = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, doneBy }),
      });
      if (!res.ok) throw new Error();
      toast.success("ステータスを更新しました");
      load();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このアイディアを削除しますか？")) return;
    try {
      const res = await fetch(`/api/ideas?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("アイディアを削除しました");
      load();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleCategory = async (id: string, category: string) => {
    try {
      const res = await fetch("/api/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, category }),
      });
      if (!res.ok) throw new Error();
      toast.success("カテゴリを更新しました");
      load();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold">
          {isAdmin ? "アイディア・要望一覧" : "アイディア・改善一覧"}
        </h2>
        <div className="flex gap-2 flex-wrap items-center">
          {!isAdmin && (
            <Button
              variant={filterHandledByMe ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterHandledByMe(!filterHandledByMe)}
            >
              自分が対応したもの
            </Button>
          )}
          {isAdmin && (
            <Select value={filterEmail} onValueChange={(v) => v && setFilterEmail(v)}>
              <SelectTrigger className="w-36">
                <SelectValue>
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
          )}
          <Select value={filterCategory} onValueChange={(v) => v && setFilterCategory(v)}>
            <SelectTrigger className="w-36">
              <SelectValue>
                {filterCategory === "all"
                  ? "全カテゴリ"
                  : filterCategory === "uncategorized"
                    ? "未分類"
                    : filterCategory}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全カテゴリ</SelectItem>
              <SelectItem value="uncategorized">未分類</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
            <SelectTrigger className="w-28">
              <SelectValue>
                {filterStatus === "all" ? "すべて" : filterStatus === "done" ? "対応済み" : "未対応"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="undone">未対応</SelectItem>
              <SelectItem value="done">対応済み</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* スタッフ向け: 自分の対応実績サマリー */}
      {!isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{ideas.length}</p>
              <p className="text-xs text-muted-foreground">全アイディア</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{ideas.filter(i => i.isDone).length}</p>
              <p className="text-xs text-muted-foreground">対応済み</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{ideas.filter(i => !i.isDone).length}</p>
              <p className="text-xs text-muted-foreground">未対応</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {ideas.filter(i => i.isDone && i.doneBy === currentUser?.email).length}
              </p>
              <p className="text-xs text-muted-foreground">自分が対応</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>状態</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>投稿者</TableHead>
                <TableHead>日付</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>対応者</TableHead>
                {isAdmin && <TableHead className="text-right">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                    {loading ? "只今読み込み中です" : "アイディアがありません"}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((idea) => (
                <TableRow key={idea.id} className={cn(
                    idea.isDone ? "opacity-60" : "",
                    !isAdmin && idea.isDone && idea.doneBy === currentUser?.email ? "opacity-100 bg-primary/5" : ""
                  )}>
                  <TableCell>
                    <Badge variant={idea.isDone ? "secondary" : "default"}>
                      {idea.isDone ? "対応済み" : "未対応"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select
                        value={idea.category || "none"}
                        onValueChange={(v) => handleCategory(idea.id, v === "none" ? "" : v ?? "")}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue>
                            {idea.category || "未分類"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">未分類</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {idea.category || "未分類"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{staffName(idea.staffEmail)}</TableCell>
                  <TableCell>{format(new Date(idea.date), "M/d", { locale: ja })}</TableCell>
                  <TableCell className={idea.isDone ? "line-through" : ""}>{idea.content}</TableCell>
                  <TableCell>
                    {idea.isDone && idea.doneBy ? (
                      <span className="text-sm">{staffName(idea.doneBy)}</span>
                    ) : idea.isDone ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : null}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {idea.isDone ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggle(idea.id)}
                          >
                            未対応に戻す
                          </Button>
                        ) : (
                          <Select
                            onValueChange={(v) => { if (v) handleToggle(idea.id, String(v)); }}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue placeholder="対応済み" />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map((s) => (
                                <SelectItem key={s.email} value={s.email}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(idea.id)}
                        >
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
