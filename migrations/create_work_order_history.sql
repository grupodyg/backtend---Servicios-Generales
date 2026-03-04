-- =====================================================
-- SCRIPT: Creación de tabla work_order_history
-- DESCRIPCIÓN: Sistema de auditoría y trazabilidad de órdenes de trabajo
-- FECHA: 2025-11-13
-- =====================================================

-- Crear tabla de historial de órdenes de trabajo
CREATE TABLE IF NOT EXISTS work_order_history (
    id SERIAL PRIMARY KEY,
    work_order_id VARCHAR(50) NOT NULL,
    user_id INTEGER,
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_work_order
        FOREIGN KEY (work_order_id)
        REFERENCES work_orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- Índices para optimizar consultas
CREATE INDEX idx_work_order_history_work_order_id ON work_order_history(work_order_id);
CREATE INDEX idx_work_order_history_user_id ON work_order_history(user_id);
CREATE INDEX idx_work_order_history_created_at ON work_order_history(created_at DESC);
CREATE INDEX idx_work_order_history_action_type ON work_order_history(action_type);

-- Comentarios para documentación
COMMENT ON TABLE work_order_history IS 'Registro completo de cambios y acciones realizadas en órdenes de trabajo';
COMMENT ON COLUMN work_order_history.action_type IS 'Tipo de acción: created, updated, status_changed, assigned, completed, etc.';
COMMENT ON COLUMN work_order_history.field_changed IS 'Campo específico modificado (para updates)';
COMMENT ON COLUMN work_order_history.old_value IS 'Valor anterior del campo (para auditoría)';
COMMENT ON COLUMN work_order_history.new_value IS 'Nuevo valor del campo';

-- =====================================================
-- FUNCIÓN: Registrar cambios automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION log_work_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_description TEXT;
    user_name TEXT;
BEGIN
    -- Determinar el tipo de operación
    IF TG_OP = 'INSERT' THEN
        -- Obtener nombre del usuario si existe
        SELECT CONCAT(first_name, ' ', last_name) INTO user_name
        FROM users WHERE id = NEW.assigned_to;

        INSERT INTO work_order_history (
            work_order_id,
            user_id,
            action_type,
            action_description,
            new_value
        ) VALUES (
            NEW.id,
            NEW.assigned_to,
            'created',
            'Orden de trabajo creada',
            NEW.status
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Detectar cambios en el estado
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO work_order_history (
                work_order_id,
                user_id,
                action_type,
                action_description,
                field_changed,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.assigned_to,
                'status_changed',
                CONCAT('Estado cambiado de "', OLD.status, '" a "', NEW.status, '"'),
                'status',
                OLD.status,
                NEW.status
            );
        END IF;

        -- Detectar cambios en la asignación
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO work_order_history (
                work_order_id,
                user_id,
                action_type,
                action_description,
                field_changed,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.assigned_to,
                'assigned',
                'Orden reasignada a nuevo técnico',
                'assigned_to',
                OLD.assigned_to::TEXT,
                NEW.assigned_to::TEXT
            );
        END IF;

        -- Detectar cambios en prioridad
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO work_order_history (
                work_order_id,
                user_id,
                action_type,
                action_description,
                field_changed,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.assigned_to,
                'priority_changed',
                CONCAT('Prioridad cambiada de "', OLD.priority, '" a "', NEW.priority, '"'),
                'priority',
                OLD.priority,
                NEW.priority
            );
        END IF;

        -- Detectar cambios en fecha programada
        IF OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date THEN
            INSERT INTO work_order_history (
                work_order_id,
                user_id,
                action_type,
                action_description,
                field_changed,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                NEW.assigned_to,
                'scheduled_date_changed',
                'Fecha programada modificada',
                'scheduled_date',
                OLD.scheduled_date::TEXT,
                NEW.scheduled_date::TEXT
            );
        END IF;

        -- Detectar cambios en descripción o notas
        IF OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO work_order_history (
                work_order_id,
                user_id,
                action_type,
                action_description,
                field_changed
            ) VALUES (
                NEW.id,
                NEW.assigned_to,
                'description_updated',
                'Descripción de la orden actualizada',
                'description'
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO work_order_history (
            work_order_id,
            user_id,
            action_type,
            action_description
        ) VALUES (
            OLD.id,
            OLD.assigned_to,
            'deleted',
            'Orden de trabajo eliminada'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Aplicar logging automático
-- =====================================================

DROP TRIGGER IF EXISTS work_order_changes_trigger ON work_orders;

CREATE TRIGGER work_order_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION log_work_order_changes();

-- =====================================================
-- DATOS INICIALES: Poblar historial de órdenes existentes
-- =====================================================

-- Insertar registro de creación para órdenes existentes que no tengan historial
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
    wo.assigned_to,
    'created',
    'Orden de trabajo creada',
    wo.status,
    wo.created_at
FROM work_orders wo
WHERE NOT EXISTS (
    SELECT 1 FROM work_order_history woh
    WHERE woh.work_order_id = wo.id
    AND woh.action_type = 'created'
)
ORDER BY wo.created_at;

-- =====================================================
-- VISTA: Historial enriquecido con información de usuarios
-- =====================================================

CREATE OR REPLACE VIEW work_order_history_view AS
SELECT
    woh.id,
    woh.work_order_id,
    woh.user_id,
    COALESCE(
        CONCAT(u.first_name, ' ', u.last_name),
        'Sistema'
    ) AS user_name,
    u.email AS user_email,
    woh.action_type,
    woh.action_description,
    woh.field_changed,
    woh.old_value,
    woh.new_value,
    woh.ip_address,
    woh.created_at,
    wo.work_order_number,
    wo.status AS current_status
FROM work_order_history woh
LEFT JOIN users u ON woh.user_id = u.id
LEFT JOIN work_orders wo ON woh.work_order_id = wo.id
ORDER BY woh.created_at DESC;

COMMENT ON VIEW work_order_history_view IS 'Vista enriquecida del historial con información de usuarios y órdenes';

-- =====================================================
-- FUNCIÓN: Registrar acciones manuales (para usar desde el backend)
-- =====================================================

CREATE OR REPLACE FUNCTION add_work_order_history_entry(
    p_work_order_id VARCHAR(50),
    p_user_id INTEGER,
    p_action_type VARCHAR(50),
    p_action_description TEXT,
    p_field_changed VARCHAR(100) DEFAULT NULL,
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_history_id INTEGER;
BEGIN
    INSERT INTO work_order_history (
        work_order_id,
        user_id,
        action_type,
        action_description,
        field_changed,
        old_value,
        new_value,
        ip_address,
        user_agent
    ) VALUES (
        p_work_order_id,
        p_user_id,
        p_action_type,
        p_action_description,
        p_field_changed,
        p_old_value,
        p_new_value,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO new_history_id;

    RETURN new_history_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_work_order_history_entry IS 'Función para registrar entradas de historial manualmente desde el backend';

-- =====================================================
-- PERMISOS
-- =====================================================

-- Ajustar según el usuario de tu base de datos
-- GRANT SELECT, INSERT ON work_order_history TO tu_usuario_app;
-- GRANT SELECT ON work_order_history_view TO tu_usuario_app;
-- GRANT USAGE, SELECT ON SEQUENCE work_order_history_id_seq TO tu_usuario_app;

COMMIT;
