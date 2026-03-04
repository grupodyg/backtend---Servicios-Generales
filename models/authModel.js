const pool = require('../config/db');

/**
 * Buscar usuario por email con su rol y permisos
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} Usuario con todos sus datos, rol y permisos
 */
const findUserByEmail = async (email) => {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.password,
      u.role_id,
      u.phone,
      u.dni,
      u.address,
      u.position,
      u.specialty,
      u.last_activity,
      u.status,
      u.user_id_registration,
      u.date_time_registration,
      u.user_id_modification,
      u.date_time_modification,
      CASE
        WHEN LOWER(r.name) = 'administrador' THEN 'admin'
        WHEN LOWER(r.name) = 'supervisor' THEN 'supervisor'
        WHEN LOWER(r.name) IN ('técnico', 'tecnico') THEN 'tecnico'
        WHEN LOWER(r.name) = 'rrhh' THEN 'rrhh'
        ELSE LOWER(r.name)
      END AS role,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'description', p.description,
            'module', p.module
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN roles_permissions rp ON r.id = rp.role_id AND rp.status = 'active'
    LEFT JOIN permissions p ON rp.permission_id = p.id AND p.status = 'active'
    WHERE u.email = $1
      AND u.status = 'active'
    GROUP BY u.id, u.name, u.email, u.password, u.role_id, u.phone, u.dni, u.address,
             u.position, u.specialty, u.last_activity, u.status, u.user_id_registration,
             u.date_time_registration, u.user_id_modification, u.date_time_modification, r.name
  `;

  const result = await pool.query(query, [email]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Actualizar la última actividad de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<void>}
 */
const updateLastActivity = async (userId) => {
  const query = `
    UPDATE users
    SET last_activity = CURRENT_TIMESTAMP
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
};

module.exports = {
  findUserByEmail,
  updateLastActivity
};
