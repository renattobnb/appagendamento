import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres")
});

export const simpleLoginSchema = z.object({
  nome: z.string().min(2, "Informe seu nome"),
  telefone: z
    .string()
    .min(10, "Informe um WhatsApp valido")
    .regex(/^[\d\s()+-]+$/, "Use apenas numeros e sinais comuns")
});

export const signupSchema = loginSchema.extend({
  nome: z.string().min(2, "Informe seu nome"),
  telefone: z.string().min(8, "Informe um telefone").optional()
});

export const resetSchema = z.object({
  email: z.string().email("Informe um e-mail valido")
});
