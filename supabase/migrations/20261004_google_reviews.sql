-- Avaliações do Google: a conta do Perfil da Empresa conectada por loja.
-- Os tokens ficam só aqui (acesso apenas pelo servidor).
create table if not exists public.google_connections (
  company_id uuid primary key references public.companies(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  google_email text,
  account_name text,          -- accounts/123
  location_name text,         -- locations/456
  location_title text,
  last_review_check timestamptz,
  connected_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;
drop policy if exists "Service role full access" on public.google_connections;
create policy "Service role full access" on public.google_connections for all to service_role using (true) with check (true);
