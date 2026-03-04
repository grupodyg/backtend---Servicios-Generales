const pool = require('../config/db');

// ========================================
// CREAR FOTO DE REPORTE
// ========================================
const createReportPhoto = async (photoData) => {
  const { report_id, photo_type, url, name, size, user_id_registration } = photoData;

  const query = `
    INSERT INTO report_photos (
      report_id, photo_type, url, name, size, status,
      user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, 'active', $6, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    report_id, photo_type, url, name, size, user_id_registration
  ]);

  return result.rows[0];
};

// ========================================
// OBTENER FOTOS POR REPORTE
// ========================================
const getPhotosByReportId = async (report_id) => {
  const query = `
    SELECT * FROM report_photos
    WHERE report_id = $1 AND status = 'active'
    ORDER BY photo_type, id
  `;

  const result = await pool.query(query, [report_id]);
  return result.rows;
};

// ========================================
// ELIMINAR FOTO (SOFT DELETE)
// ========================================
const deletePhoto = async (id, user_id) => {
  const query = `
    UPDATE report_photos
    SET status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [user_id, id]);
  return result.rows[0];
};

module.exports = {
  createReportPhoto,
  getPhotosByReportId,
  deletePhoto
};
