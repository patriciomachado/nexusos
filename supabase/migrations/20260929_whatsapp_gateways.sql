-- WhatsApp without the Meta Cloud API: connect the store's own number by
-- QR code through a gateway (Evolution API or Z-API).
alter table public.alice_settings add column if not exists whatsapp_provider text not null default 'cloud';
alter table public.alice_settings drop constraint if exists alice_settings_whatsapp_provider_check;
alter table public.alice_settings add constraint alice_settings_whatsapp_provider_check
    check (whatsapp_provider in ('cloud', 'evolution', 'zapi'));

-- Evolution: server URL, instance name, API key. Z-API: instance id, instance token, client token.
alter table public.alice_settings add column if not exists whatsapp_gateway_url text;
alter table public.alice_settings add column if not exists whatsapp_gateway_instance text;
alter table public.alice_settings add column if not exists whatsapp_gateway_token text;
alter table public.alice_settings add column if not exists whatsapp_gateway_client_token text;
-- Secret in the webhook URL the gateway calls; identifies the store.
alter table public.alice_settings add column if not exists whatsapp_webhook_secret text;
create unique index if not exists alice_settings_webhook_secret_key on public.alice_settings (whatsapp_webhook_secret) where whatsapp_webhook_secret is not null;

notify pgrst, 'reload schema';
