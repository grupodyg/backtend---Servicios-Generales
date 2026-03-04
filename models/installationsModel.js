const pool = require('../config/db');

const getAllInstallations = async (filters = {}) => {
  const { status = 'active', client_id, specialty, search } = filters;
  let query = `SELECT * FROM installations WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (client_id) {
    query += ` AND client_id = $${paramIndex}`;
    params.push(client_id);
    paramIndex++;
  }

  if (specialty) {
    query += ` AND specialty = $${paramIndex}`;
    params.push(specialty);
    paramIndex++;
  }

  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR client ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' ORDER BY name ASC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getInstallationById = async (id) => {
  const result = await pool.query('SELECT * FROM installations WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createInstallation = async (installationData) => {
  const {
    name, code, client, client_id, address, specialty, equipment_type, brand, model,
    serial_number, installation_date, maintenance_frequency, last_maintenance_date,
    next_maintenance_date, user_id_registration
  } = installationData;

  const query = `
    INSERT INTO installations (
      name, code, client, client_id, address, specialty, equipment_type, brand, model,
      serial_number, installation_date, maintenance_frequency, last_maintenance_date,
      next_maintenance_date, status, user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    name, code, client, client_id, address, specialty, equipment_type, brand, model,
    serial_number, installation_date, maintenance_frequency, last_maintenance_date,
    next_maintenance_date, user_id_registration
  ]);
  return result.rows[0];
};

const updateInstallation = async (id, installationData) => {
  const {
    name, code, client, client_id, address, specialty, equipment_type, brand, model,
    serial_number, installation_date, maintenance_frequency, last_maintenance_date,
    next_maintenance_date, status, user_id_modification
  } = installationData;

  const query = `
    UPDATE installations
    SET name = COALESCE($1, name),
        code = COALESCE($2, code),
        client = COALESCE($3, client),
        client_id = COALESCE($4, client_id),
        address = COALESCE($5, address),
        specialty = COALESCE($6, specialty),
        equipment_type = COALESCE($7, equipment_type),
        brand = COALESCE($8, brand),
        model = COALESCE($9, model),
        serial_number = COALESCE($10, serial_number),
        installation_date = COALESCE($11, installation_date),
        maintenance_frequency = COALESCE($12, maintenance_frequency),
        last_maintenance_date = COALESCE($13, last_maintenance_date),
        next_maintenance_date = COALESCE($14, next_maintenance_date),
        status = COALESCE($15, status),
        user_id_modification = $16,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $17
    RETURNING *
  `;

  const result = await pool.query(query, [
    name, code, client, client_id, address, specialty, equipment_type, brand, model,
    serial_number, installation_date, maintenance_frequency, last_maintenance_date,
    next_maintenance_date, status, user_id_modification, id
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteInstallation = async (id, user_id) => {
  const query = `
    UPDATE installations
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllInstallations, getInstallationById, createInstallation, updateInstallation, deleteInstallation };
