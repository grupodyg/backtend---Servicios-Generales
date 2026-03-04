const pool = require('../config/db');

const getPhotosByOrder = async (order_id) => {
  const query = `SELECT * FROM order_photos WHERE order_id = $1 AND status = 'active' ORDER BY date_time_registration DESC`;
  const result = await pool.query(query, [order_id]);
  return result.rows;
};

const getPhotoById = async (id) => {
  const result = await pool.query('SELECT * FROM order_photos WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPhoto = async (photoData) => {
  const { order_id, url, name, size, category, comment, user_id_registration } = photoData;
  const query = `
    INSERT INTO order_photos (order_id, url, name, size, category, comment, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, url, name, size, category, comment, user_id_registration]);
  return result.rows[0];
};

const updatePhoto = async (id, photoData) => {
  const { name, category, comment, status, user_id_modification } = photoData;
  const query = `
    UPDATE order_photos
    SET name = COALESCE($1, name),
        category = COALESCE($2, category),
        comment = COALESCE($3, comment),
        status = COALESCE($4, status),
        user_id_modification = $5,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const result = await pool.query(query, [name, category, comment, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePhoto = async (id, user_id) => {
  const query = `
    UPDATE order_photos
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getPhotosByOrder, getPhotoById, createPhoto, updatePhoto, deletePhoto };
