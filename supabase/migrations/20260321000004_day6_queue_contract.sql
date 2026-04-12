-- 032_day6_queue_contract.sql
-- Day 6: additive queue/worker hardening.
-- Keeps the existing generation_queue shape and adds only operational indexes.

CREATE INDEX IF NOT EXISTS idx_generation_queue_task_status_created
    ON public.generation_queue(task_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_generation_logs_queue_created
    ON public.generation_logs(queue_id, created_at DESC);
