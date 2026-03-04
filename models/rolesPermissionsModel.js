const pool = require('../config/db');

// Obtener todos los permisos de un rol específico
const getPermissionsByRole = async (role_id) => {
  const query = `
    SELECT rp.id, rp.role_id, rp.permission_id, rp.status,
           p.name AS permission_name, p.description AS permission_description, p.module
    FROM roles_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = $1 AND rp.status = 'active'
    ORDER BY p.module ASC, p.name ASC
  `;
  const result = await pool.query(query, [role_id]);
  return result.rows;
};

// Asignar permiso a rol
const assignPermissionToRole = async (role_id, permission_id, user_id_registration) => {
  const query = `
    INSERT INTO roles_permissions (role_id, permission_id, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [role_id, permission_id, user_id_registration]);
  return result.rows[0];
};

// Remover permiso de rol
const removePermissionFromRole = async (role_id, permission_id, user_id_modification) => {
  const query = `
    UPDATE roles_permissions
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE role_id = $2 AND permission_id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [user_id_modification, role_id, permission_id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Asignar múltiples permisos a un rol (sobrescribe los existentes)
const syncPermissionsToRole = async (role_id, permission_ids, user_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Desactivar todos los permisos actuales del rol
    await client.query(`
      UPDATE roles_permissions
      SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
      WHERE role_id = $2
    `, [user_id, role_id]);

    // Insertar o reactivar los nuevos permisos
    for (const permission_id of permission_ids) {
      await client.query(`
        INSERT INTO roles_permissions (role_id, permission_id, status, user_id_registration, date_time_registration)
        VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)
        ON CONFLICT (role_id, permission_id)
        DO UPDATE SET status = 'active', user_id_modification = $3, date_time_modification = CURRENT_TIMESTAMP
      `, [role_id, permission_id, user_id]);
    }

    await client.query('COMMIT');

    // Retornar los permisos actualizados
    return await getPermissionsByRole(role_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getPermissionsByRole,
  assignPermissionToRole,
  removePermissionFromRole,
  syncPermissionsToRole
};
