"use client";

import { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
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
import type { Staff } from "@/types/user";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentMonth = format(selectedDate, "yyyy-MM");

  const goToPrevMonth = () => setSelectedDate((d) => subMonths(d, 1));
  const goToNextMonth = () => setSelectedDate((d) => addMonths(d, 1));
  const goToThisMonth = () => setSelectedDate(new Date());

  const [myAttendance, setMyAttendance] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/attendance?email=${encodeURIComponent(currentUser.email)}&month=${currentMonth}`)
      .then((r) => r.json())
      .then(setMyAttendance)
      .catch(() => {});
    if (isAdmin) {
      fetch(`/api/attendance?month=${currentMonth}`)
        .then((r) => r.json())
        .then(setAllAttendance)
        .catch(() => {});
      fetch("/api/staff")
        .then((r) => r.json())
        .then(setStaffList)
        .catch(() => {});
    }
  }, [currentUser, isAdmin, currentMonth]);

  const totalHours = myAttendance.reduce((sum, a) => sum + a.workHours, 0);
  const totalTransport = myAttendance.reduce(
    (sum, a) => sum + a.transportCost,
    0
  );
  const daysWorked = new Set(myAttendance.map((a) => a.date)).size;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
}
