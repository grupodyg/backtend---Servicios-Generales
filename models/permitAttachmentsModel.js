const pool = require('../config/db');

const getAllPermitAttachments = async (filters = {}) => {
  const { status = 'active', permit_id, uploaded_by } = filters;
  let query = `
    SELECT pa.*,
           ep.id AS permit_code,
           u.full_name AS uploader_name
    FROM permit_attachments pa
    LEFT JOIN employee_permits ep ON pa.permit_id = ep.id
    LEFT JOIN users u ON pa.uploaded_by = u.id
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

  if (uploaded_by) {
    query += ` AND pa.uploaded_by = $${paramIndex}`;
    params.push(uploaded_by);
    paramIndex++;
  }

  query += ' ORDER BY pa.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPermitAttachmentById = async (id) => {
  const query = `
    SELECT pa.*,
           ep.id AS permit_code,
           ep.employee_id,
           u.full_name AS uploader_name
    FROM permit_attachments pa
    LEFT JOIN employee_permits ep ON pa.permit_id = ep.id
    LEFT JOIN users u ON pa.uploaded_by = u.id
    WHERE pa.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPermitAttachment = async (attachmentData) => {
  const { permit_id, file_url, file_name, file_type, uploaded_by, status, user_id_registration } = attachmentData;
  const query = `
    INSERT INTO permit_attachments (permit_id, file_url, file_name, file_type, uploaded_by, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [permit_id, file_url, file_name, file_type, uploaded_by, status || 'active', user_id_registration]);
  return result.rows[0];
};

const updatePermitAttachment = async (id, attachmentData) => {
  const { permit_id, file_url, file_name, file_type, uploaded_by, status, user_id_modification } = attachmentData;
  const query = `
    UPDATE permit_attachments
    SET permit_id = COALESCE($1, permit_id), file_url = COALESCE($2, file_url), file_name = COALESCE($3, file_name),
        file_type = COALESCE($4, file_type), uploaded_by = COALESCE($5, uploaded_by), status = COALESCE($6, status),
        user_id_modification = $7, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  const result = await pool.query(query, [permit_id, file_url, file_name, file_type, uploaded_by, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePermitAttachment = async (id, user_id) => {
  const query = `UPDATE permit_attachments SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllPermitAttachments, getPermitAttachmentById, createPermitAttachment, updatePermitAttachment, deletePermitAttachment };
