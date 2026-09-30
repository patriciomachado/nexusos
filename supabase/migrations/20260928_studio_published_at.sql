-- Data em que o post virou "publicado" pela primeira vez: base do streak de
-- dias seguidos postando, mostrado no Studio.
ALTER TABLE studio_scripts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE studio_scripts SET published_at = updated_at WHERE status = 'publicado' AND published_at IS NULL;
