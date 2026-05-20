import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres")
});

export const signupSchema = loginSchema.extend({
  nome: z.string().min(2, "Informe seu nome"),
  telefone: z.string().min(8, "Informe um telefone").optional()
});

export const resetSchema = z.object({
  email: z.string().email("Informe um e-mail valido")
});
