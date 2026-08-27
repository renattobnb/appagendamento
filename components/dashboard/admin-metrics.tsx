import { CalendarCheck, DollarSign, Sparkles, Users } from "lucide-react";
import { currency } from "@/lib/utils";

export function AdminMetrics({
  appointments,
  revenue,
  services,
  professionals
}: {
  appointments: number;
  revenue: number;
  services: number;
  professionals: number;
}) {
  const items = [
    { label: "Agendamentos", value: appointments, icon: CalendarCheck },
    { label: "Faturamento estimado", value: currency(revenue), icon: DollarSign },
    { label: "Servicos ativos", value: services, icon: Sparkles },
    { label: "Profissionais", value: professionals, icon: Users }
  ];

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex min-w-0 items-start justify-between gap-2 rounded-lg border bg-background/65 p-3 shadow-sm sm:p-4">
          <div className="min-w-0">
            <dt className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl">{value}</dd>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/12 text-primary sm:size-10" aria-hidden="true">
            <Icon size={17} className="sm:size-[19px]" />
          </span>
        </div>
      ))}
    </dl>
  );
}
