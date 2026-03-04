-- Script para sincronizar la tabla technical_visit_technicians
-- con el campo legacy assigned_technician

-- Primero, verificar el ID de Pedro Ramírez
SELECT id, name, role FROM users WHERE name LIKE '%Pedro%Ram%' OR name LIKE '%Ramirez%';

-- Verificar las visitas que tienen a Pedro Ramírez asignado
SELECT
    id,
    assigned_technician,
    status,
    visit_date
FROM technical_visits
WHERE status != 'deleted'
  AND (
    assigned_technician LIKE '%Pedro%Ram%'
    OR assigned_technician LIKE '%Pedro Ramírez%'
  )
ORDER BY id;

-- Ver los registros actuales en la tabla relacional
SELECT * FROM technical_visit_technicians
WHERE status = 'active'
ORDER BY visit_id;

-- IMPORTANTE: Descomentar las siguientes líneas después de verificar el ID de Pedro Ramírez
-- Asumiendo que el ID de Pedro Ramírez es 3 (verificar con la primera consulta)

/*
-- Insertar registros faltantes para las visitas de Pedro Ramírez
-- Solo si no existen ya

-- Para VT-2025-002660597963-002
INSERT INTO technical_visit_technicians (visit_id, technician_id, name, specialty, status)
SELECT 'VT-2025-002660597963-002', 3, 'Pedro Ramírez', 'Eléctrico', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM technical_visit_technicians
    WHERE visit_id = 'VT-2025-002660597963-002'
      AND technician_id = 3
      AND status = 'active'
);

-- Para VT-2025-00001
INSERT INTO technical_visit_technicians (visit_id, technician_id, name, specialty, status)
SELECT 'VT-2025-00001', 3, 'Pedro Ramírez', 'Eléctrico', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM technical_visit_technicians
    WHERE visit_id = 'VT-2025-00001'
      AND technician_id = 3
      AND status = 'active'
);

-- Para VT-2025-00003
INSERT INTO technical_visit_technicians (visit_id, technician_id, name, specialty, status)
SELECT 'VT-2025-00003', 3, 'Pedro Ramírez', 'Eléctrico', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM technical_visit_technicians
    WHERE visit_id = 'VT-2025-00003'
      AND technician_id = 3
      AND status = 'active'
);
*/

-- Verificar los resultados después de insertar
SELECT
    tvt.visit_id,
    tvt.technician_id,
    tvt.name,
    tvt.specialty,
    tv.status as visit_status,
    tv.assigned_technician
FROM technical_visit_technicians tvt
JOIN technical_visits tv ON tvt.visit_id = tv.id
WHERE tvt.status = 'active'
  AND tvt.technician_id = 3  -- Cambiar este ID según corresponda
ORDER BY tvt.visit_id;
