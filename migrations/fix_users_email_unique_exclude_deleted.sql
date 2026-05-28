-- ================================================
-- Script: fix_users_email_unique_exclude_deleted.sql
-- Descripcion: Cambiar el indice unico de email en users para que
--              excluya usuarios con status 'deleted'. Esto permite
--              crear nuevos usuarios con el mismo email que un
--              usuario previamente eliminado (soft delete).
-- Fecha: 2026-04-02
-- ================================================

-- Paso 1: Eliminar el indice unico actual (absoluto)
DROP INDEX IF EXISTS "users_email_key";

-- Paso 2: Crear indice unico parcial (excluye eliminados)
CREATE UNIQUE INDEX "users_email_key" ON "users"("email") WHERE status != 'deleted';

-- Verificar que el indice se creo correctamente
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexname = 'users_email_key';
