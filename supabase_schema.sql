-- Gestão AGF Centro de Ubá — schema Supabase
-- Cole este script inteiro em: Supabase > seu projeto > SQL Editor > New query > Run

-- Verificações diárias (uma por dia)
create table if not exists verificacoes (
  data date primary key,
  item_id integer not null,
  status text not null,
  observacao text default '',
  plano_acao text default '',
  prazo date,
  resolved boolean default false,
  resolved_at date,
  registrado_em timestamptz default now()
);

-- Funcionários
create table if not exists funcionarios (
  id text primary key,
  nome text not null,
  cargo text not null,
  celular text default '',
  ativo boolean default true,
  criado_em date not null default current_date
);

-- Leads de prospecção
create table if not exists leads (
  id text primary key,
  razao_social text not null,
  cnpj text default '',
  email text default '',
  endereco text default '',
  celular text default '',
  funcionario_id text,
  etapa text not null default 'prospeccao',
  historico jsonb not null default '[]',
  criado_em date not null default current_date
);

-- Vendas de produtos de terceiros
create table if not exists vendas (
  id text primary key,
  funcionario_id text not null,
  data date not null,
  itens jsonb not null default '{}',
  criado_em timestamptz default now(),
  atualizado_em timestamptz
);

-- Metas mensais de vendas por produto
create table if not exists metas (
  mes text primary key,
  itens jsonb not null default '{}'
);

-- Progresso de cursos obrigatórios por funcionário
create table if not exists cursos_progresso (
  funcionario_id text primary key,
  cursos jsonb not null default '{}'
);

-- RLS: acesso aberto (sem login), conforme decidido para este app interno
alter table verificacoes enable row level security;
alter table funcionarios enable row level security;
alter table leads enable row level security;
alter table vendas enable row level security;
alter table metas enable row level security;
alter table cursos_progresso enable row level security;

create policy "acesso total anon" on verificacoes for all using (true) with check (true);
create policy "acesso total anon" on funcionarios for all using (true) with check (true);
create policy "acesso total anon" on leads for all using (true) with check (true);
create policy "acesso total anon" on vendas for all using (true) with check (true);
create policy "acesso total anon" on metas for all using (true) with check (true);
create policy "acesso total anon" on cursos_progresso for all using (true) with check (true);
