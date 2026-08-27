import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function InvalidProfessionalAccessPage() {
  return <main className="grid min-h-[100dvh] place-items-center px-4 py-8"><Card className="w-full max-w-sm text-center"><h1 className="text-2xl font-bold">Acesso inválido</h1><p className="mt-3 text-sm text-muted-foreground">Este link não é mais válido. Solicite um novo acesso ao administrador.</p><Link className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary" href="/">Voltar para Agenda Online</Link></Card></main>;
}
