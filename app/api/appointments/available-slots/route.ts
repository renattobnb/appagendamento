import { getDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { buildSlots } from "@/lib/appointments";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

function addDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const servicoId = searchParams.get("servico_id");
  const profissionalId = searchParams.get("profissional_id");
  const date = searchParams.get("data");
  const estabelecimentoId = searchParams.get("estabelecimento_id");
  const requestedLookahead = Number(searchParams.get("lookahead_days") ?? 0);
  const lookaheadDays = Number.isFinite(requestedLookahead) ? Math.min(Math.max(Math.floor(requestedLookahead), 0), 31) : 0;
  if (!servicoId || !profissionalId || !date) return NextResponse.json({ error: "Parametros obrigatorios ausentes" }, { status: 400 });
  if (!hasSupabaseEnv()) return NextResponse.json({ slots: ["09:00", "10:30", "14:00", "15:30"], nextAvailable: null });

  const supabase = await createClient();
  const serviceQuery = supabase.from("servicos").select("duracao_minutos").eq("id", servicoId);
  const availabilityQuery = supabase.from("disponibilidade").select("hora_inicio,hora_fim,dia_semana").eq("profissional_id", profissionalId);
  const appointmentsQuery = supabase.from("agendamentos").select("data,hora_inicio,hora_fim").eq("profissional_id", profissionalId).gte("data", date).lte("data", addDays(date, lookaheadDays)).in("status", ["confirmado", "pendente"]);
  const linkQuery = supabase.from("profissional_servicos").select("profissional_id").eq("profissional_id", profissionalId).eq("servico_id", servicoId);
  if (estabelecimentoId) { serviceQuery.eq("estabelecimento_id", estabelecimentoId); availabilityQuery.eq("estabelecimento_id", estabelecimentoId); appointmentsQuery.eq("estabelecimento_id", estabelecimentoId); linkQuery.eq("estabelecimento_id", estabelecimentoId); }
  const [{ data: service }, { data: availability }, { data: appointments }, { data: professionalService }] = await Promise.all([serviceQuery.single(), availabilityQuery, appointmentsQuery, linkQuery.maybeSingle()]);
  if (!service || !professionalService) return NextResponse.json({ slots: [], nextAvailable: null });
  const slotsForDate = (targetDate: string) => {
    const dayAvailability = (availability ?? []).find((item) => item.dia_semana === getDay(new Date(`${targetDate}T00:00:00`)));
    if (!dayAvailability) return [];
    return buildSlots({ date: targetDate, start: dayAvailability.hora_inicio, end: dayAvailability.hora_fim, duration: service.duracao_minutos, busy: (appointments ?? []).filter((appointment) => appointment.data === targetDate) });
  };
  const slots = slotsForDate(date);
  let nextAvailable: { date: string; slot: string } | null = null;
  if (!slots.length && lookaheadDays) for (let offset = 1; offset <= lookaheadDays; offset += 1) { const nextDate = addDays(date, offset); const nextSlots = slotsForDate(nextDate); if (nextSlots[0]) { nextAvailable = { date: nextDate, slot: nextSlots[0] }; break; } }
  return NextResponse.json({ slots, nextAvailable });
}
