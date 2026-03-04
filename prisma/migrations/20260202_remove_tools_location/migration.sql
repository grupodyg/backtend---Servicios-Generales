-- Migración: Eliminar columna "location" de la tabla "tools"
-- Fecha: 2026-02-02
-- Descripción: Se elimina la columna de ubicación de herramientas según requerimiento del usuario

-- Eliminar el índice de location primero
DROP INDEX IF EXISTS "idx_tools_location";

-- Eliminar la columna location de la tabla tools
ALTER TABLE "tools" DROP COLUMN IF EXISTS "location";
