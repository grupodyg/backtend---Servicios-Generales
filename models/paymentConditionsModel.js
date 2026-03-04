const pool = require('../config/db');

/**
 * Obtener todas las condiciones de pago
 * @param {string} status - Filtro opcional por estado ('active', 'inactive', 'all')
 * @returns {Promise<Array>} Array de condiciones de pago
 */
const getAllPaymentConditions = async (status = 'active') => {
  let query = `
    SELECT
      id,
      name,
      description,
      days_term,
      initial_percentage,
      display_order,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM payment_conditions
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
 * Obtener una condición de pago por ID
 * @param {number} id - ID de la condición de pago
 * @returns {Promise<Object|null>} Condición de pago o null
 */
const getPaymentConditionById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      description,
      days_term,
      initial_percentage,
      display_order,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM payment_conditions
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear una nueva condición de pago
 * @param {Object} paymentConditionData - Datos de la condición de pago
 * @returns {Promise<Object>} Condición de pago creada
 */
const createPaymentCondition = async (paymentConditionData) => {
  const {
    name,
    description,
    days_term,
    initial_percentage,
    display_order = 0,
    user_id_registration
  } = paymentConditionData;

  const query = `
    INSERT INTO payment_conditions (
      name,
      description,
      days_term,
      initial_percentage,
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
    days_term,
    initial_percentage,
    display_order,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Actualizar una condición de pago
 * @param {number} id - ID de la condición de pago
 * @param {Object} paymentConditionData - Datos a actualizar
 * @returns {Promise<Object|null>} Condición de pago actualizada o null
 */
const updatePaymentCondition = async (id, paymentConditionData) => {
  const {
    name,
    description,
    days_term,
    initial_percentage,
    display_order,
    status,
    user_id_modification
  } = paymentConditionData;

  const query = `
    UPDATE payment_conditions
    SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      days_term = COALESCE($3, days_term),
      initial_percentage = COALESCE($4, initial_percentage),
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
    days_term,
    initial_percentage,
    display_order,
    status,
    user_id_modification,
    id
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar una condición de pago (soft delete)
 * @param {number} id - ID de la condición de pago
 * @param {number} user_id - ID del usuario que realiza la acción
 * @returns {Promise<Object|null>} Condición de pago eliminada o null
 */
const deletePaymentCondition = async (id, user_id) => {
  const query = `
    UPDATE payment_conditions
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
  getAllPaymentConditions,
  getPaymentConditionById,
  createPaymentCondition,
  updatePaymentCondition,
  deletePaymentCondition
};
