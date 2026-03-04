const pool = require('../config/db');

const getAllPayrollSlips = async (filters = {}) => {
  const { status, employee_id, period_month, period_year } = filters;
  let query = `
    SELECT ps.*,
           u.name,
           u.email
    FROM payroll_slips ps
    LEFT JOIN users u ON ps.employee_id = u.id
    WHERE ps.status != 'inactive'
  `;
  const params = [];
  let paramIndex = 1;

  if (status && status !== 'all') {
    query += ` AND ps.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (employee_id) {
    query += ` AND ps.employee_id = $${paramIndex}`;
    params.push(employee_id);
    paramIndex++;
  }

  if (period_month) {
    query += ` AND ps.month = $${paramIndex}`;
    params.push(period_month);
    paramIndex++;
  }

  if (period_year) {
    query += ` AND ps.year = $${paramIndex}`;
    params.push(period_year);
    paramIndex++;
  }

  query += ' ORDER BY ps.year DESC, ps.month DESC, ps.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getPayrollSlipById = async (id) => {
  const query = `
    SELECT ps.*,
           u.name,
           u.email,
           u.phone
    FROM payroll_slips ps
    LEFT JOIN users u ON ps.employee_id = u.id
    WHERE ps.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createPayrollSlip = async (payrollSlipData) => {
  const {
    employee_id,
    employee_name,
    position,
    year,
    month,
    period,
    base_salary,
    overtime_hours,
    bonuses,
    deductions,
    total_amount,
    file_url,
    file_name,
    file_size,
    uploaded_by,
    status,
    user_id_registration
  } = payrollSlipData;

  const query = `
    INSERT INTO payroll_slips (
      employee_id,
      employee_name,
      position,
      year,
      month,
      period,
      base_salary,
      overtime_hours,
      bonuses,
      deductions,
      total_amount,
      file_url,
      file_name,
      file_size,
      uploaded_by,
      status,
      user_id_registration,
      date_time_registration
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    employee_id,
    employee_name,
    position,
    year,
    month,
    period,
    base_salary || 0,
    overtime_hours || 0,
    bonuses || 0,
    deductions || 0,
    total_amount || 0,
    file_url,
    file_name,
    file_size,
    uploaded_by,
    status || 'active',
    user_id_registration
  ]);

  return result.rows[0];
};

const updatePayrollSlip = async (id, payrollSlipData) => {
  const {
    employee_id,
    employee_name,
    position,
    year,
    month,
    period,
    base_salary,
    overtime_hours,
    bonuses,
    deductions,
    total_amount,
    file_url,
    file_name,
    file_size,
    uploaded_by,
    viewed_by,
    view_date,
    status,
    user_id_modification
  } = payrollSlipData;

  // Para campos JSONB en PostgreSQL, necesitamos pasar un string JSON válido
  // El driver pg NO convierte automáticamente arrays/objetos JavaScript a JSONB
  const viewedByValue = viewed_by ? JSON.stringify(viewed_by) : null;

  const query = `
    UPDATE payroll_slips
    SET
      employee_id = COALESCE($1, employee_id),
      employee_name = COALESCE($2, employee_name),
      position = COALESCE($3, position),
      year = COALESCE($4, year),
      month = COALESCE($5, month),
      period = COALESCE($6, period),
      base_salary = COALESCE($7, base_salary),
      overtime_hours = COALESCE($8, overtime_hours),
      bonuses = COALESCE($9, bonuses),
      deductions = COALESCE($10, deductions),
      total_amount = COALESCE($11, total_amount),
      file_url = COALESCE($12, file_url),
      file_name = COALESCE($13, file_name),
      file_size = COALESCE($14, file_size),
      uploaded_by = COALESCE($15, uploaded_by),
      viewed_by = COALESCE($16, viewed_by),
      view_date = COALESCE($17, view_date),
      status = COALESCE($18, status),
      user_id_modification = $19,
      date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $20
    RETURNING *
  `;

  const result = await pool.query(query, [
    employee_id,
    employee_name,
    position,
    year,
    month,
    period,
    base_salary,
    overtime_hours,
    bonuses,
    deductions,
    total_amount,
    file_url,
    file_name,
    file_size,
    uploaded_by,
    viewedByValue,
    view_date,
    status,
    user_id_modification,
    id
  ]);

  return result.rows.length > 0 ? result.rows[0] : null;
};

const deletePayrollSlip = async (id, user_id) => {
  const query = `
    UPDATE payroll_slips
    SET status = 'inactive',
        user_id_modification = $1,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllPayrollSlips,
  getPayrollSlipById,
  createPayrollSlip,
  updatePayrollSlip,
  deletePayrollSlip
};
