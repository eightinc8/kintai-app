"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">勤怠管理・業務報告システム</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Googleアカウントでログインしてください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "AccessDenied" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              このGoogleアカウントは登録されていません。管理者に連絡してスタッフ登録を依頼してください。
            </div>
          )}
          {error && error !== "AccessDenied" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              ログインに失敗しました。もう一度お試しください。
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={() => signIn("google", { callbackUrl: "/report" })}
          >
            Googleでログイン
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
