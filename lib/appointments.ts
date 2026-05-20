import { addMinutes, format, isBefore, parseISO } from "date-fns";

export function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number) {
  const hours = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function buildSlots({
  date,
  start,
  end,
  duration,
  busy
}: {
  date: string;
  start: string;
  end: string;
  duration: number;
  busy: Array<{ hora_inicio: string; hora_fim: string }>;
}) {
  const now = new Date();
  const slots: string[] = [];
  const step = 15;
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  for (let current = startMinutes; current + duration <= endMinutes; current += step) {
    const slotStart = fromMinutes(current);
    const slotEnd = fromMinutes(current + duration);
    const slotDate = parseISO(`${date}T${slotStart}:00`);
    const isPast = isBefore(slotDate, now);
    const hasConflict = busy.some(
      (appointment) =>
        toMinutes(slotStart) < toMinutes(appointment.hora_fim) &&
        toMinutes(slotEnd) > toMinutes(appointment.hora_inicio)
    );

    if (!isPast && !hasConflict) {
      slots.push(slotStart);
    }
  }

  return slots;
}

export function calculateEndTime(date: string, start: string, duration: number) {
  return format(addMinutes(parseISO(`${date}T${start}:00`), duration), "HH:mm");
}
