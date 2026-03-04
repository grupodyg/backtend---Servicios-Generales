const pool = require('../config/db');

const getAllRoles = async (status = 'active') => {
  let query = `SELECT * FROM roles`;
  const params = [];

  if (status !== 'all') {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getRoleById = async (id) => {
  const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createRole = async (roleData) => {
  const { name, description, user_id_registration } = roleData;
  const query = `
    INSERT INTO roles (name, description, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [name, description, user_id_registration]);
  return result.rows[0];
};

const updateRole = async (id, roleData) => {
  const { name, description, status, user_id_modification } = roleData;
  const query = `
    UPDATE roles
    SET name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        user_id_modification = $4,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const result = await pool.query(query, [name, description, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteRole = async (id, user_id) => {
  const query = `
    UPDATE roles
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
