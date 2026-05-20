# Agenda Online

Aplicativo moderno e responsivo de agendamento online com Next.js, TailwindCSS, Supabase Auth, PostgreSQL, Storage e Realtime.

## Arquitetura

- **Frontend:** Next.js App Router, React Server Components, TypeScript e TailwindCSS.
- **Backend:** Route Handlers do Next.js para regras transacionais de agendamento.
- **Banco:** PostgreSQL via Supabase com triggers para bloquear conflitos.
- **Autenticacao:** Supabase Auth com e-mail/senha, recuperacao de senha e Google OAuth opcional.
- **Arquivos:** Supabase Storage no bucket `profissionais`.
- **Tempo real:** Supabase Realtime para acompanhar mudancas em `agendamentos`.
- **Validacao:** Zod + React Hook Form no frontend e validacao repetida na API.
- **Seguranca:** RLS por perfil, middleware de rotas e policies no banco.

## Estrutura de Pastas

```txt
app/
  (auth)/                  Telas de login, cadastro e recuperacao
  admin/                   Painel administrativo
  agendar/                 Fluxo de agendamento
  cliente/                 Painel do cliente
  api/appointments/        APIs de horarios e criacao de agendamento
components/
  dashboard/               Componentes de indicadores
  forms/                   Formularios com React Hook Form + Zod
  ui/                      Componentes reutilizaveis
hooks/                     Hooks customizados, incluindo realtime
lib/
  supabase/                Clientes browser/server
  validations/             Schemas Zod
supabase/
  schema.sql               Tabelas, RLS, triggers e storage
  seed.sql                 Dados iniciais
types/                     Tipos do banco
```

## Modelagem do Banco

Tabelas principais:

- `users`: perfil do usuario autenticado, com `tipo_usuario` (`cliente`, `administrador`, `prestador`).
- `servicos`: catalogo com nome, descricao, valor, duracao e status ativo.
- `profissionais`: prestadores com especialidade e foto em Storage.
- `disponibilidade`: janelas semanais de atendimento por profissional.
- `agendamentos`: reservas com cliente, profissional, servico, data, horario, status e observacoes.

Regras criticas tambem ficam no banco por trigger:

- bloqueio de horarios passados;
- bloqueio de conflito para o mesmo profissional;
- validacao da disponibilidade semanal.

## Fluxo de Autenticacao

1. Usuario cria conta em `/cadastro`.
2. Supabase Auth registra o usuario.
3. Trigger `handle_new_auth_user` cria o perfil em `public.users`.
4. Middleware protege `/agendar`, `/cliente` e `/admin`.
5. `/admin` exige `tipo_usuario = administrador`.
6. Recuperacao de senha fica em `/recuperar-senha`.
7. Google OAuth pode ser ativado no painel do Supabase e ja possui botao no login.

## Instalação

1. Instale dependencias:

```bash
npm install
```

2. Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. No Supabase SQL Editor, execute:

```sql
-- primeiro
supabase/schema.sql

-- depois
supabase/seed.sql
```

4. Ative Realtime para a tabela `agendamentos` no painel do Supabase.

5. Rode o projeto:

```bash
npm run dev
```

## APIs

- `GET /api/appointments/available-slots`
  - Parametros: `servico_id`, `profissional_id`, `data`.
  - Retorna horarios livres calculados por duracao, disponibilidade e conflitos.

- `POST /api/appointments`
  - Cria agendamento autenticado.
  - Valida passado, disponibilidade, conflito e duracao automatica.

- `POST /api/webhooks/appointment-confirmation`
  - Ponto de extensao para WhatsApp API, e-mail automatico e Google Calendar.

## Funcionalidades Entregues

- Login, cadastro, recuperacao e Google OAuth opcional.
- Perfis `cliente`, `administrador` e `prestador`.
- Home responsiva com banner, servicos e agendamento rapido.
- Agendamento com servico, profissional, data, horario livre e bloqueio de conflito.
- Painel do cliente com proximos agendamentos, historico e status.
- Painel admin com metricas, ranking, calendario operacional e entrada para CRUDs.
- Dark mode, loading states, toasts, PWA manifest e hook de realtime.
- SQL completo com tabelas, RLS, policies, triggers, storage bucket e seed.

## Boas Práticas de Escalabilidade e Segurança

- Manter regras de conflito no banco e na API para defesa em profundidade.
- Usar Edge Functions ou fila para WhatsApp/e-mail quando houver alto volume.
- Criar tabela `empresas` e coluna `empresa_id` em todas as entidades para multiempresa.
- Versionar migrations em vez de editar SQL aplicado em producao.
- Usar `service_role` apenas em rotas servidoras e nunca no cliente.
- Criar logs de auditoria para alteracoes administrativas.
- Separar CRUDs administrativos em rotas/actions com checks de perfil.
- Exportacoes PDF/Excel devem rodar no servidor e respeitar RLS ou permissao admin.
