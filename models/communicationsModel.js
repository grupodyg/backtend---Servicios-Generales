const pool = require('../config/db');

const getAllCommunications = async (filters = {}) => {
  const { status = 'all', order_id, read, is_internal } = filters;
  let query = `SELECT * FROM communications WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (order_id) {
    query += ` AND order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (read !== undefined) {
    query += ` AND read = $${paramIndex}`;
    params.push(read === 'true');
    paramIndex++;
  }

  if (is_internal !== undefined) {
    query += ` AND is_internal = $${paramIndex}`;
    params.push(is_internal === 'true');
    paramIndex++;
  }

  query += ' ORDER BY communication_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getCommunicationById = async (id) => {
  const result = await pool.query('SELECT * FROM communications WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createCommunication = async (communicationData) => {
  const { order_id, client, communication_type, communication_date, subject, description, read, is_internal, created_by, responsible, status, user_id_registration } = communicationData;
  const query = `
    INSERT INTO communications (order_id, client, communication_type, communication_date, subject, description, read, is_internal, created_by, responsible, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, client, communication_type, communication_date, subject, description, read || false, is_internal || false, created_by, responsible, status || 'pending', user_id_registration]);
  return result.rows[0];
};

const updateCommunication = async (id, communicationData) => {
  const { order_id, client, communication_type, communication_date, subject, description, read, is_internal, created_by, responsible, status, user_id_modification } = communicationData;
  const query = `
    UPDATE communications
    SET order_id = COALESCE($1, order_id), client = COALESCE($2, client), communication_type = COALESCE($3, communication_type),
        communication_date = COALESCE($4, communication_date), subject = COALESCE($5, subject), description = COALESCE($6, description),
        read = COALESCE($7, read), is_internal = COALESCE($8, is_internal), created_by = COALESCE($9, created_by),
        responsible = COALESCE($10, responsible), status = COALESCE($11, status), user_id_modification = $12, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, client, communication_type, communication_date, subject, description, read, is_internal, created_by, responsible, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteCommunication = async (id, user_id) => {
  const query = `UPDATE communications SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllCommunications, getCommunicationById, createCommunication, updateCommunication, deleteCommunication };
