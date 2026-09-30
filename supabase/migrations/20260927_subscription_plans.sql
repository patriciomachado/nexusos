-- Plans: Essencial and Pro.
-- Existing companies keep every feature (default 'pro'); trials always get Pro.
alter table public.subscriptions
    add column if not exists plan text not null default 'pro';

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
    add constraint subscriptions_plan_check check (plan in ('essencial', 'pro'));

notify pgrst, 'reload schema';
