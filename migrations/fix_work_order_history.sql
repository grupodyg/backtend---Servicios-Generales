-- =====================================================
-- SCRIPT: Correcciones finales para work_order_history
-- =====================================================

-- Poblar historial para órdenes existentes (verificar que assigned_technician existe)
INSERT INTO work_order_history (
    work_order_id,
    user_id,
    action_type,
    action_description,
    new_value,
    created_at
)
SELECT
    wo.id,
    wo.user_id_registration,
    'created',
    'Orden de trabajo creada',
    wo.status,
    wo.date_time_registration
FROM work_orders wo
WHERE NOT EXISTS (
    SELECT 1 FROM work_order_history woh
    WHERE woh.work_order_id = wo.id
    AND woh.action_type = 'created'
)
ORDER BY wo.date_time_registration;

-- Crear vista enriquecida con información de usuarios
CREATE OR REPLACE VIEW work_order_history_view AS
SELECT
    woh.id,
    woh.work_order_id,
    woh.user_id,
    COALESCE(u.name, 'Sistema') AS user_name,
    u.email AS user_email,
    woh.action_type,
    woh.action_description,
    woh.field_changed,
    woh.old_value,
    woh.new_value,
    woh.ip_address,
    woh.created_at,
    wo.status AS current_status
FROM work_order_history woh
LEFT JOIN users u ON woh.user_id = u.id
LEFT JOIN work_orders wo ON woh.work_order_id = wo.id
ORDER BY woh.created_at DESC;

COMMENT ON VIEW work_order_history_view IS 'Vista enriquecida del historial con información de usuarios y órdenes';
