const pool = require('../config/db');

/**
 * Obtener todos los tipos de servicio
 * @param {string} status - Filtro opcional por estado ('active', 'inactive', 'all')
 * @returns {Promise<Array>} Array de tipos de servicio
 */
const getAllServiceTypes = async (status = 'active') => {
  let query = `
    SELECT
      id,
      name,
      description,
      icon,
      color,
      display_order,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM service_types
  `;

  const params = [];

  if (status !== 'all') {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY display_order ASC, name ASC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener un tipo de servicio por ID
 * @param {number} id - ID del tipo de servicio
 * @returns {Promise<Object|null>} Tipo de servicio o null
 */
const getServiceTypeById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      description,
      icon,
      color,
      display_order,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM service_types
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear un nuevo tipo de servicio
 * @param {Object} serviceTypeData - Datos del tipo de servicio
 * @returns {Promise<Object>} Tipo de servicio creado
 */
const createServiceType = async (serviceTypeData) => {
  const {
    name,
    description,
    icon,
    color,
    display_order = 0,
    user_id_registration
  } = serviceTypeData;

  const query = `
    INSERT INTO service_types (
      name,
      description,
      icon,
      color,
      display_order,
      status,
      user_id_registration,
      date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, 'active', $6, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    name,
    description,
    icon,
    color,
    display_order,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Actualizar un tipo de servicio
 * @param {number} id - ID del tipo de servicio
 * @param {Object} serviceTypeData - Datos a actualizar
 * @returns {Promise<Object|null>} Tipo de servicio actualizado o null
 */
const updateServiceType = async (id, serviceTypeData) => {
  const {
    name,
    description,
    icon,
    color,
    display_order,
    status,
    user_id_modification
  } = serviceTypeData;

  const query = `
    UPDATE service_types
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      icon = COALESCE($3, icon),
      color = COALESCE($4, color),
      display_order = COALESCE($5, display_order),
      status = COALESCE($6, status),
      user_id_modification = $7,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;

  const result = await pool.query(query, [
    name,
    description,
    icon,
    color,
    display_order,
    status,
    user_id_modification,
    id
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar un tipo de servicio (soft delete)
 * @param {number} id - ID del tipo de servicio
 * @param {number} user_id - ID del usuario que realiza la acción
 * @returns {Promise<Object|null>} Tipo de servicio eliminado o null
 */
const deleteServiceType = async (id, user_id) => {
  const query = `
    UPDATE service_types
    SET
      status = 'inactive',
      user_id_modification = $1,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType
};
