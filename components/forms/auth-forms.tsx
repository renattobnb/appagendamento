"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, resetSchema, signupSchema, simpleLoginSchema } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof simpleLoginSchema>>({
    resolver: zodResolver(simpleLoginSchema),
    defaultValues: { nome: "", telefone: "" }
  });

  function onSubmit(values: z.infer<typeof simpleLoginSchema>) {
    localStorage.setItem("agenda_cliente_nome", values.nome);
    localStorage.setItem("agenda_cliente_whatsapp", values.telefone);
    document.cookie = `agenda_guest=${encodeURIComponent(values.telefone)}; path=/; max-age=2592000; SameSite=Lax`;
    toast.success("Dados salvos. Vamos escolher seu horario.");
    router.push("/agendar");
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
        data: { nome: values.nome, telefone: values.telefone, tipo_usuario: "cliente" }
      }
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        nome: values.nome,
        email: values.email,
        telefone: values.telefone,
        tipo_usuario: "cliente"
      });
    }

    toast.success("Cadastro criado. Verifique seu e-mail para confirmar a conta.");
    router.push("/login");
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

export function ResetPasswordForm() {
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" }
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${location.origin}/login`
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
