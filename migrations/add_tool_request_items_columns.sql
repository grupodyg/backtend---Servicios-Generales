-- Migración: Agregar columnas faltantes a tool_request_items
-- Fecha: 2026-01-17
-- Descripción: Agrega campos para gestión completa de solicitudes de herramientas

-- Agregar columna para fecha de devolución prevista
ALTER TABLE tool_request_items
ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMP(6);

-- Agregar columna para fecha de devolución real
ALTER TABLE tool_request_items
ADD COLUMN IF NOT EXISTS actual_return_date TIMESTAMP(6);

-- Agregar columna para fecha de entrega
ALTER TABLE tool_request_items
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP(6);

-- Agregar columna para motivo de la solicitud
ALTER TABLE tool_request_items
ADD COLUMN IF NOT EXISTS reason VARCHAR(255);

-- Agregar columna para observaciones del item
ALTER TABLE tool_request_items
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Verificar estructura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tool_request_items'
ORDER BY ordinal_position;
