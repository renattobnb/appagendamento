import { cookies } from "next/headers";
import { PROFESSIONAL_ACCESS_COOKIE, resolveProfessionalAccess } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = (await cookies()).get(PROFESSIONAL_ACCESS_COOKIE)?.value;
  const access = token ? await resolveProfessionalAccess(token) : null;
  if (!access) return new Response("unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cancelled = false;
  let latest: { id: string; created_at: string; atualizado_em: string } | null = null;
  const service = createServiceClient();
  const loadLatest = async () => {
    const { data } = await service.from("agendamentos").select("id,created_at,atualizado_em").eq("profissional_id", access.professional_id).eq("estabelecimento_id", access.establishment_id).order("atualizado_em", { ascending: false }).limit(1).maybeSingle();
    return data;
  };
  latest = await loadLatest();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));
      const interval = setInterval(async () => {
        if (cancelled) return;
        const next = await loadLatest().catch(() => latest);
        if (next && (!latest || next.id !== latest.id || next.atualizado_em !== latest.atualizado_em)) {
          const isNew = !latest || next.created_at > latest.created_at;
          latest = next;
          controller.enqueue(encoder.encode(`event: change\ndata: {\"new\":${isNew}}\n\n`));
        } else controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);
      request.signal.addEventListener("abort", () => { cancelled = true; clearInterval(interval); controller.close(); }, { once: true });
    },
    cancel() { cancelled = true; }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
