import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Plus, Save, Trash2, UserPlus } from "lucide-react";
import { AdminActionForm } from "@/components/forms/admin-action-form";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminMaster } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type ActionResult = { ok: boolean; message?: string };
const failure = (message: string): ActionResult => ({ ok: false, message });
const success = (message: string): ActionResult => ({ ok: true, message });

export default async function AdminMasterPage() {
  let supabase;
  try {
    ({ supabase } = await requireAdminMaster());
  } catch {
    redirect("/padrao/admin/login");
  }

  const [{ data: establishments }, { data: users }] = await Promise.all([
    supabase.from("estabelecimentos").select("id, nome, slug, created_at").order("nome"),
    supabase.from("users").select("id, nome, email, tipo_usuario, estabelecimento_id").order("created_at", { ascending: false })
  ]);

  async function createEstablishment(formData: FormData) {
    "use server";
    const { supabase } = await requireAdminMaster();
    const nome = String(formData.get("nome") ?? "").trim();
    const slug = slugify(String(formData.get("slug") ?? "").trim() || nome);
    if (!nome || !slug) return failure("Informe nome e slug validos.");
    const { error } = await supabase.from("estabelecimentos").insert({ nome, slug });
    if (error) return failure(error.message);
    revalidatePath("/admin-master");
    revalidatePath("/");
    return success("Estabelecimento criado. Vincule um administrador abaixo.");
  }

  async function updateEstablishment(formData: FormData) {
    "use server";
    const { supabase } = await requireAdminMaster();
    const id = String(formData.get("id") ?? "");
    const nome = String(formData.get("nome") ?? "").trim();
    const slug = slugify(String(formData.get("slug") ?? "").trim() || nome);
    if (!id || !nome || !slug) return failure("Dados do estabelecimento invalidos.");
    const { error } = await supabase.from("estabelecimentos").update({ nome, slug }).eq("id", id);
    if (error) return failure(error.message);
    revalidatePath("/admin-master");
    revalidatePath("/");
    return success("Estabelecimento atualizado.");
  }

  async function deleteEstablishment(formData: FormData) {
    "use server";
    const { supabase } = await requireAdminMaster();
    const id = String(formData.get("id") ?? "");
    if (!id) return failure("Estabelecimento invalido.");
    const { error, count } = await supabase.from("estabelecimentos").delete({ count: "exact" }).eq("id", id);
    if (error) return failure(error.message);
    if (!count) return failure("Estabelecimento nao encontrado.");
    revalidatePath("/admin-master");
    revalidatePath("/");
    return success("Estabelecimento excluido.");
  }

  async function createAdministrator(formData: FormData) {
    "use server";
    await requireAdminMaster();
    const nome = String(formData.get("nome") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const estabelecimentoId = String(formData.get("estabelecimento_id") ?? "");
    if (!nome || !email || password.length < 8 || !estabelecimentoId) {
      return failure("Informe nome, e-mail, senha de ao menos 8 caracteres e estabelecimento.");
    }
    const service = createServiceClient();
    const { data: authUser, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });
    if (authError || !authUser.user) return failure(authError?.message ?? "Nao foi possivel criar o usuario.");
    const { error } = await service.from("users").upsert({
      id: authUser.user.id,
      nome,
      email,
      tipo_usuario: "administrador",
      estabelecimento_id: estabelecimentoId
    });
    if (error) return failure(error.message);
    revalidatePath("/admin-master");
    return success("Administrador criado e vinculado ao estabelecimento.");
  }

  async function linkAdministrator(formData: FormData) {
    "use server";
    await requireAdminMaster();
    const userId = String(formData.get("user_id") ?? "");
    const estabelecimentoId = String(formData.get("estabelecimento_id") ?? "");
    if (!userId || !estabelecimentoId) return failure("Usuario e estabelecimento sao obrigatorios.");
    const service = createServiceClient();
    const { error } = await service
      .from("users")
      .update({ tipo_usuario: "administrador", estabelecimento_id: estabelecimentoId })
      .eq("id", userId);
    if (error) return failure(error.message);
    revalidatePath("/admin-master");
    return success("Administrador vinculado ao estabelecimento selecionado.");
  }

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Master</h1>
          <p className="mt-2 text-muted-foreground">Gerencie estabelecimentos e os administradores vinculados. Os paineis por slug nao possuem estas opcoes.</p>
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Novo estabelecimento</h2>
          <AdminActionForm action={createEstablishment} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" successMessage="Estabelecimento criado.">
            <Input name="nome" placeholder="Nome do estabelecimento" required />
            <Input name="slug" placeholder="slug-da-url (opcional)" />
            <Button type="submit"><Plus size={16} /> Criar</Button>
          </AdminActionForm>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Criar administrador</h2>
          <AdminActionForm action={createAdministrator} className="mt-4 grid gap-3 md:grid-cols-2" successMessage="Administrador criado e vinculado.">
            <Input name="nome" placeholder="Nome" required />
            <Input name="email" type="email" placeholder="email@empresa.com" required />
            <Input name="password" type="password" placeholder="Senha inicial (minimo 8 caracteres)" required />
            <Select name="estabelecimento_id" defaultValue="" required>
              <option value="" disabled>Estabelecimento</option>
              {(establishments ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </Select>
            <Button type="submit" className="md:col-span-2"><UserPlus size={16} /> Criar e vincular administrador</Button>
          </AdminActionForm>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Estabelecimentos</h2>
          <div className="mt-4 space-y-3">
            {(establishments ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <AdminActionForm action={updateEstablishment} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" successMessage="Estabelecimento atualizado.">
                  <input type="hidden" name="id" value={item.id} />
                  <Input name="nome" defaultValue={item.nome} required />
                  <Input name="slug" defaultValue={item.slug} required />
                  <Button type="submit" title="Salvar"><Save size={16} /></Button>
                </AdminActionForm>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>/{item.slug}/admin</span>
                  <AdminActionForm action={deleteEstablishment} confirmMessage="Excluir este estabelecimento e seus dados vinculados?" successMessage="Estabelecimento excluido.">
                    <input type="hidden" name="id" value={item.id} />
                    <Button type="submit" variant="danger"><Trash2 size={16} /> Excluir</Button>
                  </AdminActionForm>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Vincular administrador existente</h2>
          <p className="mt-1 text-sm text-muted-foreground">A vinculação altera o tenant do administrador e define seu acesso apenas ao novo slug.</p>
          <div className="mt-4 space-y-3">
            {(users ?? []).filter((item) => item.tipo_usuario !== "admin_master").map((item) => (
              <AdminActionForm key={item.id} action={linkAdministrator} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]" successMessage="Administrador vinculado.">
                <input type="hidden" name="user_id" value={item.id} />
                <span className="self-center text-sm"><strong>{item.nome}</strong><br />{item.email}</span>
                <Select name="estabelecimento_id" defaultValue={item.estabelecimento_id} required>
                  {(establishments ?? []).map((establishment) => <option key={establishment.id} value={establishment.id}>{establishment.nome}</option>)}
                </Select>
                <Button type="submit">Vincular</Button>
              </AdminActionForm>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
