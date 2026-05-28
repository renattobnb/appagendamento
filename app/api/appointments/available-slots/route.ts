import { NextRequest, NextResponse } from "next/server";
import { getDay } from "date-fns";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { buildSlots } from "@/lib/appointments";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const servicoId = searchParams.get("servico_id");
  const profissionalId = searchParams.get("profissional_id");
  const date = searchParams.get("data");
  const estabelecimentoId = searchParams.get("estabelecimento_id");

  if (!servicoId || !profissionalId || !date) {
    return NextResponse.json({ error: "Parametros obrigatorios ausentes" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ slots: ["09:00", "10:30", "14:00", "15:30"] });
  }

  const supabase = await createClient();

  const serviceQuery = supabase
    .from("servicos")
    .select("duracao_minutos")
    .eq("id", servicoId);
  if (estabelecimentoId) serviceQuery.eq("estabelecimento_id", estabelecimentoId);

  const availQuery = supabase
    .from("disponibilidade")
    .select("hora_inicio,hora_fim")
    .eq("profissional_id", profissionalId)
    .eq("dia_semana", getDay(new Date(`${date}T00:00:00`)));
  if (estabelecimentoId) availQuery.eq("estabelecimento_id", estabelecimentoId);

  const apptsQuery = supabase
    .from("agendamentos")
    .select("hora_inicio,hora_fim")
    .eq("profissional_id", profissionalId)
    .eq("data", date)
    .in("status", ["confirmado", "pendente"]);
  if (estabelecimentoId) apptsQuery.eq("estabelecimento_id", estabelecimentoId);

  const linkQuery = supabase
    .from("profissional_servicos")
    .select("profissional_id")
    .eq("profissional_id", profissionalId)
    .eq("servico_id", servicoId);
  if (estabelecimentoId) linkQuery.eq("estabelecimento_id", estabelecimentoId);

  const [{ data: service }, { data: availability }, { data: appointments }, { data: professionalService }] =
    await Promise.all([
      serviceQuery.single(),
      availQuery.single(),
      apptsQuery,
      linkQuery.maybeSingle()
    ]);

  if (!service || !availability || !professionalService) {
    return NextResponse.json({ slots: [] });
  }

  const slots = buildSlots({
    date,
    start: availability.hora_inicio,
    end: availability.hora_fim,
    duration: service.duracao_minutos,
    busy: appointments ?? []
  });

  return NextResponse.json({ slots });
}
