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
import type { Staff } from "@/types/user";

export default function RequestNewPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [toEmail, setToEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((list: Staff[]) => {
        setStaffList(list.filter((s) => s.email !== currentUser?.email));
      })
      .catch(() => {});
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!currentUser || !toEmail || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: currentUser.email,
          toEmail,
          content: content.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("お願いを投稿しました");
      setContent("");
      setToEmail("");
    } catch {
      toast.error("投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">お願い投稿</h2>
        <p className="text-sm text-muted-foreground mt-1">
          スタッフにお願いしたいことを投稿できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>お願い内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>誰に</Label>
            <Select value={toEmail} onValueChange={(v) => { if (v) setToEmail(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="スタッフを選択..." />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.email} value={s.email}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>お願いしたいこと</Label>
            <Textarea
              placeholder="お願いしたい内容を記入..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !toEmail || !content.trim()}
              className="flex-1"
              size="lg"
            >
              {submitting ? "投稿中..." : "お願いする"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/requests")}
            >
              一覧を見る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
