-- ================================================
-- Script: fix_visit_type_inconsistency.sql
-- Descripción: Corregir órdenes de trabajo que tienen technical_visit_id
--              pero visit_type = 'sin_visita' (debería ser 'con_visita')
-- Fecha: 2026-01-21
-- ================================================

-- Ver órdenes afectadas antes de actualizar
SELECT id, visit_type, based_on_technical_visit, technical_visit_id
FROM work_orders
WHERE technical_visit_id IS NOT NULL
  AND visit_type = 'sin_visita';

-- Corregir los datos
UPDATE work_orders
SET visit_type = 'con_visita',
    based_on_technical_visit = true,
    date_time_modification = CURRENT_TIMESTAMP
WHERE technical_visit_id IS NOT NULL
  AND visit_type = 'sin_visita';

-- Verificar corrección
SELECT id, visit_type, based_on_technical_visit, technical_visit_id
FROM work_orders
WHERE technical_visit_id IS NOT NULL;
