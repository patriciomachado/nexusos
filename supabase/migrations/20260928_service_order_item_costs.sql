-- Cost per order line (used for parts cost and profit). The app already
-- writes these; this makes sure every database has them.
alter table public.service_order_items add column if not exists unit_cost numeric(12,2) not null default 0;
alter table public.service_order_items add column if not exists total_cost numeric(12,2) not null default 0;

notify pgrst, 'reload schema';
