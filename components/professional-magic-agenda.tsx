"use client";

import { CalendarDays, LogOut, MessageCircle, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { timeRange } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

type Appointment = { id: string; cliente_nome: string | null; cliente_telefone: string | null; data: string; hora_inicio: string; hora_fim: string; status: AppointmentStatus; observacoes: string | null; servicoNome: string | null };

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : (digits.length === 10 || digits.length === 11 ? `55${digits}` : digits);
  return normalized.length >= 12 ? `https://wa.me/${normalized}` : null;
}

function dateLabel(date: string, today: string, tomorrow: string) {
  if (date === today) return "Hoje";
  if (date === tomorrow) return "Amanhã";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short" }).format(new Date(year, month - 1, day, 12)).replace("-feira", "").replace(".", "");
}

export function ProfessionalMagicAgenda({ professionalName, establishmentName, appointments, today, tomorrow, nextAppointment }: { professionalName: string; establishmentName: string; appointments: Appointment[]; today: string; tomorrow: string; nextAppointment: Appointment | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const period = params.get("period") === "tomorrow" ? "tomorrow" : params.get("period") === "upcoming" ? "upcoming" : "today";
  const groups = appointments.reduce<Record<string, Appointment[]>>((result, appointment) => { (result[appointment.data] ??= []).push(appointment); return result; }, {});
  const choose = (next: string) => router.replace(next === "today" ? "/p" : `/p?period=${next}`);

  return <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-5 pb-10 sm:px-6 sm:py-8"><header className="mb-6 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-primary">{establishmentName}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Minha agenda</h1><p className="mt-1 truncate text-sm text-muted-foreground">{professionalName}</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" className="size-11 px-0" aria-label="Atualizar agenda" onClick={() => router.refresh()}><RefreshCw size={18}/></Button><form action="/p/logout" method="post"><Button type="submit" variant="ghost" className="size-11 px-0" aria-label="Sair deste dispositivo"><LogOut size={18}/></Button></form></div></header>
    <nav aria-label="Período da agenda" className="mb-6 grid grid-cols-3 rounded-lg bg-muted p-1"><button type="button" onClick={() => choose("today")} aria-current={period === "today" ? "page" : undefined} className={`min-h-11 rounded-md px-2 text-sm font-semibold ${period === "today" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Hoje</button><button type="button" onClick={() => choose("tomorrow")} aria-current={period === "tomorrow" ? "page" : undefined} className={`min-h-11 rounded-md px-2 text-sm font-semibold ${period === "tomorrow" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Amanhã</button><button type="button" onClick={() => choose("upcoming")} aria-current={period === "upcoming" ? "page" : undefined} className={`min-h-11 rounded-md px-2 text-sm font-semibold ${period === "upcoming" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Próximos</button></nav>
    {appointments.length ? <div className="space-y-7">{Object.entries(groups).map(([date, entries]) => <section key={date}><h2 className="mb-2 text-sm font-semibold text-muted-foreground">{dateLabel(date, today, tomorrow)}</h2><div className="divide-y rounded-lg border px-4">{entries.map((appointment) => { const whatsapp = appointment.cliente_telefone ? whatsappHref(appointment.cliente_telefone) : null; return <article key={appointment.id} className="py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold"><time>{timeRange(appointment.hora_inicio, appointment.hora_fim)}</time><span className="ml-2 font-normal text-muted-foreground">{appointment.cliente_nome || "Cliente"}</span></p><p className="mt-1 truncate text-sm">{appointment.servicoNome || "Serviço"}</p>{appointment.observacoes && <p className="mt-1 text-sm text-muted-foreground">{appointment.observacoes}</p>}</div><StatusBadge status={appointment.status}/></div>{whatsapp && <a className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/> WhatsApp</a>}</article>; })}</div></section>)}</div> : <section className="py-10 text-center"><CalendarDays className="mx-auto text-muted-foreground" size={28}/><h2 className="mt-3 font-semibold">{period === "today" ? "Nenhum atendimento para hoje." : period === "tomorrow" ? "Nenhum atendimento para amanhã." : "Nenhum atendimento agendado."}</h2>{nextAppointment ? <><p className="mt-1 text-sm text-muted-foreground">Próximo atendimento: {dateLabel(nextAppointment.data, today, tomorrow)} às {nextAppointment.hora_inicio.slice(0, 5)}.</p><Button variant="secondary" className="mt-4" onClick={() => choose(nextAppointment.data === tomorrow ? "tomorrow" : "upcoming")}>Ver próximos</Button></> : <p className="mt-1 text-sm text-muted-foreground">Nenhum atendimento futuro.</p>}</section>}
  </main>;
}
