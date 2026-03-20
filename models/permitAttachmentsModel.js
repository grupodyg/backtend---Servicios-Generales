const pool = require('../config/db');

const getAllPermitAttachments = async (filters = {}) => {
  const { status = 'active', permit_id } = filters;
  let query = `
    SELECT pa.*
    FROM permit_attachments pa
    WHERE pa.status != 'inactive'
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND pa.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (permit_id) {
    query += ` AND pa.permit_id = $${paramIndex}`;
    params.push(permit_id);
    paramIndex++;
  }

  query += ' ORDER BY pa.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPermitAttachmentById = async (id) => {
  const query = `SELECT * FROM permit_attachments WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPermitAttachment = async (attachmentData) => {
  const { permit_id, name, file_type, size, url, status, user_id_registration } = attachmentData;
  const query = `
    INSERT INTO permit_attachments (permit_id, name, file_type, size, url, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [permit_id, name, file_type, size || null, url, status || 'active', user_id_registration]);
  return result.rows[0];
};

const updatePermitAttachment = async (id, attachmentData) => {
  const { permit_id, name, file_type, size, url, status, user_id_modification } = attachmentData;
  const query = `
    UPDATE permit_attachments
    SET permit_id = COALESCE($1, permit_id), name = COALESCE($2, name), file_type = COALESCE($3, file_type),
        size = COALESCE($4, size), url = COALESCE($5, url), status = COALESCE($6, status),
        user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  const result = await pool.query(query, [permit_id, name, file_type, size, url, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePermitAttachment = async (id, user_id) => {
  const query = `UPDATE permit_attachments SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllPermitAttachments, getPermitAttachmentById, createPermitAttachment, updatePermitAttachment, deletePermitAttachment };
