-- Configuración de firmas obligatorias/opcionales del informe final por orden de trabajo.
-- Formato: {"tecnico": true, "supervisor": true, "administrador": true}
--   true  = firma obligatoria
--   false = firma opcional (se omite en el flujo de firmas)
-- NULL equivale a las tres firmas obligatorias (comportamiento histórico).
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS signature_config JSONB DEFAULT NULL;
