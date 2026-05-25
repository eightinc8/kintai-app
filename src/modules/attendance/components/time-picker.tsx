"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOURS, MINUTES } from "@/lib/constants";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [hour, minute] = value ? value.split(":") : ["", ""];

  const handleHourChange = (h: string) => {
    onChange(`${h}:${minute || "00"}`);
  };

  const handleMinuteChange = (m: string) => {
    onChange(`${hour || "09"}:${m}`);
  };

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2 items-center">
        <Select value={hour} onValueChange={(v) => v && handleHourChange(v)}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="時" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg">:</span>
        <Select value={minute} onValueChange={(v) => v && handleMinuteChange(v)}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="分" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
