-- Precificação: tempo de bancada de cada serviço (usado no custo da hora).
alter table public.service_types add column if not exists estimated_time_minutes integer default 60;
