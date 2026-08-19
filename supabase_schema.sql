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
  tem_contrato boolean not null default false,
  historico jsonb not null default '[]',
  criado_em date not null default current_date,
  faturamento_contrato numeric,
  faturamento_postagem numeric
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

-- Controle de entrega do prêmio do Bônus de Sexta (Heineken) por sexta-feira + funcionário.
-- id é sempre "AAAA-MM-DD_idDoFuncionario".
create table if not exists premios_sexta (
  id text primary key,
  data date not null,
  funcionario_id text not null,
  dado boolean not null default false,
  atualizado_em timestamptz default now()
);

-- RLS: acesso aberto (sem login), conforme decidido para este app interno
alter table verificacoes enable row level security;
alter table funcionarios enable row level security;
alter table leads enable row level security;
alter table vendas enable row level security;
alter table metas enable row level security;
alter table cursos_progresso enable row level security;
alter table premios_sexta enable row level security;

create policy "acesso total anon" on verificacoes for all using (true) with check (true);
create policy "acesso total anon" on funcionarios for all using (true) with check (true);
create policy "acesso total anon" on leads for all using (true) with check (true);
create policy "acesso total anon" on vendas for all using (true) with check (true);
create policy "acesso total anon" on metas for all using (true) with check (true);
create policy "acesso total anon" on cursos_progresso for all using (true) with check (true);
create policy "acesso total anon" on premios_sexta for all using (true) with check (true);

-- Migração: comissão de 5% sobre o faturamento do 1º mês do cliente prospectado.
-- Se a tabela "leads" já existir no seu banco (produção), rode só este bloco abaixo
-- no SQL Editor do Supabase para adicionar as duas colunas novas sem perder dados:
alter table leads add column if not exists faturamento_contrato numeric;
alter table leads add column if not exists faturamento_postagem numeric;

-- Migração: checkbox de "prêmio entregue" no Bônus de Sexta (Heineken).
-- Se o seu banco (produção) já tiver sido criado antes desta tabela existir, rode só
-- este bloco abaixo no SQL Editor do Supabase para criá-la sem perder nenhum dado:
create table if not exists premios_sexta (
  id text primary key,
  data date not null,
  funcionario_id text not null,
  dado boolean not null default false,
  atualizado_em timestamptz default now()
);
alter table premios_sexta enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'premios_sexta' and policyname = 'acesso total anon'
  ) then
    create policy "acesso total anon" on premios_sexta for all using (true) with check (true);
  end if;
end $$;
