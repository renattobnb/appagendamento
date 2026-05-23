"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, Phone, Loader2, Building } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { resetSchema, signupSchema, simpleLoginSchema } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const form = useForm<z.infer<typeof simpleLoginSchema>>({
    resolver: zodResolver(simpleLoginSchema),
    defaultValues: { nome: "", telefone: "" }
  });

  function onSubmit(values: z.infer<typeof simpleLoginSchema>) {
    localStorage.setItem("agenda_cliente_nome", values.nome);
    localStorage.setItem("agenda_cliente_whatsapp", values.telefone);
    document.cookie = `agenda_guest=${encodeURIComponent(values.telefone)}; path=/; max-age=2592000; SameSite=Lax`;
    toast.success("Dados salvos. Vamos escolher seu horario.");
    router.push(tenantSlug ? `/${tenantSlug}/agendar` : "/agendar");
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field icon={<User size={16} />} error={form.formState.errors.nome?.message}>
        <Input placeholder="Seu nome" autoComplete="name" {...form.register("nome")} />
      </Field>
      <Field icon={<Phone size={16} />} error={form.formState.errors.telefone?.message}>
        <Input
          placeholder="WhatsApp com DDD"
          inputMode="tel"
          autoComplete="tel"
          {...form.register("telefone")}
        />
      </Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>
        Continuar
      </Button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { nome: "", email: "", password: "", telefone: "" }
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          nome: values.nome,
          telefone: values.telefone,
          tipo_usuario: "administrador",
          estabelecimento_slug: tenantSlug
        }
      }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cadastro criado. Verifique seu e-mail para confirmar a conta.");
    router.push(tenantSlug ? `/${tenantSlug}/login` : "/login");
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field icon={<User size={16} />} error={form.formState.errors.nome?.message}>
        <Input placeholder="Seu nome" {...form.register("nome")} />
      </Field>
      <Field icon={<Mail size={16} />} error={form.formState.errors.email?.message}>
        <Input placeholder="email@empresa.com" {...form.register("email")} />
      </Field>
      <Field icon={<Phone size={16} />} error={form.formState.errors.telefone?.message}>
        <Input placeholder="Telefone" {...form.register("telefone")} />
      </Field>
      <Field icon={<Lock size={16} />} error={form.formState.errors.password?.message}>
        <Input type="password" placeholder="Senha" {...form.register("password")} />
      </Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="animate-spin" size={16} />}
        Criar conta
      </Button>
    </form>
  );
}

const registerTenantSchema = z.object({
  estabelecimento_nome: z.string().min(3, "Nome do estabelecimento muito curto"),
  estabelecimento_slug: z
    .string()
    .min(3, "Slug da URL muito curto")
    .regex(/^[a-z0-9-]+$/, "O slug deve conter apenas letras minúsculas, números e hífens"),
  nome: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  telefone: z.string().optional()
});

export function RegisterTenantForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof registerTenantSchema>>({
    resolver: zodResolver(registerTenantSchema),
    defaultValues: {
      estabelecimento_nome: "",
      estabelecimento_slug: "",
      nome: "",
      email: "",
      password: "",
      telefone: ""
    }
  });

  async function onSubmit(values: z.infer<typeof registerTenantSchema>) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          nome: values.nome,
          telefone: values.telefone,
          tipo_usuario: "administrador",
          estabelecimento_slug: values.estabelecimento_slug,
          estabelecimento_nome: values.estabelecimento_nome
        }
      }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Estabelecimento e conta criados! Verifique seu e-mail para ativar.");
    router.push(`/${values.estabelecimento_slug}/login`);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
          <Building size={16} /> Dados da Empresa
        </h3>
        <Field icon={<Building size={16} />} error={form.formState.errors.estabelecimento_nome?.message}>
          <Input placeholder="Nome da Empresa (ex: Barbearia do Zé)" {...form.register("estabelecimento_nome")} />
        </Field>
        <Field icon={<Building size={16} />} error={form.formState.errors.estabelecimento_slug?.message}>
          <Input placeholder="Slug para a URL (ex: barbearia-do-ze)" {...form.register("estabelecimento_slug")} />
        </Field>
      </div>

      <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
          <User size={16} /> Conta de Administrador
        </h3>
        <Field icon={<User size={16} />} error={form.formState.errors.nome?.message}>
          <Input placeholder="Seu nome" {...form.register("nome")} />
        </Field>
        <Field icon={<Mail size={16} />} error={form.formState.errors.email?.message}>
          <Input placeholder="Seu e-mail" {...form.register("email")} />
        </Field>
        <Field icon={<Phone size={16} />} error={form.formState.errors.telefone?.message}>
          <Input placeholder="Telefone de contato" {...form.register("telefone")} />
        </Field>
        <Field icon={<Lock size={16} />} error={form.formState.errors.password?.message}>
          <Input type="password" placeholder="Senha de acesso" {...form.register("password")} />
        </Field>
      </div>

      <Button className="w-full py-6 text-md font-semibold" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="animate-spin" size={16} />}
        Cadastrar Empresa & Administrador
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string | undefined;
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" }
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${location.origin}/${tenantSlug || "padrao"}/login`
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Enviamos as instrucoes para seu e-mail.");
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field icon={<Mail size={16} />} error={form.formState.errors.email?.message}>
        <Input placeholder="email@empresa.com" {...form.register("email")} />
      </Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>
        Enviar recuperacao
      </Button>
    </form>
  );
}

function Field({
  icon,
  error,
  children
}: {
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <div className="[&_input]:pl-9">{children}</div>
      </div>
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

