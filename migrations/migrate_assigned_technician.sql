-- =====================================================
-- MIGRACIÓN: Sincronizar campo assigned_technician
-- =====================================================
-- Descripción: Actualiza el campo assigned_technician en la tabla
--              technical_visits con los nombres de los técnicos
--              asignados desde la tabla relacional
--              technical_visit_technicians
--
-- Fecha: 2025-11-13
-- Autor: Sistema de Gestión de Servicios DIG Group v2
-- =====================================================

-- Paso 1: Validar registros afectados (CONSULTA INFORMATIVA)
-- Esta consulta muestra cuántos registros tienen NULL en assigned_technician
-- pero tienen técnicos asignados en la tabla relacional

SELECT
  COUNT(DISTINCT tv.id) as total_registros_afectados,
  COUNT(tvt.id) as total_asignaciones_tecnicos
FROM technical_visits tv
LEFT JOIN technical_visit_technicians tvt
  ON tv.id = tvt.visit_id AND tvt.status = 'active'
WHERE tv.assigned_technician IS NULL
  AND tvt.id IS NOT NULL;

-- Paso 2: Mostrar ejemplos de registros que serán actualizados (CONSULTA INFORMATIVA)
-- Esta consulta muestra los primeros 10 registros que serán afectados

SELECT
  tv.id,
  tv.client,
  tv.visit_date,
  tv.assigned_technician as valor_actual,
  string_agg(tvt.name, ', ' ORDER BY tvt.name) as nuevo_valor
FROM technical_visits tv
LEFT JOIN technical_visit_technicians tvt
  ON tv.id = tvt.visit_id AND tvt.status = 'active'
WHERE tv.assigned_technician IS NULL
  AND tvt.id IS NOT NULL
GROUP BY tv.id, tv.client, tv.visit_date, tv.assigned_technician
LIMIT 10;

-- =====================================================
-- MIGRACIÓN PRINCIPAL
-- =====================================================

-- Paso 3: Actualizar campo assigned_technician para registros NULL
-- Esta es la migración principal que actualiza todos los registros

BEGIN;

-- Actualizar todas las visitas existentes con assigned_technician NULL
UPDATE technical_visits tv
SET assigned_technician = (
  SELECT string_agg(tvt.name, ', ' ORDER BY tvt.name)
  FROM technical_visit_technicians tvt
  WHERE tvt.visit_id = tv.id
    AND tvt.status = 'active'
)
WHERE tv.assigned_technician IS NULL
  AND EXISTS (
    SELECT 1
    FROM technical_visit_technicians tvt
    WHERE tvt.visit_id = tv.id
      AND tvt.status = 'active'
  );

-- Mostrar resumen de la actualización
SELECT
  'Migración completada' as mensaje,
  COUNT(*) as registros_actualizados
FROM technical_visits
WHERE assigned_technician IS NOT NULL
  AND assigned_technician != '';

COMMIT;

-- =====================================================
-- VALIDACIÓN POST-MIGRACIÓN
-- =====================================================

-- Paso 4: Validar que NO haya registros NULL con técnicos asignados
-- Esta consulta debe retornar 0 registros después de la migración

SELECT
  tv.id,
  tv.client,
  tv.assigned_technician,
  COUNT(tvt.id) as num_tecnicos,
  string_agg(tvt.name, ', ' ORDER BY tvt.name) as tecnicos_tabla_relacional
FROM technical_visits tv
LEFT JOIN technical_visit_technicians tvt
  ON tv.id = tvt.visit_id AND tvt.status = 'active'
WHERE tv.assigned_technician IS NULL
  AND tvt.id IS NOT NULL
GROUP BY tv.id, tv.assigned_technician
HAVING COUNT(tvt.id) > 0;

-- Resultado esperado: 0 registros

-- Paso 5: Validar sincronización correcta
-- Esta consulta verifica que assigned_technician coincida con la tabla relacional

SELECT
  COUNT(*) as registros_sincronizados_correctamente
FROM technical_visits tv
WHERE tv.assigned_technician = (
  SELECT string_agg(tvt.name, ', ' ORDER BY tvt.name)
  FROM technical_visit_technicians tvt
  WHERE tvt.visit_id = tv.id
    AND tvt.status = 'active'
)
OR (
  tv.assigned_technician IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM technical_visit_technicians tvt
    WHERE tvt.visit_id = tv.id
      AND tvt.status = 'active'
  )
);

-- Paso 6: Identificar inconsistencias (si las hay)
-- Esta consulta debe retornar 0 registros si todo está sincronizado

SELECT
  tv.id,
  tv.client,
  tv.assigned_technician as campo_actual,
  string_agg(tvt.name, ', ' ORDER BY tvt.name) as valor_tabla_relacional
FROM technical_visits tv
LEFT JOIN technical_visit_technicians tvt
  ON tv.id = tvt.visit_id AND tvt.status = 'active'
GROUP BY tv.id, tv.assigned_technician
HAVING tv.assigned_technician != string_agg(tvt.name, ', ' ORDER BY tvt.name)
  OR (tv.assigned_technician IS NULL AND COUNT(tvt.id) > 0)
  OR (tv.assigned_technician IS NOT NULL AND COUNT(tvt.id) = 0);

-- Resultado esperado: 0 registros

-- =====================================================
-- ESTADÍSTICAS FINALES
-- =====================================================

SELECT
  COUNT(*) as total_visitas,
  COUNT(tv.assigned_technician) as visitas_con_tecnicos_asignados,
  COUNT(*) - COUNT(tv.assigned_technician) as visitas_sin_tecnicos,
  ROUND(
    (COUNT(tv.assigned_technician)::NUMERIC / COUNT(*)::NUMERIC) * 100,
    2
  ) as porcentaje_con_tecnicos
FROM technical_visits tv;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
-- Instrucciones de uso:
-- 1. Revisar las consultas informativas (Pasos 1 y 2)
-- 2. Crear un BACKUP completo de la base de datos ANTES de ejecutar la migración
-- 3. Ejecutar la migración principal (Paso 3)
-- 4. Validar con las consultas de validación (Pasos 4, 5 y 6)
-- 5. Si todo está correcto, continuar con el deployment del código
-- 6. Si hay problemas, ejecutar ROLLBACK y restaurar desde el backup
-- =====================================================
