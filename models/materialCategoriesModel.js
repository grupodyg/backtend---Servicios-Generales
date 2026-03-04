const pool = require('../config/db');

/**
 * Obtener todas las categorías de materiales
 * @param {string} status - Filtro opcional por estado ('active', 'inactive', 'all')
 * @returns {Promise<Array>} Array de categorías de materiales
 */
const getAllMaterialCategories = async (status = 'active') => {
  let query = `
    SELECT
      id,
      name,
      prefix,
      description,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM material_categories
  `;

  const params = [];

  if (status !== 'all') {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY name ASC';

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Obtener una categoría de materiales por ID
 * @param {number} id - ID de la categoría
 * @returns {Promise<Object|null>} Categoría de materiales o null
 */
const getMaterialCategoryById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      prefix,
      description,
      status,
      user_id_registration,
      date_time_registration,
      user_id_modification,
      date_time_modification
    FROM material_categories
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Crear una nueva categoría de materiales
 * @param {Object} categoryData - Datos de la categoría
 * @returns {Promise<Object>} Categoría creada
 */
const createMaterialCategory = async (categoryData) => {
  const {
    name,
    prefix,
    description,
    user_id_registration
  } = categoryData;

  const query = `
    INSERT INTO material_categories (
      name,
      prefix,
      description,
      status,
      user_id_registration,
      date_time_registration
    ) VALUES ($1, $2, $3, 'active', $4, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    name,
    prefix,
    description,
    user_id_registration
  ]);

  return result.rows[0];
};

/**
 * Actualizar una categoría de materiales
 * @param {number} id - ID de la categoría
 * @param {Object} categoryData - Datos a actualizar
 * @returns {Promise<Object|null>} Categoría actualizada o null
 */
const updateMaterialCategory = async (id, categoryData) => {
  const {
    name,
    prefix,
    description,
    status,
    user_id_modification
  } = categoryData;

  const query = `
    UPDATE material_categories
    SET
      name = COALESCE($1, name),
      prefix = COALESCE($2, prefix),
      description = COALESCE($3, description),
      status = COALESCE($4, status),
      user_id_modification = $5,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;

  const result = await pool.query(query, [
    name,
    prefix,
    description,
    status,
    user_id_modification,
    id
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Eliminar una categoría de materiales (soft delete)
 * @param {number} id - ID de la categoría
 * @param {number} user_id - ID del usuario que realiza la acción
 * @returns {Promise<Object|null>} Categoría eliminada o null
 */
const deleteMaterialCategory = async (id, user_id) => {
  const query = `
    UPDATE material_categories
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
  getAllMaterialCategories,
  getMaterialCategoryById,
  createMaterialCategory,
  updateMaterialCategory,
  deleteMaterialCategory
};
