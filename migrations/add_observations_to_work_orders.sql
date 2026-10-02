-- Observaciones adicionales de la orden de trabajo (notas, instrucciones especiales, etc.).
-- Se capturan en los formularios de creación y edición de la orden.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS observations TEXT DEFAULT NULL;
