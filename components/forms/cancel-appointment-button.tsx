"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CancelAppointmentButton({
  appointmentId,
  estabelecimentoId
}: {
  appointmentId: string;
  estabelecimentoId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancelAppointment() {
    const confirmed = window.confirm("Deseja cancelar este agendamento?");
    if (!confirmed) return;

    const phone = localStorage.getItem("agenda_cliente_whatsapp");
    if (!phone) {
      toast.error("Nao foi possivel identificar seu WhatsApp. Entre novamente.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/appointments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId,
        cliente_telefone: phone,
        estabelecimento_id: estabelecimentoId
      })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Nao foi possivel cancelar o agendamento.");
      return;
    }

    toast.success("Agendamento cancelado.");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="danger"
      className="h-9 px-3"
      disabled={loading}
      onClick={cancelAppointment}
    >
      <XCircle size={16} />
      {loading ? "Cancelando..." : "Cancelar"}
    </Button>
  );
}
