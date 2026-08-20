-- V6: Job load weight + per-truck QR token (client feature round).
--
-- load_weight_tons: payload in tonnes, used to make the trip fuel estimate
-- load-aware. Deliberately NOT constrained against trucks.capacity_tons — the
-- client requires overloaded jobs to save normally.
--
-- qr_token: the secret behind the QR sticker in each truck's cab. A driver must
-- scan it to start a job, proving they are physically at the vehicle. Identity
-- still comes from the driver's login; this only proves presence.
-- Additive and prod-safe.

ALTER TABLE jobs ADD COLUMN load_weight_tons double precision;

ALTER TABLE trucks ADD COLUMN qr_token varchar(64);

-- Backfill existing trucks. gen_random_uuid() is core Postgres 13+, so no
-- pgcrypto extension is needed on Neon or the compose PG16.
UPDATE trucks SET qr_token = replace(gen_random_uuid()::text, '-', '') WHERE qr_token IS NULL;

ALTER TABLE trucks ALTER COLUMN qr_token SET NOT NULL;
ALTER TABLE trucks ADD CONSTRAINT uq_trucks_qr_token UNIQUE (qr_token);
