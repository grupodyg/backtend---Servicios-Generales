-- ============================================================================
-- SCRIPT PARA POBLAR EL HISTORIAL CON EVENTOS DE ÓRDENES EXISTENTES
-- ============================================================================
-- Este script crea eventos históricos para órdenes, reportes y fotos que ya
-- existían antes de la implementación del sistema de historial
-- ============================================================================

-- 1. Insertar eventos de CREACIÓN para todas las órdenes existentes
INSERT INTO work_order_history (
  work_order_id,
  user_id,
  action_type,
  action_description,
  field_changed,
  old_value,
  new_value,
  created_at
)
SELECT
  wo.id AS work_order_id,
  wo.user_id_registration AS user_id,
  'created' AS action_type,
  CONCAT(
    'Orden de trabajo creada - Cliente: ',
    COALESCE(wo.client, 'Sin cliente'),
    ', Servicio: ',
    wo.service_type
  ) AS action_description,
  NULL AS field_changed,
  NULL AS old_value,
  json_build_object(
    'service_type', wo.service_type,
    'priority', wo.priority,
    'assigned_technician', wo.assigned_technician,
    'visit_type', wo.visit_type
  )::text AS new_value,
  wo.date_time_registration AS created_at
FROM work_orders wo
WHERE wo.status != 'deleted'
  AND NOT EXISTS (
    SELECT 1
    FROM work_order_history woh
    WHERE woh.work_order_id = wo.id
      AND woh.action_type = 'created'
  );

-- 2. Insertar eventos de CREACIÓN DE REPORTES para todos los reportes existentes
INSERT INTO work_order_history (
  work_order_id,
  user_id,
  action_type,
  action_description,
  field_changed,
  old_value,
  new_value,
  created_at
)
SELECT
  dr.order_id AS work_order_id,
  dr.user_id_registration AS user_id,
  'report_created' AS action_type,
  CONCAT(
    'Reporte ',
    dr.id,
    ' creado por ',
    COALESCE(dr.technician, 'técnico'),
    ' - Progreso: ',
    COALESCE(dr.progress_percentage, 0),
    '%'
  ) AS action_description,
  'daily_report' AS field_changed,
  NULL AS old_value,
  json_build_object(
    'report_id', dr.id,
    'technician', dr.technician,
    'report_date', dr.report_date,
    'progress_percentage', dr.progress_percentage,
    'work_description', LEFT(dr.work_description, 100)
  )::text AS new_value,
  dr.date_time_registration AS created_at
FROM daily_reports dr
WHERE dr.status = 'active'
  AND dr.order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM work_order_history woh
    WHERE woh.work_order_id = dr.order_id
      AND woh.action_type = 'report_created'
      AND woh.new_value::jsonb->>'report_id' = dr.id::text
  );

-- 3. Insertar eventos de SUBIDA DE FOTOS para todos los reportes con fotos
INSERT INTO work_order_history (
  work_order_id,
  user_id,
  action_type,
  action_description,
  field_changed,
  old_value,
  new_value,
  created_at
)
SELECT
  dr.order_id AS work_order_id,
  COALESCE(rp.user_id_registration, dr.user_id_registration) AS user_id,
  'photos_uploaded' AS action_type,
  CONCAT(
    photo_counts.photo_count,
    ' fotografía(s) ',
    CASE photo_counts.photo_type
      WHEN 'before' THEN 'antes'
      WHEN 'after' THEN 'después'
      ELSE photo_counts.photo_type
    END,
    ' agregada(s) al reporte ',
    dr.id
  ) AS action_description,
  'report_photos' AS field_changed,
  NULL AS old_value,
  json_build_object(
    'report_id', dr.id,
    'photo_type', photo_counts.photo_type,
    'count', photo_counts.photo_count
  )::text AS new_value,
  photo_counts.min_date AS created_at
FROM (
  SELECT
    rp1.report_id,
    rp1.photo_type,
    COUNT(*) AS photo_count,
    MIN(rp1.date_time_registration) AS min_date
  FROM report_photos rp1
  WHERE rp1.status = 'active'
  GROUP BY rp1.report_id, rp1.photo_type
) AS photo_counts
JOIN daily_reports dr ON dr.id = photo_counts.report_id
LEFT JOIN report_photos rp ON rp.report_id = photo_counts.report_id AND rp.photo_type = photo_counts.photo_type
WHERE dr.order_id IS NOT NULL
  AND dr.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM work_order_history woh
    WHERE woh.work_order_id = dr.order_id
      AND woh.action_type = 'photos_uploaded'
      AND woh.new_value::jsonb->>'report_id' = dr.id::text
      AND woh.new_value::jsonb->>'photo_type' = photo_counts.photo_type
  )
GROUP BY
  dr.order_id,
  rp.user_id_registration,
  dr.user_id_registration,
  photo_counts.photo_count,
  photo_counts.photo_type,
  dr.id,
  photo_counts.min_date;

-- 4. Mostrar resumen de eventos insertados
SELECT
  'Eventos de creación de órdenes' AS tipo_evento,
  COUNT(*) AS cantidad
FROM work_order_history
WHERE action_type = 'created'
UNION ALL
SELECT
  'Eventos de creación de reportes' AS tipo_evento,
  COUNT(*) AS cantidad
FROM work_order_history
WHERE action_type = 'report_created'
UNION ALL
SELECT
  'Eventos de subida de fotos' AS tipo_evento,
  COUNT(*) AS cantidad
FROM work_order_history
WHERE action_type = 'photos_uploaded'
UNION ALL
SELECT
  'TOTAL de eventos' AS tipo_evento,
  COUNT(*) AS cantidad
FROM work_order_history
ORDER BY cantidad DESC;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
