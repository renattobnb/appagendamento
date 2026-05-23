import { z } from "zod";

export const appointmentSchema = z.object({
  servico_id: z.string().uuid(),
  profissional_id: z.string().uuid(),
  data: z.string().min(10),
  hora_inicio: z.string().min(5),
  cliente_nome: z.string().min(2).optional(),
  cliente_telefone: z.string().min(10).optional(),
  observacoes: z.string().max(500).optional(),
  estabelecimento_id: z.string().uuid()
});

