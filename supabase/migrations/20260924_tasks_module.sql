-- =============================================================================
-- Módulo Tarefas (rotina do administrador)
--
-- Only adds new tables and functions; no existing table is changed.
-- Safe to run more than once.
-- =============================================================================

-- Tarefas criadas pelo administrador (ou geradas a partir de um alerta de outro módulo)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
    notes TEXT,
    -- 1 urgente · 2 alta · 3 normal · 4 baixa
    priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 4),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
    -- Quando vou fazer (NULL = "Algum dia")
    do_date DATE,
    day_period TEXT CHECK (day_period IN ('morning', 'afternoon', 'evening')),
    do_time TIME,
    duration_minutes INTEGER CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
    -- Prazo final (opcional, separado da data de execução)
    deadline DATE,
    -- [{ "id": "...", "title": "...", "done": false }]
    subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- { "freq": "daily"|"weekly"|"monthly", "interval": 1, "weekdays": [1,3], "day_of_month": 10 }
    recurrence JSONB,
    series_id UUID,
    -- Quantas vezes a tarefa passou para o dia seguinte sem ser feita
    rollover_count INTEGER NOT NULL DEFAULT 0,
    -- Ligação com o alerta de outro módulo que originou a tarefa
    source_key TEXT,
    source_href TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_company_status_date ON tasks(company_id, status, do_date);
CREATE INDEX IF NOT EXISTS idx_tasks_company_deadline ON tasks(company_id, deadline) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_tasks_company_completed ON tasks(company_id, completed_at DESC) WHERE status = 'done';
CREATE INDEX IF NOT EXISTS idx_tasks_source_key ON tasks(company_id, source_key) WHERE source_key IS NOT NULL;

-- Lembretes (vários por tarefa)
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_due ON task_reminders(remind_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);

-- Estado dos alertas automáticos (adiar / marcar como resolvido)
CREATE TABLE IF NOT EXISTS task_alert_states (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    alert_key TEXT NOT NULL,
    snoozed_until DATE,
    dismissed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, alert_key)
);

-- Rotinas em checklist (abertura, fechamento...) que aparecem nos dias escolhidos
CREATE TABLE IF NOT EXISTS task_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
    -- 0 = domingo … 6 = sábado
    weekdays SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
    day_period TEXT NOT NULL DEFAULT 'morning' CHECK (day_period IN ('morning', 'afternoon', 'evening')),
    remind_time TIME,
    -- Último dia em que o lembrete da rotina foi enviado (evita repetir)
    last_reminded_on DATE,
    -- [{ "id": "...", "title": "..." }]
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_routines ADD COLUMN IF NOT EXISTS last_reminded_on DATE;

CREATE INDEX IF NOT EXISTS idx_task_routines_company ON task_routines(company_id);

CREATE TABLE IF NOT EXISTS task_routine_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES task_routines(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (routine_id, run_date)
);

CREATE INDEX IF NOT EXISTS idx_task_routine_runs_company_date ON task_routine_runs(company_id, run_date);

-- Inscrições de notificação push (celular / navegador)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_company ON push_subscriptions(company_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION tasks_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION tasks_touch_updated_at();

DROP TRIGGER IF EXISTS trg_task_routines_updated_at ON task_routines;
CREATE TRIGGER trg_task_routines_updated_at BEFORE UPDATE ON task_routines
    FOR EACH ROW EXECUTE FUNCTION tasks_touch_updated_at();

-- Passa para hoje as tarefas abertas de dias anteriores (estilo Sunsama)
CREATE OR REPLACE FUNCTION tasks_rollover(p_company_id UUID, p_today DATE)
RETURNS INTEGER AS $$
DECLARE
    moved INTEGER;
BEGIN
    UPDATE tasks
       SET do_date = p_today,
           rollover_count = rollover_count + 1
     WHERE company_id = p_company_id
       AND status = 'open'
       AND do_date IS NOT NULL
       AND do_date < p_today;
    GET DIAGNOSTICS moved = ROW_COUNT;
    RETURN moved;
END;
$$ LANGUAGE plpgsql;

-- Marca como enviados, de forma atômica, os lembretes vencidos (evita envio duplicado)
CREATE OR REPLACE FUNCTION claim_due_task_reminders(p_company_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 200)
RETURNS TABLE (reminder_id UUID, task_id UUID, company_id UUID, remind_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH due AS (
        SELECT r.id
          FROM task_reminders r
          JOIN tasks t ON t.id = r.task_id
         WHERE r.sent_at IS NULL
           AND r.remind_at <= now()
           AND r.remind_at > now() - interval '2 days'
           AND t.status = 'open'
           AND (p_company_id IS NULL OR r.company_id = p_company_id)
         ORDER BY r.remind_at
         LIMIT p_limit
         FOR UPDATE OF r SKIP LOCKED
    )
    UPDATE task_reminders r
       SET sent_at = now()
      FROM due
     WHERE r.id = due.id
    RETURNING r.id, r.task_id, r.company_id, r.remind_at;
END;
$$ LANGUAGE plpgsql;

-- Lembrete diário das rotinas: seleciona e marca numa única instrução, para
-- que dois chamadores ao mesmo tempo nunca enviem o mesmo lembrete.
CREATE OR REPLACE FUNCTION claim_due_routine_reminders(p_company_id UUID, p_today DATE, p_from TIME, p_to TIME)
RETURNS TABLE (routine_id UUID, company_id UUID, name TEXT, step_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    UPDATE task_routines r
       SET last_reminded_on = p_today
     WHERE r.is_active
       AND r.remind_time IS NOT NULL
       AND r.remind_time BETWEEN p_from AND p_to
       AND EXTRACT(DOW FROM p_today)::SMALLINT = ANY (r.weekdays)
       AND (r.last_reminded_on IS NULL OR r.last_reminded_on < p_today)
       AND (p_company_id IS NULL OR r.company_id = p_company_id)
       AND NOT EXISTS (
           SELECT 1 FROM task_routine_runs x
            WHERE x.routine_id = r.id AND x.run_date = p_today AND x.completed_at IS NOT NULL
       )
    RETURNING r.id, r.company_id, r.name, jsonb_array_length(r.steps);
END;
$$ LANGUAGE plpgsql;

-- RLS: o app acessa via service role nas rotas de API; as políticas abaixo
-- seguem o padrão dos outros módulos para acesso direto autenticado pelo Clerk.
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_alert_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_routine_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['tasks', 'task_reminders', 'task_alert_states', 'task_routines', 'task_routine_runs', 'push_subscriptions']
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_company_admin') THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL
                 USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> ''sub'' AND role IN (''admin'', ''owner'')))
                 WITH CHECK (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> ''sub'' AND role IN (''admin'', ''owner'')))',
                t || '_company_admin', t
            );
        END IF;
    END LOOP;
END $$;

-- As funções só devem ser chamadas pelo servidor (service role)
REVOKE ALL ON FUNCTION tasks_rollover(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_due_task_reminders(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION claim_due_routine_reminders(UUID, DATE, TIME, TIME) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION tasks_rollover(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION claim_due_task_reminders(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION claim_due_routine_reminders(UUID, DATE, TIME, TIME) TO service_role;
