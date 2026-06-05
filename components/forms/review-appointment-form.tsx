"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ReviewAppointmentFormProps = {
  appointmentId: string;
  estabelecimentoId: string;
  clienteTelefone: string | null | undefined;
};

export function ReviewAppointmentForm({
  appointmentId,
  estabelecimentoId,
  clienteTelefone
}: ReviewAppointmentFormProps) {
  const router = useRouter();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitReview() {
    if (!clienteTelefone) {
      toast.error("Telefone do cliente nao encontrado para validar a avaliacao.");
      return;
    }

    if (nota < 1 || nota > 5) {
      toast.error("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/appointments/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId,
        estabelecimento_id: estabelecimentoId,
        cliente_telefone: clienteTelefone,
        nota,
        comentario
      })
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Nao foi possivel enviar a avaliacao.");
      return;
    }

    toast.success("Avaliacao enviada. Obrigado pelo feedback.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold">Avalie o atendimento</p>
      <div className="mt-2 flex gap-1" aria-label="Nota de 1 a 5 estrelas">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="rounded p-1 text-amber-400 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
            onClick={() => setNota(star)}
          >
            <Star size={22} fill={star <= nota ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <textarea
        className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        maxLength={500}
        placeholder="Conte como foi o atendimento"
        value={comentario}
        onChange={(event) => setComentario(event.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <Button type="button" className="h-9 px-3" disabled={loading} onClick={submitReview}>
          {loading ? "Enviando..." : "Enviar avaliacao"}
        </Button>
      </div>
    </div>
  );
}

export function ReviewSummary({
  nota,
  comentario
}: {
  nota: number;
  comentario?: string | null;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={18} fill={star <= nota ? "currentColor" : "none"} />
        ))}
        <span className="ml-2 text-sm font-semibold text-foreground">{nota}/5</span>
      </div>
      {comentario && <p className="mt-2 text-sm text-muted-foreground">{comentario}</p>}
    </div>
  );
}
