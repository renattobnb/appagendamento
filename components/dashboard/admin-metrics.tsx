import { CalendarCheck, DollarSign, Sparkles, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </div>
          <span className="grid size-11 place-items-center rounded-md bg-primary/12 text-primary">
            <item.icon size={21} />
          </span>
        </Card>
      ))}
    </div>
  );
}
