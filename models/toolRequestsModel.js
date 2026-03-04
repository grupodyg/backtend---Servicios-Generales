const pool = require('../config/db');

const getAllToolRequests = async (filters = {}) => {
  const { status = 'all', order_id, technician_id } = filters;
  let query = `
    SELECT tr.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', tri.id,
                 'tool_id', tri.tool_id,
                 'tool_name', tri.tool_name,
                 'quantity', tri.quantity,
                 'expected_return_date', tri.expected_return_date,
                 'actual_return_date', tri.actual_return_date,
                 'delivery_date', tri.delivery_date,
                 'reason', tri.reason,
                 'observations', tri.observations,
                 'status', tri.status
               )
               ORDER BY tri.id
             ) FILTER (WHERE tri.id IS NOT NULL),
             '[]'
           ) AS items
    FROM tool_requests tr
    LEFT JOIN tool_request_items tri ON tr.id = tri.request_id AND tri.status = 'active'
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND tr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (order_id) {
    query += ` AND tr.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (technician_id) {
    query += ` AND tr.technician_id = $${paramIndex}`;
    params.push(technician_id);
    paramIndex++;
  }

  query += ' GROUP BY tr.id ORDER BY tr.request_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getToolRequestById = async (id) => {
  const query = `
    SELECT tr.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', tri.id,
                 'tool_id', tri.tool_id,
                 'tool_name', tri.tool_name,
                 'quantity', tri.quantity,
                 'expected_return_date', tri.expected_return_date,
                 'actual_return_date', tri.actual_return_date,
                 'delivery_date', tri.delivery_date,
                 'reason', tri.reason,
                 'observations', tri.observations,
                 'status', tri.status
               )
               ORDER BY tri.id
             ) FILTER (WHERE tri.id IS NOT NULL),
             '[]'
           ) AS items
    FROM tool_requests tr
    LEFT JOIN tool_request_items tri ON tr.id = tri.request_id
    WHERE tr.id = $1
    GROUP BY tr.id
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createToolRequest = async (requestData) => {
  const { order_id, technician_id, technician_name, request_date, return_date, observations, user_id_registration } = requestData;
  const query = `
    INSERT INTO tool_requests (order_id, technician_id, technician_name, request_date, return_date, observations, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, technician_id, technician_name, request_date, return_date, observations, user_id_registration]);
  return result.rows[0];
};

const createToolRequestItems = async (requestId, items, userId) => {
  if (!items || items.length === 0) return [];

  const insertedItems = [];

  for (const item of items) {
    const query = `
      INSERT INTO tool_request_items (
        request_id, tool_id, tool_name, quantity,
        expected_return_date, reason, observations,
        status, user_id_registration, date_time_registration
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      requestId,
      item.tool_id || item.herramientaId || null,
      item.tool_name || item.nombre || null,
      item.quantity || 1,
      item.expected_return_date || item.fechaDevolucionPrevista || null,
      item.reason || item.motivo || null,
      item.observations || item.observaciones || null,
      userId
    ]);
    insertedItems.push(result.rows[0]);
  }

  return insertedItems;
};

const updateToolRequest = async (id, requestData) => {
  const { order_id, technician_id, technician_name, request_date, return_date, observations, return_observations, status, user_id_modification } = requestData;
  const query = `
    UPDATE tool_requests
    SET order_id = COALESCE($1, order_id), technician_id = COALESCE($2, technician_id), technician_name = COALESCE($3, technician_name),
        request_date = COALESCE($4, request_date), return_date = COALESCE($5, return_date), observations = COALESCE($6, observations),
        return_observations = COALESCE($7, return_observations), status = COALESCE($8, status),
        user_id_modification = $9, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, technician_id, technician_name, request_date, return_date, observations, return_observations, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteToolRequest = async (id, user_id) => {
  const query = `UPDATE tool_requests SET status = 'cancelled', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = { getAllToolRequests, getToolRequestById, createToolRequest, createToolRequestItems, updateToolRequest, deleteToolRequest };
