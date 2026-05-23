import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export interface Establishment {
  id: string;
  nome: string;
  slug: string;
  created_at: string;
}

export async function getEstablishmentBySlug(slug: string): Promise<Establishment | null> {
  if (!hasSupabaseEnv()) {
    // Retorna estabelecimento mockado para modo de demonstração
    if (slug === "padrao" || slug === "barbearia-do-ze" || slug === "salao-beauty") {
      return {
        id: "11111111-1111-1111-1111-111111111111",
        nome: slug === "padrao" ? "Estabelecimento Padrão" : slug === "barbearia-do-ze" ? "Barbearia do Zé" : "Salão Beauty",
        slug,
        created_at: new Date().toISOString()
      };
    }
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("estabelecimentos")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      console.warn("Estabelecimento não encontrado para o slug:", slug, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Erro ao buscar estabelecimento:", err);
    return null;
  }
}
