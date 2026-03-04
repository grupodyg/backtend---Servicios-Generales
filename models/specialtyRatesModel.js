const pool = require('../config/db');

/**
 * Obtener todas las tarifas de especialidad
 * @param {string} status - Filtro opcional por estado ('active', 'inactive', 'all')
 * @returns {Promise<Array>} Array de tarifas de especialidad
 */
const getAllSpecialtyRates = async (status = 'active') => {
  let query = `
    SELECT
      id,
      specialty,
      description,
      daily_rate,
      hourly_rate,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM specialty_rates
  `;

  const params = [];

  if (status !== 'all') {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY specialty ASC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener una tarifa de especialidad por ID
 * @param {number} id - ID de la tarifa
 * @returns {Promise<Object|null>} Tarifa o null
 */
const getSpecialtyRateById = async (id) => {
  const query = `
    SELECT
      id,
      specialty,
      description,
      daily_rate,
      hourly_rate,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM specialty_rates
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Obtener una tarifa por nombre de especialidad
 * @param {string} specialty - Nombre de la especialidad
 * @returns {Promise<Object|null>} Tarifa o null
 */
const getSpecialtyRateByName = async (specialty) => {
  const query = `
    SELECT
      id,
      specialty,
      description,
      daily_rate,
      hourly_rate,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM specialty_rates
    WHERE LOWER(specialty) = LOWER($1) AND status = 'active'
  `;

  const result = await pool.query(query, [specialty]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear una nueva tarifa de especialidad
 * @param {Object} rateData - Datos de la tarifa
 * @returns {Promise<Object>} Tarifa creada
 */
const createSpecialtyRate = async (rateData) => {
  const {
    specialty,
    description,
    daily_rate,
    hourly_rate,
    user_id_registration
  } = rateData;

  const query = `
    INSERT INTO specialty_rates (
      specialty,
      description,
      daily_rate,
      hourly_rate,
      status,
      user_id_registration,
      date_time_registration
    ) VALUES ($1, $2, $3, $4, 'active', $5, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    specialty,
    description,
    daily_rate,
    hourly_rate,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Actualizar una tarifa de especialidad
 * @param {number} id - ID de la tarifa
 * @param {Object} rateData - Datos a actualizar
 * @returns {Promise<Object|null>} Tarifa actualizada o null
 */
const updateSpecialtyRate = async (id, rateData) => {
  const {
    specialty,
    description,
    daily_rate,
    hourly_rate,
    status,
    user_id_modification
  } = rateData;

  const query = `
    UPDATE specialty_rates
    SET
      specialty = COALESCE($1, specialty),
      description = COALESCE($2, description),
      daily_rate = COALESCE($3, daily_rate),
      hourly_rate = COALESCE($4, hourly_rate),
      status = COALESCE($5, status),
      user_id_modification = $6,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;

  const result = await pool.query(query, [
    specialty,
    description,
    daily_rate,
    hourly_rate,
    status,
    user_id_modification,
    id
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar una tarifa de especialidad (soft delete)
 * @param {number} id - ID de la tarifa
 * @param {number} user_id - ID del usuario que realiza la accion
 * @returns {Promise<Object|null>} Tarifa eliminada o null
 */
const deleteSpecialtyRate = async (id, user_id) => {
  const query = `
    UPDATE specialty_rates
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
  getAllSpecialtyRates,
  getSpecialtyRateById,
  getSpecialtyRateByName,
  createSpecialtyRate,
  updateSpecialtyRate,
  deleteSpecialtyRate
};
