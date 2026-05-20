"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Clock, Loader2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { appointmentSchema } from "@/lib/validations/appointment";
import type { Database } from "@/types/database";

type Service = Database["public"]["Tables"]["servicos"]["Row"];
type Professional = Database["public"]["Tables"]["profissionais"]["Row"];

export function AppointmentForm({
  services,
  professionals
}: {
  services: Service[];
  professionals: Professional[];
}) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      servico_id: services[0]?.id ?? "",
      profissional_id: professionals[0]?.id ?? "",
      data: new Date().toISOString().slice(0, 10),
      hora_inicio: "",
      observacoes: ""
    }
  });

  const watch = form.watch();
  const selectedService = useMemo(
    () => services.find((service) => service.id === watch.servico_id),
    [services, watch.servico_id]
  );

  useEffect(() => {
    async function loadSlots() {
      if (!watch.servico_id || !watch.profissional_id || !watch.data) return;
      setLoadingSlots(true);
      const params = new URLSearchParams({
        servico_id: watch.servico_id,
        profissional_id: watch.profissional_id,
        data: watch.data
      });
      const response = await fetch(`/api/appointments/available-slots?${params}`);
      const payload = await response.json();
      setSlots(payload.slots ?? []);
      form.setValue("hora_inicio", payload.slots?.[0] ?? "");
      setLoadingSlots(false);
    }
    loadSlots();
  }, [watch.servico_id, watch.profissional_id, watch.data, form]);

  async function onSubmit(values: z.infer<typeof appointmentSchema>) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const clienteNome = localStorage.getItem("agenda_cliente_nome") ?? undefined;
    const clienteTelefone = localStorage.getItem("agenda_cliente_whatsapp") ?? undefined;

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        cliente_nome: user ? undefined : clienteNome,
        cliente_telefone: user ? undefined : clienteTelefone
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error ?? "Nao foi possivel agendar.");
      return;
    }

    toast.success("Agendamento criado e confirmacao enviada.");
    form.reset({ ...values, hora_inicio: "" });
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Servico</span>
          <Select {...form.register("servico_id")}>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.nome} - {service.duracao_minutos} min
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Profissional</span>
          <Select {...form.register("profissional_id")}>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.nome}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Calendar size={16} /> Data
          </span>
          <Input type="date" min={new Date().toISOString().slice(0, 10)} {...form.register("data")} />
        </label>
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Clock size={16} /> Horario
          </span>
          <Select {...form.register("hora_inicio")} disabled={loadingSlots || slots.length === 0}>
            {loadingSlots && <option>Carregando horarios...</option>}
            {!loadingSlots && slots.length === 0 && <option value="">Sem horarios disponiveis</option>}
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="space-y-2">
        <span className="text-sm font-medium">Observacoes</span>
        <Input placeholder="Alguma preferencia ou detalhe importante?" {...form.register("observacoes")} />
      </label>
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/35 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 text-muted-foreground">
          <UserRound size={16} />
          Duracao automatica: {selectedService?.duracao_minutos ?? 0} minutos
        </span>
        <Button disabled={form.formState.isSubmitting || slots.length === 0}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" size={16} />}
          Confirmar agendamento
        </Button>
      </div>
    </form>
  );
}
