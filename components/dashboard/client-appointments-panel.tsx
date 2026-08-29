"use client";

import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReviewAppointmentForm, ReviewSummary } from "@/components/forms/review-appointment-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatAppointmentDateTime } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

export type ClientAppointmentItem = {
  id: string;
  servico_id?: string | null;
  profissional_id?: string | null;
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

type Props = { bookingHref: string; upcoming: ClientAppointmentItem[]; history: ClientAppointmentItem[]; establishmentId?: string; guestPhone?: string | null; showReviews?: boolean };
const INITIAL_UPCOMING_SIZE = 3;
const INITIAL_HISTORY_SIZE = 5;

function identity(appointment: ClientAppointmentItem) {
  return <><p className="break-words font-semibold">{appointment.servicos?.nome ?? "Serviço"}</p><p className="mt-0.5 break-words text-sm text-muted-foreground">{appointment.profissionais?.nome ?? "Profissional não informado"}</p></>;
}

function bookingAgainHref(bookingHref: string, appointment: ClientAppointmentItem) {
  const query = new URLSearchParams();
  if (appointment.servico_id) query.set("service", appointment.servico_id);
  if (appointment.profissional_id) query.set("professional", appointment.profissional_id);
  return query.size ? `${bookingHref}?${query}` : bookingHref;
}

function AppointmentMenu({ appointment, onCancel }: { appointment: ClientAppointmentItem; onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative shrink-0"><Button type="button" variant="ghost" className="size-11 px-0" aria-label="Ações do agendamento" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal size={20} /></Button>{open && <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border bg-background p-1 shadow-lg"><button type="button" className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => { setOpen(false); onCancel(); }}>Cancelar agendamento</button></div>}</div>;
}

function CancelDialog({ appointment, establishmentId, guestPhone, onClose, onSuccess }: { appointment: ClientAppointmentItem | null; establishmentId?: string; guestPhone?: string | null; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!appointment) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [appointment, loading, onClose]);
  if (!appointment || !establishmentId) return null;
  const currentAppointment = appointment;
  const formatted = formatAppointmentDateTime(currentAppointment.data, currentAppointment.hora_inicio, currentAppointment.hora_fim);
  async function cancel() {
    const phone = guestPhone || localStorage.getItem("agenda_cliente_whatsapp");
    if (!phone) { toast.error("Não foi possível identificar seu WhatsApp. Entre novamente."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/appointments/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_id: currentAppointment.id, cliente_telefone: phone, estabelecimento_id: establishmentId }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404) { toast.error("Este agendamento foi atualizado. Atualizamos seus dados."); onSuccess(); return; }
        toast.error(payload.error ?? "Não foi possível cancelar o agendamento."); return;
      }
      toast.success("Agendamento cancelado."); onSuccess();
    } finally { setLoading(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="client-cancel-title" className="w-full rounded-t-2xl bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl sm:max-w-md sm:rounded-xl sm:p-5"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" /><div className="flex items-start justify-between gap-3"><h2 id="client-cancel-title" className="text-lg font-bold">Cancelar agendamento?</h2><Button type="button" variant="ghost" className="size-11 shrink-0 px-0" aria-label="Fechar" disabled={loading} onClick={onClose}><X size={18} /></Button></div><div className="mt-3 rounded-lg bg-muted/60 p-3">{identity(currentAppointment)}<p className="mt-2 text-sm text-muted-foreground">{formatted.compact}</p></div><p className="mt-4 text-sm text-muted-foreground">Tem certeza que deseja cancelar este horário?</p><div className="mt-5 grid grid-cols-2 gap-3"><Button type="button" variant="secondary" disabled={loading} onClick={onClose}>Voltar</Button><Button type="button" variant="danger" disabled={loading} onClick={() => void cancel()}>{loading ? "Cancelando..." : "Cancelar agendamento"}</Button></div></section></div>;
}

function HistoryActions({ appointment, bookingHref, establishmentId, guestPhone, showReviews }: { appointment: ClientAppointmentItem; bookingHref: string; establishmentId?: string; guestPhone?: string | null; showReviews?: boolean }) {
  if (appointment.status !== "finalizado") return null;
  return <div className="mt-3 flex flex-wrap items-center gap-2">{showReviews && establishmentId && (appointment.avaliacao_nota ? <ReviewSummary nota={appointment.avaliacao_nota} comentario={appointment.avaliacao_comentario} /> : <ReviewAppointmentForm appointmentId={appointment.id} estabelecimentoId={establishmentId} clienteTelefone={appointment.cliente_telefone ?? guestPhone} />)}<Link href={bookingAgainHref(bookingHref, appointment)}><Button type="button" variant="secondary">Agendar novamente</Button></Link></div>;
}

export function ClientAppointmentsPanel({ bookingHref, upcoming, history, establishmentId, guestPhone, showReviews = false }: Props) {
  const router = useRouter();
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState<ClientAppointmentItem | null>(null);
  const visibleUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, INITIAL_UPCOMING_SIZE);
  const visibleHistory = showAllHistory ? history : history.slice(0, INITIAL_HISTORY_SIZE);

  useEffect(() => {
    const refresh = () => router.refresh();
    const onVisibilityChange = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [router]);

  const completeCancel = () => { setCancelAppointment(null); router.refresh(); };
  return <div className="space-y-7 md:space-y-8"><section aria-labelledby="upcoming-heading"><div className="mb-3 flex items-center justify-between gap-3"><h2 id="upcoming-heading" className="text-lg font-semibold">Próximos agendamentos</h2><span className="rounded-full bg-muted px-2.5 py-1 text-sm font-semibold" aria-label={`${upcoming.length} próximos agendamentos`}>{upcoming.length}</span></div>{upcoming.length ? <div className="divide-y border-y">{visibleUpcoming.map((appointment, index) => { const formatted = formatAppointmentDateTime(appointment.data, appointment.hora_inicio, appointment.hora_fim); return <article key={appointment.id} className={`py-4 ${index === 0 ? "border-l-2 border-primary pl-3" : ""}`}><div className="flex min-w-0 items-start gap-3"><div className="min-w-0 flex-1">{index === 0 && <p className="mb-1 text-xs font-bold tracking-wide text-primary">PRÓXIMO</p>}{identity(appointment)}<p className="mt-2 text-sm text-muted-foreground">{formatted.compact}</p></div><div className="flex shrink-0 items-start gap-1"><StatusBadge status={appointment.status} />{establishmentId && <AppointmentMenu appointment={appointment} onCancel={() => setCancelAppointment(appointment)} />}</div></div></article>; })}</div> : <div className="border-y py-4"><p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p></div>}{upcoming.length > INITIAL_UPCOMING_SIZE && <Button type="button" variant="ghost" className="mt-3 w-full border sm:w-auto" aria-expanded={showAllUpcoming} onClick={() => setShowAllUpcoming((visible) => !visible)}>{showAllUpcoming ? "Mostrar menos" : `Ver todos (${upcoming.length})`}</Button>}</section><section aria-labelledby="history-heading"><div className="mb-3"><h2 id="history-heading" className="text-lg font-semibold">Histórico</h2></div>{history.length === 0 ? <div className="border-t py-4"><p className="text-sm font-medium">Nenhum atendimento realizado ainda.</p><p className="mt-1 text-sm text-muted-foreground">Seu histórico aparecerá aqui após o primeiro atendimento.</p></div> : <div className="divide-y border-y">{visibleHistory.map((appointment) => <article key={appointment.id} className="py-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0">{identity(appointment)}<p className="mt-2 text-sm text-muted-foreground">{formatAppointmentDateTime(appointment.data, appointment.hora_inicio, appointment.hora_fim).compact}</p></div><StatusBadge status={appointment.status} /></div><HistoryActions appointment={appointment} bookingHref={bookingHref} establishmentId={establishmentId} guestPhone={guestPhone} showReviews={showReviews} /></article>)}</div>}{history.length > INITIAL_HISTORY_SIZE && <Button type="button" variant="ghost" className="mt-3 w-full border sm:w-auto" aria-expanded={showAllHistory} onClick={() => setShowAllHistory((visible) => !visible)}>{showAllHistory ? "Mostrar menos" : `Ver histórico completo (${history.length})`}</Button>}</section><CancelDialog appointment={cancelAppointment} establishmentId={establishmentId} guestPhone={guestPhone} onClose={() => setCancelAppointment(null)} onSuccess={completeCancel} /></div>;
}
