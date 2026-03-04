const pool = require('../config/db');

const getAllMaterials = async (filters = {}) => {
  const { status = 'available', category_id, low_stock, search } = filters;
  let query = `
    SELECT m.*, mc.name AS category_name, mc.prefix AS category_prefix
    FROM materials m
    LEFT JOIN material_categories mc ON m.category_id = mc.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND m.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
    // Si se solicitan materiales disponibles, excluir los que no tienen stock
    if (status === 'available') {
      query += ` AND m.current_stock > 0`;
    }
  }

  if (category_id) {
    query += ` AND m.category_id = $${paramIndex}`;
    params.push(category_id);
    paramIndex++;
  }

  if (low_stock === 'true') {
    query += ` AND m.current_stock <= m.minimum_stock`;
  }

  if (search) {
    query += ` AND (m.name ILIKE $${paramIndex} OR m.code ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' ORDER BY m.name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getMaterialById = async (id) => {
  const query = `
    SELECT m.*, mc.name AS category_name, mc.prefix AS category_prefix
    FROM materials m
    LEFT JOIN material_categories mc ON m.category_id = mc.id
    WHERE m.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createMaterial = async (materialData) => {
  const {
    code, name, category_id, unit, current_stock, minimum_stock, unit_price,
    supplier, warehouse_location, user_id_registration
  } = materialData;

  const query = `
    INSERT INTO materials (
      code, name, category_id, unit, current_stock, minimum_stock, unit_price,
      supplier, warehouse_location, status, user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available', $10, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    code, name, category_id, unit, current_stock || 0, minimum_stock || 0,
    unit_price || 0, supplier, warehouse_location, user_id_registration
  ]);
  return result.rows[0];
};

const updateMaterial = async (id, materialData) => {
  const {
    code, name, category_id, unit, current_stock, minimum_stock, unit_price,
    supplier, warehouse_location, status, user_id_modification
  } = materialData;

  const query = `
    UPDATE materials
    SET code = COALESCE($1, code),
        name = COALESCE($2, name),
        category_id = COALESCE($3, category_id),
        unit = COALESCE($4, unit),
        current_stock = COALESCE($5, current_stock),
        minimum_stock = COALESCE($6, minimum_stock),
        unit_price = COALESCE($7, unit_price),
        supplier = COALESCE($8, supplier),
        warehouse_location = COALESCE($9, warehouse_location),
        status = COALESCE($10, status),
        user_id_modification = $11,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $12
    RETURNING *
  `;

  const result = await pool.query(query, [
    code, name, category_id, unit, current_stock, minimum_stock, unit_price,
    supplier, warehouse_location, status, user_id_modification, id
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteMaterial = async (id, user_id) => {
  const query = `
    UPDATE materials
    SET status = 'unavailable', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial
};
