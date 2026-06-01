import { redirect } from "next/navigation";

export default function LegacySchedulePage() {
  // Mantem compatibilidade com links antigos sem o slug do estabelecimento.
  redirect("/padrao/agendar");
}
