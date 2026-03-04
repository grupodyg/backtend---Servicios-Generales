const pool = require('../config/db');

const getAllPermissions = async (status = 'active') => {
  let query = `SELECT * FROM permissions`;
  const params = [];
  if (status !== 'all') {
    query += ' WHERE status = $1';
    params.push(status);
  }
  query += ' ORDER BY module ASC, name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPermissionById = async (id) => {
  const result = await pool.query('SELECT * FROM permissions WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPermission = async (permissionData) => {
  const { name, description, module, user_id_registration } = permissionData;
  const query = `
    INSERT INTO permissions (name, description, module, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, 'active', $4, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [name, description, module, user_id_registration]);
  return result.rows[0];
};

const updatePermission = async (id, permissionData) => {
  const { name, description, module, status, user_id_modification } = permissionData;
  const query = `
    UPDATE permissions
    SET name = COALESCE($1, name),
        description = COALESCE($2, description),
        module = COALESCE($3, module),
        status = COALESCE($4, status),
        user_id_modification = $5,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const result = await pool.query(query, [name, description, module, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePermission = async (id, user_id) => {
  const query = `
    UPDATE permissions
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission
};
