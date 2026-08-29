import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function timeRange(start: string, end: string) {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export function dateBR(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function formatAppointmentDateTime(date: string, start: string, end: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return { day: date, time: timeRange(start, end), compact: `${date} · ${timeRange(start, end)}` };
  }

  // Data é uma coluna DATE: criá-la ao meio-dia evita deslocamento de dia por UTC.
  const dateValue = new Date(year, month - 1, day, 12);
  const compactParts = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" })
    .formatToParts(dateValue);
  const compactPart = (type: Intl.DateTimeFormatPartTypes) => compactParts.find((part) => part.type === type)?.value ?? "";
  const weekday = compactPart("weekday").replace(".", "");
  const dayLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${compactPart("day")} ${compactPart("month").replace(".", "")}`;
  const fullDayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .format(dateValue)
    .replace("-feira", "");
  const time = timeRange(start, end);

  return { day: fullDayLabel, time, compact: `${dayLabel} · ${time}` };
}

function fortalezaDateTimeKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function isUpcomingAppointment(appointment: { data: string; hora_fim: string; status: string }) {
  return ["confirmado", "pendente"].includes(appointment.status) &&
    `${appointment.data}T${appointment.hora_fim.slice(0, 5)}` > fortalezaDateTimeKey();
}

export function isHistoricalAppointment(appointment: { data: string; hora_fim: string; status: string }) {
  return ["finalizado", "cancelado"].includes(appointment.status);
}
