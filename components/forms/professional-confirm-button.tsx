"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ProfessionalConfirmButton({
  appointmentId
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirmAppointment() {
    if (!window.confirm("Deseja confirmar este agendamento?")) {
      return;
    }

    setLoading(true);
    const response = await fetch("/api/appointments/professional-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId
      })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Nao foi possivel confirmar o agendamento.");
      return;
    }

    toast.success("Agendamento confirmado.");
    router.refresh();
  }

  return (
    <Button type="button" className="h-9 px-3" disabled={loading} onClick={confirmAppointment}>
      <CheckCircle2 size={16} />
      {loading ? "Confirmando..." : "Confirmar"}
    </Button>
  );
}
