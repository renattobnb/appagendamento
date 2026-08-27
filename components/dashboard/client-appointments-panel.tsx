"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { CancelAppointmentButton } from "@/components/forms/cancel-appointment-button";
import { ReviewAppointmentForm, ReviewSummary } from "@/components/forms/review-appointment-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatAppointmentDateTime } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

export type ClientAppointmentItem = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: AppointmentStatus;
  cliente_telefone?: string | null;
  servicos?: { nome: string | null } | null;
  profissionais?: { nome: string | null } | null;
  avaliacao_nota?: number | null;
  avaliacao_comentario?: string | null;
};

type ClientAppointmentsPanelProps = {
  bookingHref: string;
  upcoming: ClientAppointmentItem[];
  history: ClientAppointmentItem[];
  establishmentId?: string;
  guestPhone?: string | null;
  showReviews?: boolean;
};

const INITIAL_HISTORY_SIZE = 6;

function AppointmentIdentity({ appointment }: { appointment: ClientAppointmentItem }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold">{appointment.servicos?.nome ?? "Serviço"}</p>
      <p className="truncate text-sm text-muted-foreground">
        {appointment.profissionais?.nome ?? "Profissional não informado"}
      </p>
    </div>
  );
}

function AppointmentTime({ appointment, compact = false }: { appointment: ClientAppointmentItem; compact?: boolean }) {
  const formatted = formatAppointmentDateTime(appointment.data, appointment.hora_inicio, appointment.hora_fim);

  return compact ? (
    <p className="mt-1 text-sm text-muted-foreground">{formatted.compact}</p>
  ) : (
    <div className="mt-4 space-y-1">
      <p className="text-base font-medium">{formatted.day}</p>
      <p className="text-lg font-semibold tracking-tight">{formatted.time}</p>
    </div>
  );
}

function AppointmentActions({ appointment, establishmentId, guestPhone, showReviews }: {
  appointment: ClientAppointmentItem;
  establishmentId?: string;
  guestPhone?: string | null;
  showReviews?: boolean;
}) {
  if (appointment.status === "finalizado" && showReviews && establishmentId) {
    return appointment.avaliacao_nota ? (
      <ReviewSummary nota={appointment.avaliacao_nota} comentario={appointment.avaliacao_comentario} />
    ) : (
      <ReviewAppointmentForm appointmentId={appointment.id} estabelecimentoId={establishmentId} clienteTelefone={appointment.cliente_telefone ?? guestPhone} />
    );
  }

  return null;
}

export function ClientAppointmentsPanel({
  bookingHref,
  upcoming,
  history,
  establishmentId,
  guestPhone,
  showReviews = false
}: ClientAppointmentsPanelProps) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const visibleHistory = showAllHistory ? history : history.slice(0, INITIAL_HISTORY_SIZE);
  const firstUpcoming = upcoming[0];
  const additionalUpcoming = upcoming.slice(1, 3);

  return (
    <div className="space-y-7 md:space-y-8">
      <section aria-labelledby="upcoming-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="upcoming-heading" className="text-lg font-semibold">Próximo agendamento</h2>
          {upcoming.length > 1 && <span className="text-sm text-muted-foreground">+{upcoming.length - 1} próximo{upcoming.length > 2 ? "s" : ""}</span>}
        </div>

        {firstUpcoming ? (
          <div className="space-y-3">
            <Card className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <AppointmentIdentity appointment={firstUpcoming} />
                <StatusBadge status={firstUpcoming.status} />
              </div>
              <AppointmentTime appointment={firstUpcoming} />
              {establishmentId && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                  <CancelAppointmentButton appointmentId={firstUpcoming.id} estabelecimentoId={establishmentId} />
                </div>
              )}
            </Card>

            {additionalUpcoming.length > 0 && (
              <div aria-label="Outros próximos agendamentos" className="divide-y rounded-lg border">
                <p className="px-4 py-3 text-sm font-medium">Próximos horários</p>
                {additionalUpcoming.map((appointment) => (
                  <div key={appointment.id} className="flex min-w-0 items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <AppointmentIdentity appointment={appointment} />
                      <AppointmentTime appointment={appointment} compact />
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
            <Link href={bookingHref} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto"><CalendarPlus size={16} /> Agendar horário</Button>
            </Link>
          </Card>
        )}
      </section>

      <section aria-labelledby="history-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="history-heading" className="text-lg font-semibold">Histórico</h2>
            <p className="mt-1 text-sm text-muted-foreground">Atendimentos passados</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="border-t py-5">
            <p className="text-sm font-medium">Nenhum atendimento realizado ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">Seu histórico aparecerá aqui após o primeiro atendimento.</p>
          </div>
        ) : (
          <>
            <div className="divide-y border-y md:hidden">
              {visibleHistory.map((appointment) => (
                <article key={appointment.id} className="py-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <AppointmentIdentity appointment={appointment} />
                    <StatusBadge status={appointment.status} />
                  </div>
                  <AppointmentTime appointment={appointment} compact />
                  <div className="mt-3">
                    <AppointmentActions appointment={appointment} establishmentId={establishmentId} guestPhone={guestPhone} showReviews={showReviews} />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Serviço</th>
                    <th className="px-4 py-3 font-medium">Profissional</th>
                    <th className="px-4 py-3 font-medium">Data e horário</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {showReviews && <th className="px-4 py-3 font-medium">Avaliação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleHistory.map((appointment) => (
                    <tr key={appointment.id} className="align-top">
                      <td className="max-w-52 px-4 py-3 font-medium"><span className="block truncate">{appointment.servicos?.nome ?? "Serviço"}</span></td>
                      <td className="max-w-52 px-4 py-3"><span className="block truncate">{appointment.profissionais?.nome ?? "Profissional não informado"}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatAppointmentDateTime(appointment.data, appointment.hora_inicio, appointment.hora_fim).compact}</td>
                      <td className="px-4 py-3"><StatusBadge status={appointment.status} /></td>
                      {showReviews && <td className="min-w-64 px-4 py-3"><AppointmentActions appointment={appointment} establishmentId={establishmentId} guestPhone={guestPhone} showReviews={showReviews} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {history.length > INITIAL_HISTORY_SIZE && (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full border sm:w-auto"
            aria-expanded={showAllHistory}
            onClick={() => setShowAllHistory((visible) => !visible)}
          >
            {showAllHistory ? "Mostrar menos" : `Ver mais (${history.length - INITIAL_HISTORY_SIZE})`}
          </Button>
        )}
      </section>
    </div>
  );
}
