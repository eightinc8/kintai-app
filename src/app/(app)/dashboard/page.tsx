"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Attendance } from "@/types/attendance";
import type { DailyReport } from "@/types/report";
import type { StaffRequest } from "@/types/request";
import type { Staff } from "@/types/user";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentMonth = format(selectedDate, "yyyy-MM");
  const prevMonth = format(subMonths(selectedDate, 1), "yyyy-MM");

  const goToPrevMonth = () => setSelectedDate((d) => subMonths(d, 1));
  const goToNextMonth = () => setSelectedDate((d) => addMonths(d, 1));
  const goToThisMonth = () => setSelectedDate(new Date());

  const [myAttendance, setMyAttendance] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [myReports, setMyReports] = useState<DailyReport[]>([]);
  const [myPrevReports, setMyPrevReports] = useState<DailyReport[]>([]);
  const [allRequests, setAllRequests] = useState<StaffRequest[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/attendance?email=${encodeURIComponent(currentUser.email)}&month=${currentMonth}`)
      .then((r) => r.json())
      .then(setMyAttendance)
      .catch(() => {});
    fetch("/api/reports")
      .then((r) => r.json())
      .then((all: DailyReport[]) => {
        const mine = all.filter((r) => r.staffEmail === currentUser.email);
        setMyReports(
          mine
            .filter((r) => r.date.startsWith(currentMonth))
            .sort((a, b) => b.date.localeCompare(a.date))
        );
        setMyPrevReports(mine.filter((r) => r.date.startsWith(prevMonth)));
      })
      .catch(() => {});
    fetch("/api/requests")
      .then((r) => r.json())
      .then(setAllRequests)
      .catch(() => {});
    fetch("/api/staff")
      .then((r) => r.json())
      .then(setStaffList)
      .catch(() => {});
    if (isAdmin) {
      fetch(`/api/attendance?month=${currentMonth}`)
        .then((r) => r.json())
        .then(setAllAttendance)
        .catch(() => {});
    }
  }, [currentUser, isAdmin, currentMonth, prevMonth]);

  const staffName = (email: string) =>
    staffList.find((s) => s.email === email)?.name ?? email;

  const totalHours = myAttendance.reduce((sum, a) => sum + a.workHours, 0);
  const totalTransport = myAttendance.reduce(
    (sum, a) => sum + a.transportCost,
    0
  );
  const daysWorked = new Set(myAttendance.map((a) => a.date)).size;
  const totalAmazon = myReports.reduce((sum, r) => sum + (r.amazonCount || 0), 0);
  const totalRakuten = myReports.reduce((sum, r) => sum + (r.rakutenCount || 0), 0);
  const prevAmazon = myPrevReports.reduce((sum, r) => sum + (r.amazonCount || 0), 0);
  const prevRakuten = myPrevReports.reduce((sum, r) => sum + (r.rakutenCount || 0), 0);

  const staffSummary = isAdmin
    ? staffList.map((staff) => {
        const records = allAttendance.filter(
          (a) => a.staffEmail === staff.email
        );
        return {
          name: staff.name,
          email: staff.email,
          days: new Set(records.map((a) => a.date)).size,
          hours: records.reduce((s, a) => s + a.workHours, 0),
          transport: records.reduce((s, a) => s + a.transportCost, 0),
        };
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">ダッシュボード</h2>
          <p className="text-muted-foreground">
            {format(selectedDate, "yyyy年M月", { locale: ja })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            ← 前月
          </Button>
          <Button variant="outline" size="sm" onClick={goToThisMonth}>
            今月
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            翌月 →
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              勤務日数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{daysWorked} 日</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              合計勤務時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalHours} 時間</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              交通費合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {totalTransport.toLocaleString()} 円
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Amazon登録数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAmazon} 件</p>
            <p className="text-xs text-muted-foreground mt-1">
              先月: {prevAmazon} 件
              {prevAmazon > 0 && (
                <span className={totalAmazon >= prevAmazon ? "text-green-600 ml-1" : "text-red-500 ml-1"}>
                  ({totalAmazon >= prevAmazon ? "+" : ""}{totalAmazon - prevAmazon})
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              楽天登録数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalRakuten} 件</p>
            <p className="text-xs text-muted-foreground mt-1">
              先月: {prevRakuten} 件
              {prevRakuten > 0 && (
                <span className={totalRakuten >= prevRakuten ? "text-green-600 ml-1" : "text-red-500 ml-1"}>
                  ({totalRakuten >= prevRakuten ? "+" : ""}{totalRakuten - prevRakuten})
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && staffSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>スタッフ別サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead className="text-right">勤務日数</TableHead>
                  <TableHead className="text-right">合計時間</TableHead>
                  <TableHead className="text-right">交通費</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffSummary.map((s) => (
                  <TableRow key={s.email}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-right">{s.days} 日</TableCell>
                    <TableCell className="text-right">{s.hours} 時間</TableCell>
                    <TableCell className="text-right">
                      {s.transport.toLocaleString()} 円
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>提出した日報</CardTitle>
        </CardHeader>
        <CardContent>
          {myReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              この月の日報はありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>作業報告</TableHead>
                  <TableHead>コメント</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myReports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(r.date), "M/d（E）", { locale: ja })}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.workDone}
                    </TableCell>
                    <TableCell>
                      {r.adminComment ? (
                        <Badge>コメントあり</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* お願い：自分宛て（未対応） */}
      {(() => {
        const toMe = allRequests
          .filter((r) => r.toEmail === currentUser?.email && !r.isDone)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return toMe.length > 0 ? (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                お願いされていること
                <Badge variant="destructive">{toMe.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>依頼者</TableHead>
                    <TableHead>日付</TableHead>
                    <TableHead>内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toMe.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{staffName(r.fromEmail)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(r.createdAt), "M/d", { locale: ja })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{r.content}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* お願い：自分から（未対応） */}
      {(() => {
        const fromMe = allRequests
          .filter((r) => r.fromEmail === currentUser?.email && !r.isDone)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return fromMe.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>お願いしていること</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>依頼先</TableHead>
                    <TableHead>日付</TableHead>
                    <TableHead>内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fromMe.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{staffName(r.toEmail)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(r.createdAt), "M/d", { locale: ja })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{r.content}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* お願い：今月完了分 */}
      {(() => {
        const done = allRequests
          .filter((r) =>
            (r.fromEmail === currentUser?.email || r.toEmail === currentUser?.email) &&
            r.isDone &&
            r.doneAt?.startsWith(currentMonth)
          )
          .sort((a, b) => b.doneAt.localeCompare(a.doneAt));
        return done.length > 0 ? (
          <Card className="opacity-70">
            <CardHeader>
              <CardTitle>今月完了したお願い</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>依頼者</TableHead>
                    <TableHead>依頼先</TableHead>
                    <TableHead>依頼日</TableHead>
                    <TableHead>完了日</TableHead>
                    <TableHead>内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {done.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{staffName(r.fromEmail)}</TableCell>
                      <TableCell className="whitespace-nowrap">{staffName(r.toEmail)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(r.createdAt), "M/d", { locale: ja })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(r.doneAt), "M/d", { locale: ja })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate line-through">{r.content}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null;
      })()}
    </div>
  );
}

