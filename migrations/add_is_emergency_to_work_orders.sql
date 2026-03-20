-- Agregar columna is_emergency a work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
