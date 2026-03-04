-- ============================================================================
-- INVENTARIO DE OBJETOS - Base de datos: db_servicios_generales
-- Fecha de extraccion: 2026-03-04
-- Servidor: localhost:5432
-- ============================================================================
-- NOTA: Todos los objetos de esta BD estan gestionados por Prisma.
--       No existen funciones, triggers, vistas, procedimientos ni enums
--       fuera del control del schema.prisma.
--       Este archivo es SOLO de referencia/verificacion.
-- ============================================================================

-- ============================================================================
-- RESUMEN
-- ============================================================================
-- Extensiones:          1  (plpgsql - default PostgreSQL)
-- Tablas:              34  (todas definidas en schema.prisma)
-- Secuencias:          32  (auto-generadas por @default(autoincrement()))
-- Indices custom:      42  (definidos con @@index() en schema.prisma)
-- Foreign Keys:        40  (definidos con @relation() en schema.prisma)
-- Unique Constraints:  15  (definidos con @unique en schema.prisma)
-- Funciones:            0
-- Triggers:             0
-- Vistas:               0
-- Procedimientos:       0
-- Tipos ENUM:           0
-- ============================================================================

-- ============================================================================
-- CONSULTAS DE VERIFICACION
-- Ejecutar para confirmar el estado actual de la BD
-- ============================================================================

-- Resumen general de objetos
SELECT 'Tablas' AS tipo, COUNT(*) AS cantidad
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'
UNION ALL
SELECT 'Secuencias', COUNT(*)
FROM information_schema.sequences WHERE sequence_schema = 'public'
UNION ALL
SELECT 'Indices (total)', COUNT(*)
FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'Foreign Keys', COUNT(*)
FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
UNION ALL
SELECT 'Funciones', COUNT(*)
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f'
UNION ALL
SELECT 'Triggers', COUNT(*)
FROM pg_trigger tg JOIN pg_class c ON tg.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE NOT tg.tgisinternal AND n.nspname = 'public'
UNION ALL
SELECT 'Vistas', COUNT(*)
FROM pg_views WHERE schemaname = 'public';

-- Lista de tablas con conteo de registros (ejecutar individualmente)
-- SELECT schemaname, relname, n_live_tup
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public'
-- ORDER BY relname;
