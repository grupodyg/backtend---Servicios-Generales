const pool = require('../config/db');

const getItemsByQuotation = async (quotation_id) => {
  const query = `SELECT * FROM quotation_items WHERE quotation_id = $1 AND status = 'active' ORDER BY id`;
  const result = await pool.query(query, [quotation_id]);
  return result.rows;
};

const getItemById = async (id) => {
  const result = await pool.query('SELECT * FROM quotation_items WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createItem = async (itemData) => {
  const { quotation_id, item_type, description, code, quantity, unit, unit_price, subtotal, material_description, labor_description, equipment_service, contractor_deliverables, user_id_registration } = itemData;
  const query = `
    INSERT INTO quotation_items (quotation_id, item_type, description, code, quantity, unit, unit_price, subtotal, material_description, labor_description, equipment_service, contractor_deliverables, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [quotation_id, item_type, description, code, quantity, unit, unit_price, subtotal, material_description, labor_description, equipment_service, contractor_deliverables, user_id_registration]);
  return result.rows[0];
};

const updateItem = async (id, itemData) => {
  const { item_type, description, code, quantity, unit, unit_price, subtotal, material_description, labor_description, equipment_service, contractor_deliverables, status, user_id_modification } = itemData;
  const query = `
    UPDATE quotation_items
    SET item_type = COALESCE($1, item_type), description = COALESCE($2, description), code = COALESCE($3, code),
        quantity = COALESCE($4, quantity), unit = COALESCE($5, unit), unit_price = COALESCE($6, unit_price),
        subtotal = COALESCE($7, subtotal), material_description = COALESCE($8, material_description),
        labor_description = COALESCE($9, labor_description), equipment_service = COALESCE($10, equipment_service),
        contractor_deliverables = COALESCE($11, contractor_deliverables), status = COALESCE($12, status),
        user_id_modification = $13, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $14
    RETURNING *
  `;
  const result = await pool.query(query, [item_type, description, code, quantity, unit, unit_price, subtotal, material_description, labor_description, equipment_service, contractor_deliverables, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteItem = async (id, user_id) => {
  const query = `UPDATE quotation_items SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getItemsByQuotation, getItemById, createItem, updateItem, deleteItem };
