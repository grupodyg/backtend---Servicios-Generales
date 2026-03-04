const pool = require('../config/db');
const { getCurrentYear } = require('../utils/dateUtils');

const getAllEmployeePermits = async (filters = {}) => {
  const { status = 'all', employee_id, permit_type } = filters;
  let query = `SELECT * FROM employee_permits WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (employee_id) {
    query += ` AND employee_id = $${paramIndex}`;
    params.push(employee_id);
    paramIndex++;
  }

  if (permit_type) {
    query += ` AND permit_type = $${paramIndex}`;
    params.push(permit_type);
    paramIndex++;
  }

  query += ' ORDER BY start_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getEmployeePermitById = async (id) => {
  const result = await pool.query('SELECT * FROM employee_permits WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createEmployeePermit = async (permitData) => {
  const { id, employee_id, employee_name, permit_type, start_date, end_date, days_requested, reason, attached_documentation, user_id_registration } = permitData;
  const query = `
    INSERT INTO employee_permits (id, employee_id, employee_name, permit_type, start_date, end_date, days_requested, reason, attached_documentation, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [id, employee_id, employee_name, permit_type, start_date, end_date, days_requested, reason, attached_documentation, user_id_registration]);
  return result.rows[0];
};

const updateEmployeePermit = async (id, permitData) => {
  const { employee_name, permit_type, start_date, end_date, days_requested, reason, attached_documentation, approved_by, approval_date, rejected_by, rejection_reason, rejection_date, update_date, status, user_id_modification } = permitData;
  const query = `
    UPDATE employee_permits
    SET employee_name = COALESCE($1, employee_name), permit_type = COALESCE($2, permit_type), start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date), days_requested = COALESCE($5, days_requested), reason = COALESCE($6, reason),
        attached_documentation = COALESCE($7, attached_documentation), approved_by = COALESCE($8, approved_by), approval_date = COALESCE($9, approval_date),
        rejected_by = COALESCE($10, rejected_by), rejection_reason = COALESCE($11, rejection_reason), rejection_date = COALESCE($12, rejection_date),
        update_date = COALESCE($13, update_date), status = COALESCE($14, status), user_id_modification = $15, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $16
    RETURNING *
  `;
  const result = await pool.query(query, [employee_name, permit_type, start_date, end_date, days_requested, reason, attached_documentation, approved_by, approval_date, rejected_by, rejection_reason, rejection_date, update_date, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteEmployeePermit = async (id, user_id) => {
  const query = `UPDATE employee_permits SET status = 'cancelled', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const generatePermitId = async () => {
  const year = getCurrentYear();
  const prefix = `PER-${year}-`;
  const query = `SELECT id FROM employee_permits WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`;
  const result = await pool.query(query, [`${prefix}%`]);
  if (result.rows.length === 0) return `${prefix}00001`;
  const lastId = result.rows[0].id;
  const lastNumber = parseInt(lastId.split('-')[2]);
  const newNumber = (lastNumber + 1).toString().padStart(5, '0');
  return `${prefix}${newNumber}`;
};

module.exports = { getAllEmployeePermits, getEmployeePermitById, createEmployeePermit, updateEmployeePermit, deleteEmployeePermit, generatePermitId };
