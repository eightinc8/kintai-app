"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export default function IdeasNewPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [ideas, setIdeas] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!currentUser || !ideas.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffEmail: currentUser.email,
          ideas: ideas,
          category: category,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      const count = Array.isArray(result) ? result.length : 1;
      toast.success(`${count}件のアイディアを投稿しました`);
      setIdeas("");
    } catch {
      toast.error("投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">アイディア・要望を投稿する</h2>
        <p className="text-sm text-muted-foreground mt-1">
          改善のアイディアや要望を自由に投稿できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>アイディア・要望</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>カテゴリ</Label>
            <Select value={category || "none"} onValueChange={(v) => { if (v) setCategory(v === "none" ? "" : v); }}>
              <SelectTrigger>
                <SelectValue>
                  {category || "未分類"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分類</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>内容</Label>
            <Textarea
              placeholder="アイディアや要望を記入（複数ある場合は改行で区切る）..."
              value={ideas}
              onChange={(e) => setIdeas(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              改行ごとに1件のアイディアとして登録されます
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !ideas.trim()}
              className="flex-1"
              size="lg"
            >
              {submitting ? "投稿中..." : "投稿する"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/ideas")}
            >
              一覧を見る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
