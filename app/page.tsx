import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const supabase = hasSupabaseEnv() ? await createClient() : null;
  const { data: establishments } = supabase
    ? await supabase
        .from("estabelecimentos")
        .select("id, nome, slug, created_at")
        .order("created_at", { ascending: true })
    : { data: [] };

  if ((establishments ?? []).length === 1) {
    redirect(`/${establishments![0].slug}`);
  }

  return (
    <main>
      <Navbar />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center px-4 py-14 sm:px-6">
        <div className="mb-8">
          <span className="inline-flex rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
            Agenda Online
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Selecione o estabelecimento
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A tela principal agora direciona o cliente para a agenda do estabelecimento correto.
            O cadastro de novas empresas deve ficar em uma area administrativa, nao na home publica.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(establishments ?? []).map((establishment) => (
            <Link
              key={establishment.id}
              href={`/${establishment.slug}`}
              className="group flex items-center justify-between rounded-lg border bg-background p-4 transition hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 size={18} />
                </span>
                <div>
                  <p className="font-semibold">{establishment.nome}</p>
                  <p className="text-xs text-muted-foreground">/{establishment.slug}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>

        {(establishments ?? []).length === 0 && (
          <Card className="max-w-2xl border-dashed text-center">
            <Building2 size={38} className="mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Nenhum estabelecimento configurado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie o primeiro estabelecimento pelo painel administrativo ou aplique o seed/migracao
              correspondente no Supabase.
            </p>
          </Card>
        )}
      </section>
    </main>
  );
}
