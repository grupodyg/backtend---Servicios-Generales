const pool = require('../config/db');

const getAllFinalReports = async (filters = {}) => {
  const { status = 'all', order_id } = filters;
  let query = `SELECT * FROM final_reports WHERE 1=1`;
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

  query += ' ORDER BY generation_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getFinalReportById = async (id) => {
  const query = `
    SELECT fr.*,
           COALESCE(
             json_agg(
               json_build_object('id', fri.id, 'daily_report_id', fri.daily_report_id, 'report_date', fri.report_date, 'description', fri.description, 'progress_percentage', fri.progress_percentage, 'technician', fri.technician, 'observations', fri.observations)
               ORDER BY fri.report_date
             ) FILTER (WHERE fri.id IS NOT NULL),
             '[]'
           ) AS items
    FROM final_reports fr
    LEFT JOIN final_report_items fri ON fr.id = fri.final_report_id AND fri.status = 'active'
    WHERE fr.id = $1
    GROUP BY fr.id
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createFinalReport = async (reportData) => {
  const { order_id, generation_date, summary, signatures, blocked, status, user_id_registration } = reportData;
  const query = `
    INSERT INTO final_reports (order_id, generation_date, summary, signatures, blocked, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, generation_date, summary, signatures, blocked || false, status || 'pending_technician_signature', user_id_registration]);
  return result.rows[0];
};

const updateFinalReport = async (id, reportData) => {
  const { generation_date, summary, signatures, blocked, status, user_id_modification } = reportData;
  const query = `
    UPDATE final_reports
    SET generation_date = COALESCE($1, generation_date), summary = COALESCE($2, summary), signatures = COALESCE($3, signatures),
        blocked = COALESCE($4, blocked), status = COALESCE($5, status), user_id_modification = $6, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  const result = await pool.query(query, [generation_date, summary, signatures, blocked, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteFinalReport = async (id, user_id) => {
  const query = `UPDATE final_reports SET status = 'cancelled', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllFinalReports, getFinalReportById, createFinalReport, updateFinalReport, deleteFinalReport };
