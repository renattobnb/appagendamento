export type UserRole = "cliente" | "administrador" | "prestador";
export type AppointmentStatus = "confirmado" | "pendente" | "cancelado" | "finalizado";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string | null;
          tipo_usuario: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          tipo_usuario?: UserRole;
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
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          valor: number;
          duracao_minutos: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["servicos"]["Insert"]>;
      };
      profissionais: {
        Row: {
          id: string;
          nome: string;
          especialidade: string | null;
          foto_url: string | null;
          ativo: boolean;
        };
        Insert: {
          id?: string;
          nome: string;
          especialidade?: string | null;
          foto_url?: string | null;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profissionais"]["Insert"]>;
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
        };
        Insert: {
          id?: string;
          profissional_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
        };
        Update: Partial<Database["public"]["Tables"]["disponibilidade"]["Insert"]>;
      };
    };
  };
};
