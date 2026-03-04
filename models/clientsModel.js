const pool = require('../config/db');

const getAllClients = async (filters = {}) => {
  const { status = 'active', type, category, search } = filters;
  let query = `
    SELECT c.*,
           -- Estadísticas calculadas en tiempo real desde work_orders
           COALESCE((
             SELECT COUNT(*)
             FROM work_orders wo
             WHERE wo.client_id = c.id AND wo.status != 'deleted'
           ), 0)::INTEGER AS total_orders,
           COALESCE((
             SELECT COUNT(*)
             FROM work_orders wo
             WHERE wo.client_id = c.id
               AND wo.status IN ('pending', 'in_progress')
           ), 0)::INTEGER AS active_orders,
           COALESCE((
             SELECT COUNT(*)
             FROM work_orders wo
             WHERE wo.client_id = c.id
               AND wo.status = 'completed'
           ), 0)::INTEGER AS completed_orders,
           COALESCE((
             SELECT SUM(wo.estimated_cost)
             FROM work_orders wo
             WHERE wo.client_id = c.id AND wo.status != 'deleted'
           ), 0)::DECIMAL(10,2) AS total_amount,
           (
             SELECT MAX(wo.date_time_registration)
             FROM work_orders wo
             WHERE wo.client_id = c.id AND wo.status != 'deleted'
           ) AS last_order_date,
           -- Contactos del cliente
           COALESCE(
             json_agg(
               json_build_object(
                 'id', cc.id,
                 'name', cc.name,
                 'position', cc.position,
                 'email', cc.email,
                 'phone', cc.phone,
                 'is_primary', cc.is_primary
               )
               ORDER BY cc.is_primary DESC, cc.name ASC
             ) FILTER (WHERE cc.id IS NOT NULL),
             '[]'
           ) AS contacts
    FROM clients c
    LEFT JOIN client_contacts cc ON c.id = cc.client_id AND cc.status = 'active'
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (type) {
    query += ` AND c.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (category) {
    query += ` AND c.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (search) {
    query += ` AND (c.name ILIKE $${paramIndex} OR c.ruc ILIKE $${paramIndex} OR c.dni ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += `
    GROUP BY c.id
    ORDER BY c.name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

const getClientById = async (id) => {
  const query = `
    SELECT c.*,
           -- Estadísticas calculadas en tiempo real desde work_orders
           COALESCE((
             SELECT COUNT(*)
             FROM work_orders wo
             WHERE wo.client_id = c.id AND wo.status != 'deleted'
           ), 0)::INTEGER AS total_orders,
           COALESCE((
             SELECT COUNT(*)
             FROM work_orders wo
             WHERE wo.client_id = c.id
               AND wo.status IN ('pending', 'in_progress')
           ), 0)::INTEGER AS active_orders,
           COALESCE((
             SELECT COUNT(*)
             FROM work_orders wo
             WHERE wo.client_id = c.id
               AND wo.status = 'completed'
           ), 0)::INTEGER AS completed_orders,
           COALESCE((
             SELECT SUM(wo.estimated_cost)
             FROM work_orders wo
             WHERE wo.client_id = c.id AND wo.status != 'deleted'
           ), 0)::DECIMAL(10,2) AS total_amount,
           (
             SELECT MAX(wo.date_time_registration)
             FROM work_orders wo
             WHERE wo.client_id = c.id AND wo.status != 'deleted'
           ) AS last_order_date,
           -- Contactos del cliente
           COALESCE(
             json_agg(
               json_build_object(
                 'id', cc.id,
                 'name', cc.name,
                 'position', cc.position,
                 'email', cc.email,
                 'phone', cc.phone,
                 'is_primary', cc.is_primary,
                 'status', cc.status
               )
               ORDER BY cc.is_primary DESC, cc.name ASC
             ) FILTER (WHERE cc.id IS NOT NULL),
             '[]'
           ) AS contacts
    FROM clients c
    LEFT JOIN client_contacts cc ON c.id = cc.client_id
    WHERE c.id = $1
    GROUP BY c.id
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createClient = async (clientData) => {
  const {
    type, name, ruc, dni, email, phone, address, category, notes, user_id_registration
  } = clientData;

  const query = `
    INSERT INTO clients (
      type, name, ruc, dni, email, phone, address, category, notes,
      total_orders, active_orders, completed_orders, total_amount,
      status, user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0, 0, 'active', $10, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    type, name, ruc, dni, email, phone, address, category, notes, user_id_registration
  ]);
  return result.rows[0];
};

const updateClient = async (id, clientData) => {
  const {
    type, name, ruc, dni, email, phone, address, category, notes, status, user_id_modification
  } = clientData;

  const query = `
    UPDATE clients
    SET type = COALESCE($1, type),
        name = COALESCE($2, name),
        ruc = COALESCE($3, ruc),
        dni = COALESCE($4, dni),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        address = COALESCE($7, address),
        category = COALESCE($8, category),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status),
        user_id_modification = $11,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $12
    RETURNING *
  `;

  const result = await pool.query(query, [
    type, name, ruc, dni, email, phone, address, category, notes, status, user_id_modification, id
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteClient = async (id, user_id) => {
  const query = `
    UPDATE clients
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const getClientByName = async (name) => {
  if (!name) return null;
  const query = `
    SELECT id, name, status
    FROM clients
    WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      AND status = 'active'
    LIMIT 1
  `;
  const result = await pool.query(query, [name]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllClients,
  getClientById,
  getClientByName,
  createClient,
  updateClient,
  deleteClient
};
