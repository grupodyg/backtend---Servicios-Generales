const pool = require('../config/db');

const getAllTools = async (filters = {}) => {
  const { status = 'available', assigned_to_user_id, search, category_id } = filters;
  let query = `
    SELECT
      t.*,
      tc.name as category_name,
      tc.prefix as category_prefix
    FROM tools t
    LEFT JOIN tool_categories tc ON t.category_id = tc.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND t.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
    // Si se solicitan herramientas disponibles, excluir las que no tienen stock
    if (status === 'available') {
      query += ` AND t.quantity > 0`;
    }
  }

  if (assigned_to_user_id) {
    query += ` AND t.assigned_to_user_id = $${paramIndex}`;
    params.push(assigned_to_user_id);
    paramIndex++;
  }

  if (search) {
    query += ` AND (t.name ILIKE $${paramIndex} OR t.code ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (category_id) {
    query += ` AND t.category_id = $${paramIndex}`;
    params.push(category_id);
    paramIndex++;
  }

  query += ' ORDER BY t.name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getToolById = async (id) => {
  const query = `
    SELECT
      t.*,
      tc.name as category_name,
      tc.prefix as category_prefix
    FROM tools t
    LEFT JOIN tool_categories tc ON t.category_id = tc.id
    WHERE t.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createTool = async (toolData) => {
  const {
    code, name, brand, model, description, quantity, value,
    admission_date, category_id, image_url, user_id_registration
  } = toolData;

  const query = `
    INSERT INTO tools (
      code, name, brand, model, description, quantity, value,
      admission_date, category_id, image_url, status, user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available', $11, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    code, name, brand, model, description, quantity || 1, value,
    admission_date, category_id || null, image_url || null, user_id_registration
  ]);
  return result.rows[0];
};

const updateTool = async (id, toolData) => {
  const {
    code, name, brand, model, description, quantity, value,
    assigned_to_user_id, assignment_date, category_id, image_url, status, user_id_modification
  } = toolData;

  const query = `
    UPDATE tools
    SET code = COALESCE($1, code),
        name = COALESCE($2, name),
        brand = COALESCE($3, brand),
        model = COALESCE($4, model),
        description = COALESCE($5, description),
        quantity = COALESCE($6, quantity),
        value = COALESCE($7, value),
        assigned_to_user_id = COALESCE($8, assigned_to_user_id),
        assignment_date = COALESCE($9, assignment_date),
        category_id = COALESCE($10, category_id),
        image_url = COALESCE($11, image_url),
        status = COALESCE($12, status),
        user_id_modification = $13,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $14
    RETURNING *
  `;

  const result = await pool.query(query, [
    code, name, brand, model, description, quantity, value,
    assigned_to_user_id, assignment_date, category_id, image_url, status, user_id_modification, id
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteTool = async (id, user_id) => {
  const query = `
    UPDATE tools
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const updateToolImage = async (id, imageUrl) => {
  const query = `UPDATE tools SET image_url = $1 WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [imageUrl, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllTools, getToolById, createTool, updateTool, updateToolImage, deleteTool };
