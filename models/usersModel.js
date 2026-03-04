const pool = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Obtener todos los usuarios con su rol y permisos
 * @param {Object} filters - Filtros opcionales (status, role_id, specialty)
 * @returns {Promise<Array>} Array de usuarios
 */
const getAllUsers = async (filters = {}) => {
  const { status = 'active', role_id, specialty } = filters;

  let query = `
    SELECT
      u.id,
      u.name,
      u.email,
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
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND u.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (role_id) {
    query += ` AND u.role_id = $${paramIndex}`;
    params.push(role_id);
    paramIndex++;
  }

  if (specialty) {
    query += ` AND u.specialty = $${paramIndex}`;
    params.push(specialty);
    paramIndex++;
  }

  query += `
    GROUP BY u.id, u.name, u.email, u.role_id, u.phone, u.dni, u.address,
             u.position, u.specialty, u.last_activity, u.status, u.user_id_registration,
             u.date_time_registration, u.user_id_modification, u.date_time_modification, r.name
    ORDER BY u.name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener un usuario por ID con su rol y permisos
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|null>} Usuario o null
 */
const getUserById = async (id) => {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
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
    WHERE u.id = $1
    GROUP BY u.id, u.name, u.email, u.role_id, u.phone, u.dni, u.address,
             u.position, u.specialty, u.last_activity, u.status, u.user_id_registration,
             u.date_time_registration, u.user_id_modification, u.date_time_modification, r.name
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<Object>} Usuario creado (sin password)
 */
const createUser = async (userData) => {
  const {
    name,
    email,
    password,
    role_id,
    phone,
    dni,
    address,
    position,
    specialty,
    user_id_registration
  } = userData;

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO users (
      name,
      email,
      password,
      role_id,
      phone,
      dni,
      address,
      position,
      specialty,
      status,
      user_id_registration,
      date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, CURRENT_TIMESTAMP)
    RETURNING id, name, email, role_id, phone, dni, address, position, specialty, status,
              user_id_registration, date_time_registration
  `;

  const result = await pool.query(query, [
    name,
    email,
    hashedPassword,
    role_id,
    phone,
    dni,
    address,
    position,
    specialty,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Actualizar un usuario
 * @param {number} id - ID del usuario
 * @param {Object} userData - Datos a actualizar
 * @returns {Promise<Object|null>} Usuario actualizado o null
 */
const updateUser = async (id, userData) => {
  const {
    name,
    email,
    role_id,
    phone,
    dni,
    address,
    position,
    specialty,
    status,
    user_id_modification
  } = userData;

  const query = `
    UPDATE users
    SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      role_id = COALESCE($3, role_id),
      phone = COALESCE($4, phone),
      dni = COALESCE($5, dni),
      address = COALESCE($6, address),
      position = COALESCE($7, position),
      specialty = COALESCE($8, specialty),
      status = COALESCE($9, status),
      user_id_modification = $10,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING id, name, email, role_id, phone, dni, address, position, specialty, status,
              user_id_registration, date_time_registration, user_id_modification, date_time_modification
  `;

  const result = await pool.query(query, [
    name,
    email,
    role_id,
    phone,
    dni,
    address,
    position,
    specialty,
    status,
    user_id_modification,
    id
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar un usuario (hard delete)
 * @param {number} id - ID del usuario
 * @param {number} user_id - ID del usuario que realiza la acción
 * @returns {Promise<Object|null>} Usuario eliminado o null
 */
const deleteUser = async (id, user_id) => {
  const query = `
    DELETE FROM users
    WHERE id = $1
    RETURNING id, name, email, role_id, status
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Cambiar contraseña de un usuario
 * @param {number} id - ID del usuario
 * @param {string} newPassword - Nueva contraseña
 * @param {number} user_id_modification - ID del usuario que realiza el cambio
 * @returns {Promise<Object|null>} Usuario actualizado o null
 */
const changePassword = async (id, newPassword, user_id_modification) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const query = `
    UPDATE users
    SET
      password = $1,
      user_id_modification = $2,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, name, email
  `;

  const result = await pool.query(query, [hashedPassword, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Verificar si un email ya existe
 * @param {string} email - Email a verificar
 * @param {number} excludeId - ID del usuario a excluir (para actualizaciones)
 * @returns {Promise<boolean>} true si existe, false si no
 */
const emailExists = async (email, excludeId = null) => {
  let query = 'SELECT id FROM users WHERE email = $1';
  const params = [email];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  emailExists
};
