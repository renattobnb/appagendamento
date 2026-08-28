"use client";

import { BellRing, CalendarDays, CheckCircle2, LogOut, MessageCircle, MoreHorizontal, RefreshCw, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { timeRange } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

type Appointment = { id: string; cliente_nome: string | null; cliente_telefone: string | null; data: string; hora_inicio: string; hora_fim: string; status: AppointmentStatus; observacoes: string | null; servicoNome: string | null };
type DialogAction = { kind: "finish" | "cancel"; appointment: Appointment } | null;
const quickReasons = ["Cliente solicitou", "Profissional indisponível", "Imprevisto", "Erro no agendamento"];

function friendlyDate(date: string, today: string, tomorrow: string) {
  if (date === today) return "Hoje";
  if (date === tomorrow) return "Amanhã";
  const value = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)).replaceAll(".", "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : (digits.length === 10 || digits.length === 11 ? `55${digits}` : digits);
  return normalized.length >= 12 ? `https://wa.me/${normalized}` : null;
}

function fortalezaTime() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("hour")}:${part("minute")}`;
}

function AppointmentDialog({ action, today, tomorrow, onClose, onSuccess, onDone }: { action: DialogAction; today: string; tomorrow: string; onClose: () => void; onSuccess: (appointmentId: string) => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [other, setOther] = useState(false);
  const [loading, setLoading] = useState(false);
  const finish = action?.kind === "finish";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [loading, onClose]);

  if (!action) return null;
  const { appointment } = action;
  const submit = async () => {
    if (!finish && reason.trim().length < 5) return toast.error("Selecione um motivo ou explique o cancelamento.");
    setLoading(true);
    try {
      const response = await fetch(`/p/api/appointments/${finish ? "finish" : "cancel"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_id: appointment.id, ...(finish ? {} : { motivo: reason.trim() }) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return toast.error(payload.error ?? "Não foi possível atualizar o atendimento.");
      toast.success(finish ? "Atendimento finalizado." : "Atendimento cancelado.");
      onSuccess(appointment.id); onClose(); onDone();
    } finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="agenda-action-title" className="w-full rounded-t-2xl bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl sm:max-w-md sm:rounded-xl sm:p-5">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" />
      <div className="flex items-start justify-between gap-3"><h2 id="agenda-action-title" className="text-lg font-bold">{finish ? "Finalizar atendimento?" : "Cancelar atendimento"}</h2><Button type="button" variant="ghost" className="size-11 shrink-0 px-0" aria-label="Fechar" onClick={onClose} disabled={loading}><X size={18}/></Button></div>
      <div className="mt-3 rounded-lg bg-muted/60 p-3"><p className="font-semibold">{appointment.cliente_nome || "Cliente"}</p><p className="mt-0.5 text-sm text-muted-foreground">{appointment.servicoNome || "Serviço"}</p><p className="mt-1 text-sm text-muted-foreground">{friendlyDate(appointment.data, today, tomorrow)} · {timeRange(appointment.hora_inicio, appointment.hora_fim)}</p></div>
      {!finish && <div className="mt-4"><p className="text-sm font-semibold">Motivo</p><div className="mt-2 flex flex-wrap gap-2">{quickReasons.map((item) => <button key={item} type="button" onClick={() => { setOther(false); setReason(item); }} className={`min-h-11 rounded-full border px-3 text-sm font-medium ${reason === item ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>{item}</button>)}<button type="button" onClick={() => { setOther(true); setReason(""); }} className={`min-h-11 rounded-full border px-3 text-sm font-medium ${other ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>Outro</button></div>{other && <textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} className="mt-3 min-h-24 w-full rounded-md border bg-background p-3 text-base" placeholder="Explique o cancelamento" disabled={loading}/>}</div>}
      <div className="mt-5 grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Voltar</Button><Button type="button" variant={finish ? "primary" : "danger"} onClick={submit} disabled={loading}>{loading ? "Salvando..." : finish ? "Finalizar" : "Cancelar atendimento"}</Button></div>
    </section>
  </div>;
}

export function ProfessionalMagicAgenda({ professionalName, establishmentName, appointments, history, today, tomorrow, nextAppointment }: { professionalName: string; establishmentName: string; appointments: Appointment[]; history: Appointment[]; today: string; tomorrow: string; nextAppointment: Appointment | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const period = params.get("period") === "tomorrow" ? "tomorrow" : params.get("period") === "upcoming" ? "upcoming" : "today";
  const view = params.get("view") === "history" ? "history" : "active";
  const [action, setAction] = useState<DialogAction>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [currentTime, setCurrentTime] = useState(fortalezaTime);
  const activeAppointments = appointments.filter((item) => !removedIds.has(item.id));
  const visible = view === "history" ? history : activeAppointments;
  const groups = useMemo(() => visible.reduce<Record<string, Appointment[]>>((result, item) => { (result[item.data] ??= []).push(item); return result; }, {}), [visible]);
  const navigate = (nextPeriod = period, nextView = view) => router.replace(`/p?period=${nextPeriod}${nextView === "history" ? "&view=history" : ""}`);
  const activeToday = activeAppointments.filter((item) => item.data === today).length;
  const nextToday = period === "today" ? activeAppointments.find((item) => item.data === today && item.hora_fim.slice(0, 5) > currentTime) : null;

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(fortalezaTime()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const source = new EventSource("/p/api/agenda/events");
    const onChange = (event: MessageEvent<string>) => { const payload = JSON.parse(event.data) as { new?: boolean }; toast.info(payload.new ? "Novo agendamento recebido" : "Agenda atualizada"); router.refresh(); };
    source.addEventListener("change", onChange);
    return () => { source.removeEventListener("change", onChange); source.close(); };
  }, [router]);

  async function confirm(appointment: Appointment) {
    setPendingId(appointment.id);
    try {
      const response = await fetch("/p/api/appointments/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointment_id: appointment.id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return toast.error(payload.error ?? "Não foi possível confirmar o atendimento.");
      toast.success("Atendimento confirmado."); router.refresh();
    } finally { setPendingId(null); }
  }

  return <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-4 pb-8 sm:px-6 sm:py-6"><header className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-primary">{establishmentName}</p><h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Minha agenda</h1><p className="mt-0.5 truncate text-sm text-muted-foreground">{professionalName}</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" className="size-11 px-0" aria-label="Atualizar agenda" onClick={() => router.refresh()}><RefreshCw size={18}/></Button><form action="/p/logout" method="post"><Button type="submit" variant="ghost" className="size-11 px-0" aria-label="Sair deste dispositivo"><LogOut size={18}/></Button></form></div></header>
    <div className="mt-3"><PushSubscriptionManager secureProfessionalAccess compactWhenGranted /></div>
    <nav aria-label="Área da agenda" className="mt-3 flex gap-5 border-b"><button type="button" onClick={() => navigate(period, "active")} aria-current={view === "active" ? "page" : undefined} className={`min-h-10 border-b-2 px-1 text-sm font-semibold ${view === "active" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>Agenda</button><button type="button" onClick={() => navigate(period, "history")} aria-current={view === "history" ? "page" : undefined} className={`min-h-10 border-b-2 px-1 text-sm font-semibold ${view === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>Histórico</button></nav>
    {view === "active" && <><nav aria-label="Período da agenda" className="mt-2 grid grid-cols-3 rounded-lg bg-muted p-0.5">{(["today", "tomorrow", "upcoming"] as const).map((item) => <button key={item} type="button" onClick={() => navigate(item, "active")} aria-current={period === item ? "page" : undefined} className={`min-h-10 rounded-md px-2 text-sm font-semibold ${period === item ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{item === "today" ? "Hoje" : item === "tomorrow" ? "Amanhã" : "Próximos"}</button>)}</nav><p className="mt-2 text-sm font-medium text-muted-foreground">{period === "today" ? `${activeToday} atendimentos restantes hoje` : `${activeAppointments.length} próximos atendimentos`}</p></>}
    {nextToday && view === "active" && <section className="mt-3 border-l-2 border-primary pl-3"><p className="text-xs font-bold uppercase tracking-wide text-primary">Próximo</p><p className="mt-0.5 font-semibold">{timeRange(nextToday.hora_inicio, nextToday.hora_fim)} · {nextToday.cliente_nome || "Cliente"}</p><p className="text-sm text-muted-foreground">{nextToday.servicoNome || "Serviço"}</p></section>}
    {visible.length ? <div className="mt-4 space-y-5">{Object.entries(groups).map(([date, entries]) => <section key={date}><h2 className="mb-1.5 text-sm font-semibold text-muted-foreground">{friendlyDate(date, today, tomorrow)}</h2><div className="divide-y border-y">{entries.map((appointment) => { const whatsapp = appointment.cliente_telefone ? whatsappHref(appointment.cliente_telefone) : null; const confirmed = appointment.status === "confirmado"; const pending = appointment.status === "pendente"; const active = pending || confirmed; const isLoading = pendingId === appointment.id; return <article key={appointment.id} className="py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-lg font-bold leading-none">{timeRange(appointment.hora_inicio, appointment.hora_fim)}</p><p className="mt-2 break-words font-semibold">{appointment.cliente_nome || "Cliente"}</p><p className="mt-0.5 break-words text-sm text-muted-foreground">{appointment.servicoNome || "Serviço"}</p></div><StatusBadge status={appointment.status}/></div><div className="mt-3 flex items-center gap-2">{whatsapp && <a className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary hover:bg-muted" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> WhatsApp</a>}{pending && <Button type="button" className="ml-auto min-h-11 px-3" disabled={isLoading} onClick={() => confirm(appointment)}>{isLoading ? "Confirmando..." : "Confirmar"}</Button>}{confirmed && <Button type="button" className="ml-auto min-h-11 px-3" onClick={() => setAction({ kind: "finish", appointment })}><CheckCircle2 size={16}/> Finalizar</Button>}{active && <div className="relative"><Button type="button" variant="ghost" className="size-11 px-0" aria-label="Mais ações" aria-expanded={openMenuId === appointment.id} onClick={() => setOpenMenuId(openMenuId === appointment.id ? null : appointment.id)}><MoreHorizontal size={20}/></Button>{openMenuId === appointment.id && <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border bg-background p-1 shadow-lg"><button type="button" className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => { setOpenMenuId(null); setAction({ kind: "cancel", appointment }); }}>Cancelar atendimento</button></div>}</div>}</div></article>; })}</div></section>)}</div> : <section className="py-9 text-center"><CalendarDays className="mx-auto text-muted-foreground" size={26}/><h2 className="mt-3 font-semibold">{view === "history" ? "Nenhum atendimento no histórico." : period === "today" ? "Nenhum atendimento para hoje." : period === "tomorrow" ? "Nenhum atendimento para amanhã." : "Nenhum atendimento agendado."}</h2>{view === "active" && nextAppointment && <><p className="mt-1 text-sm text-muted-foreground">Próximo: {friendlyDate(nextAppointment.data, today, tomorrow)} às {nextAppointment.hora_inicio.slice(0, 5)}.</p><Button variant="secondary" className="mt-3" onClick={() => navigate(nextAppointment.data === tomorrow ? "tomorrow" : "upcoming", "active")}>Ver próximos</Button></>}</section>}
    <AppointmentDialog action={action} today={today} tomorrow={tomorrow} onClose={() => setAction(null)} onSuccess={(appointmentId) => setRemovedIds((current) => new Set(current).add(appointmentId))} onDone={() => router.refresh()} />
  </main>;
}
