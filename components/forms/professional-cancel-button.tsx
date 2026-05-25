"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfessionalCancelButton({
  appointmentId
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  async function cancelAppointment() {
    if (motivo.trim().length < 5) {
      toast.error("Informe uma justificativa para cancelar.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/appointments/professional-cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId,
        motivo
      })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Nao foi possivel cancelar o agendamento.");
      return;
    }

    toast.success("Agendamento cancelado.");
    setOpen(false);
    setMotivo("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="danger" className="h-9 px-3" onClick={() => setOpen(true)}>
        <XCircle size={16} />
        Cancelar
      </Button>
    );
  }

  return (
    <div className="grid min-w-64 gap-2">
      <Input
        placeholder="Justificativa do cancelamento"
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setOpen(false)}>
          Voltar
        </Button>
        <Button
          type="button"
          variant="danger"
          className="h-9 px-3"
          disabled={loading}
          onClick={cancelAppointment}
        >
          {loading ? "Cancelando..." : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
