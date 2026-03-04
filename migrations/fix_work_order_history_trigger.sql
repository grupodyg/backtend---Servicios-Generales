-- =====================================================
-- SCRIPT: Corrección del trigger de historial
-- DESCRIPCIÓN: Cambiar assigned_to por assigned_technician
-- FECHA: 2025-11-14
-- =====================================================

-- Recrear la función con el campo correcto
CREATE OR REPLACE FUNCTION log_work_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_description TEXT;
    user_name TEXT;
BEGIN
    -- Determinar el tipo de operación
    IF TG_OP = 'INSERT' THEN
        -- Obtener nombre del usuario si existe
        SELECT name INTO user_name
        FROM users WHERE id = NEW.user_id_registration;

        INSERT INTO work_order_history (
            work_order_id,
            user_id,
            action_type,
            action_description,
            new_value
        ) VALUES (
            NEW.id,
            NEW.user_id_registration,
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
                NEW.user_id_modification,
                'status_changed',
                CONCAT('Estado cambiado de "', OLD.status, '" a "', NEW.status, '"'),
                'status',
                OLD.status,
                NEW.status
            );
        END IF;

        -- Detectar cambios en la asignación de técnico
        IF OLD.assigned_technician IS DISTINCT FROM NEW.assigned_technician THEN
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
                NEW.user_id_modification,
                'assigned',
                CONCAT('Técnico reasignado de "', COALESCE(OLD.assigned_technician, 'Sin asignar'), '" a "', COALESCE(NEW.assigned_technician, 'Sin asignar'), '"'),
                'assigned_technician',
                OLD.assigned_technician,
                NEW.assigned_technician
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
                NEW.user_id_modification,
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
                NEW.user_id_modification,
                'scheduled_date_changed',
                'Fecha programada modificada',
                'scheduled_date',
                OLD.scheduled_date::TEXT,
                NEW.scheduled_date::TEXT
            );
        END IF;

        -- Detectar cambios en descripción
        IF OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO work_order_history (
                work_order_id,
                user_id,
                action_type,
                action_description,
                field_changed
            ) VALUES (
                NEW.id,
                NEW.user_id_modification,
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
            OLD.user_id_modification,
            'deleted',
            'Orden de trabajo eliminada'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mensaje de confirmación
SELECT 'Trigger log_work_order_changes() actualizado correctamente' AS resultado;
