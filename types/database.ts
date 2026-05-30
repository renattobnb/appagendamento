export type UserRole = "administrador" | "profissional";
export type AppointmentStatus = "confirmado" | "pendente" | "cancelado" | "finalizado";

export type Database = {
  public: {
    Tables: {
      estabelecimentos: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["estabelecimentos"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string | null;
          tipo_usuario: UserRole;
          estabelecimento_id: string;
          created_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          tipo_usuario?: UserRole;
          estabelecimento_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      servicos: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          valor: number;
          duracao_minutos: number;
          ativo: boolean;
          estabelecimento_id: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          valor: number;
          duracao_minutos: number;
          ativo?: boolean;
          estabelecimento_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["servicos"]["Insert"]>;
      };
      profissionais: {
        Row: {
          id: string;
          nome: string;
          especialidade: string | null;
          telefone: string | null;
          foto_url: string | null;
          ativo: boolean;
          estabelecimento_id: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          especialidade?: string | null;
          telefone?: string | null;
          foto_url?: string | null;
          ativo?: boolean;
          estabelecimento_id: string;
          user_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profissionais"]["Insert"]>;
      };
      profissional_servicos: {
        Row: {
          profissional_id: string;
          servico_id: string;
          estabelecimento_id: string;
          created_at: string;
        };
        Insert: {
          profissional_id: string;
          servico_id: string;
          estabelecimento_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profissional_servicos"]["Insert"]>;
      };
      agendamentos: {
        Row: {
          id: string;
          cliente_id: string | null;
          cliente_nome: string | null;
          cliente_telefone: string | null;
          profissional_id: string;
          servico_id: string;
          data: string;
          hora_inicio: string;
          hora_fim: string;
          status: AppointmentStatus;
          observacoes: string | null;
          cancelado_por: string | null;
          motivo_cancelamento: string | null;
          cancelado_em: string | null;
          estabelecimento_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string | null;
          cliente_nome?: string | null;
          cliente_telefone?: string | null;
          profissional_id: string;
          servico_id: string;
          data: string;
          hora_inicio: string;
          hora_fim: string;
          status?: AppointmentStatus;
          observacoes?: string | null;
          cancelado_por?: string | null;
          motivo_cancelamento?: string | null;
          cancelado_em?: string | null;
          estabelecimento_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agendamentos"]["Insert"]>;
      };
      disponibilidade: {
        Row: {
          id: string;
          profissional_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          estabelecimento_id: string;
        };
        Insert: {
          id?: string;
          profissional_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          estabelecimento_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["disponibilidade"]["Insert"]>;
      };
      notificacoes_profissionais: {
        Row: {
          id: string;
          profissional_id: string;
          agendamento_id: string | null;
          estabelecimento_id: string;
          titulo: string;
          mensagem: string;
          lida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profissional_id: string;
          agendamento_id?: string | null;
          estabelecimento_id: string;
          titulo: string;
          mensagem: string;
          lida?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notificacoes_profissionais"]["Insert"]>;
      };
    };
  };
};
