const pool = require('../config/db');

const getContactsByClient = async (client_id) => {
  const query = `SELECT * FROM client_contacts WHERE client_id = $1 AND status = 'active' ORDER BY is_primary DESC, name ASC`;
  const result = await pool.query(query, [client_id]);
  return result.rows;
};

const getContactById = async (id) => {
  const result = await pool.query('SELECT * FROM client_contacts WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createContact = async (contactData) => {
  const { client_id, name, position, email, phone, is_primary, user_id_registration } = contactData;
  const query = `
    INSERT INTO client_contacts (
      client_id, name, position, email, phone, is_primary, status, user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [client_id, name, position, email, phone, is_primary, user_id_registration]);
  return result.rows[0];
};

const updateContact = async (id, contactData) => {
  const { name, position, email, phone, is_primary, status, user_id_modification } = contactData;
  const query = `
    UPDATE client_contacts
    SET name = COALESCE($1, name),
        position = COALESCE($2, position),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        is_primary = COALESCE($5, is_primary),
        status = COALESCE($6, status),
        user_id_modification = $7,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  const result = await pool.query(query, [name, position, email, phone, is_primary, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteContact = async (id, user_id) => {
  const query = `
    UPDATE client_contacts
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getContactsByClient, getContactById, createContact, updateContact, deleteContact };
