-- ============================================
-- MIGRACIÓN: Habilitar extensión UNACCENT
-- Fecha: 2026-01-23
-- Descripción: Habilita la extensión UNACCENT de PostgreSQL
-- para permitir comparaciones de texto ignorando acentos
-- ============================================

-- Habilitar extensión (requiere permisos de superusuario o CREATE en la BD)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Verificar que la extensión está activa
SELECT * FROM pg_extension WHERE extname = 'unaccent';

-- ============================================
-- NOTA: Después de ejecutar este script,
-- las consultas pueden usar UNACCENT() para comparar
-- textos ignorando acentos. Ejemplo:
--
-- SELECT * FROM users
-- WHERE UNACCENT(LOWER(name)) = UNACCENT(LOWER('José García'));
--
-- Esto encontrará coincidencias incluso si el nombre
-- está guardado como "Jose Garcia" (sin acentos)
-- ============================================
