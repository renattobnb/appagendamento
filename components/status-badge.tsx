import { AppointmentStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const labels: Record<AppointmentStatus, string> = {
  confirmado: "Confirmado",
  pendente: "Pendente",
  cancelado: "Cancelado",
  finalizado: "Finalizado"
};

const colors: Record<AppointmentStatus, string> = {
  confirmado: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  pendente: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  cancelado: "bg-red-500/12 text-red-700 dark:text-red-300",
  finalizado: "bg-sky-500/12 text-sky-700 dark:text-sky-300"
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", colors[status])}>
      {labels[status]}
    </span>
  );
}
