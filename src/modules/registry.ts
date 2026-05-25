import { attendanceModule } from "./attendance";
import { dailyReportModule } from "./daily-report";
import type { AppModule } from "./types";

const allModules: AppModule[] = [attendanceModule, dailyReportModule];

export function getEnabledModules(): AppModule[] {
  return allModules.filter((m) => m.enabled);
}

export function getModule(id: string): AppModule | undefined {
  return allModules.find((m) => m.id === id);
}
