# appAgendamento

Sistema online de agendamento para empresas de serviços.

## O que o sistema faz

O appAgendamento permite que clientes realizem agendamentos de forma simples pelo celular ou computador, escolhendo serviço, profissional, data e horário disponível.

## Principais funcionalidades

- Agendamento online com bloqueio de horários ocupados.
- Login simplificado do cliente com nome e WhatsApp.
- Painel do cliente com próximos agendamentos, histórico, cancelamento e avaliação.
- Painel do profissional com visualização dos próprios atendimentos.
- Confirmação e cancelamento de atendimento pelo profissional.
- Justificativa no cancelamento feito pelo profissional.
- Notificações via WhatsApp para novo agendamento, confirmação e cancelamento.
- Painel administrativo para gerenciar cadastros.
- Cadastro de estabelecimentos, serviços, profissionais, usuários e disponibilidades.
- Relacionamento entre profissional e serviço.
- Dashboard com gráfico de serviços por dia, separado por profissional e valor total.
- Controle multiempresa/multiestabelecimento.
- Interface moderna, responsiva e com modo escuro.

## Benefícios

- Reduz trabalho manual na agenda.
- Evita conflito de horários.
- Melhora a comunicação com clientes e profissionais.
- Organiza a operação em uma única plataforma.
- Permite acompanhar histórico, status e volume de atendimentos.

## Módulos

### Cliente

O cliente informa nome e WhatsApp, realiza o agendamento, acompanha próximos horários, visualiza histórico, cancela atendimentos futuros e avalia o serviço após a finalização.

### Profissional

O profissional acessa sua área, visualiza somente os seus atendimentos, confirma agendas, cancela com justificativa e dispara comunicação automática ao cliente.

### Administrador

O administrador gerencia os cadastros do sistema, acompanha os agendamentos, configura horários disponíveis e visualiza indicadores da operação.

## Integração WhatsApp

O sistema está preparado para integração com Evolution API, permitindo envio automático de mensagens quando:

- Um novo agendamento é realizado.
- O profissional confirma o atendimento.
- O profissional cancela o atendimento.

## Requisitos para implantação

- Dados do estabelecimento.
- Lista de serviços.
- Lista de profissionais.
- Disponibilidade de atendimento.
- Configuração da Evolution API para envio via WhatsApp.
- Ambiente de hospedagem para o app e serviços auxiliares.
