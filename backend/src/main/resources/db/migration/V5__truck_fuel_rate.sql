-- V5: Per-truck rated fuel consumption (Phase 3 follow-up).
-- A nominal L/100km figure set per vehicle, used to estimate trip fuel from the
-- GPS distance covered. Nullable — existing trucks keep working; the estimate is
-- simply unavailable until a rate is entered. Additive and prod-safe.

ALTER TABLE trucks ADD COLUMN fuel_consumption_l100km double precision;
