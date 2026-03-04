const pool = require('../config/db');

const getAllMaterialRequests = async (filters = {}) => {
  const { status = 'all', order_id, technician_id, technician_name, priority, fecha_desde, fecha_hasta, search } = filters;
  let query = `
    SELECT mr.*,
           COALESCE(
             json_agg(
               json_build_object('id', mri.id, 'material_id', mri.material_id, 'material_name', mri.material_name, 'requested_quantity', mri.requested_quantity, 'approved_quantity', mri.approved_quantity, 'unit', mri.unit)
               ORDER BY mri.id
             ) FILTER (WHERE mri.id IS NOT NULL),
             '[]'
           ) AS items
    FROM material_requests mr
    LEFT JOIN material_request_items mri ON mr.id = mri.request_id AND mri.status = 'active'
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND mr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (order_id) {
    query += ` AND mr.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (technician_id) {
    query += ` AND mr.technician_id = $${paramIndex}`;
    params.push(technician_id);
    paramIndex++;
  }

  // Filtrar por nombre del técnico (para cuando el frontend envía el nombre)
  if (technician_name) {
    query += ` AND mr.technician_name ILIKE $${paramIndex}`;
    params.push(`%${technician_name}%`);
    paramIndex++;
  }

  if (priority) {
    query += ` AND mr.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  // Filtrar por fecha desde
  if (fecha_desde) {
    query += ` AND mr.request_date >= $${paramIndex}`;
    params.push(fecha_desde);
    paramIndex++;
  }

  // Filtrar por fecha hasta
  if (fecha_hasta) {
    query += ` AND mr.request_date <= $${paramIndex}`;
    params.push(fecha_hasta);
    paramIndex++;
  }

  // Búsqueda general (ID, técnico, orden, observaciones)
  if (search) {
    query += ` AND (
      mr.id::text ILIKE $${paramIndex} OR
      mr.technician_name ILIKE $${paramIndex} OR
      mr.order_id::text ILIKE $${paramIndex} OR
      mr.observations ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' GROUP BY mr.id ORDER BY mr.request_date DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getMaterialRequestById = async (id) => {
  const query = `
    SELECT mr.*,
           COALESCE(
             json_agg(
               json_build_object('id', mri.id, 'material_id', mri.material_id, 'material_name', mri.material_name, 'requested_quantity', mri.requested_quantity, 'approved_quantity', mri.approved_quantity, 'unit', mri.unit, 'status', mri.status)
               ORDER BY mri.id
             ) FILTER (WHERE mri.id IS NOT NULL),
             '[]'
           ) AS items
    FROM material_requests mr
    LEFT JOIN material_request_items mri ON mr.id = mri.request_id
    WHERE mr.id = $1
    GROUP BY mr.id
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createMaterialRequest = async (requestData) => {
  const { order_id, technician_id, technician_name, request_date, priority, observations, user_id_registration } = requestData;
  const query = `
    INSERT INTO material_requests (order_id, technician_id, technician_name, request_date, priority, observations, status, user_id_registration, date_time_registration)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, technician_id, technician_name, request_date || null, priority || 'normal', observations, user_id_registration]);
  return result.rows[0];
};

const updateMaterialRequest = async (id, requestData) => {
  const { order_id, technician_id, technician_name, request_date, priority, observations, approval_date, approved_by, delivery_date, delivered_by, status, user_id_modification } = requestData;
  const query = `
    UPDATE material_requests
    SET order_id = COALESCE($1, order_id), technician_id = COALESCE($2, technician_id), technician_name = COALESCE($3, technician_name),
        request_date = COALESCE($4, request_date), priority = COALESCE($5, priority), observations = COALESCE($6, observations),
        approval_date = COALESCE($7, approval_date), approved_by = COALESCE($8, approved_by), delivery_date = COALESCE($9, delivery_date),
        delivered_by = COALESCE($10, delivered_by), status = COALESCE($11, status),
        user_id_modification = $12, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *
  `;
  const result = await pool.query(query, [order_id, technician_id, technician_name, request_date, priority, observations, approval_date, approved_by, delivery_date, delivered_by, status, user_id_modification, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteMaterialRequest = async (id, user_id) => {
  const query = `UPDATE material_requests SET status = 'cancelled', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const addMaterialRequestItems = async (requestId, items, userId) => {
  const insertedItems = [];

  for (const item of items) {
    const query = `
      INSERT INTO material_request_items (
        request_id, material_id, material_name, requested_quantity, unit, observations,
        status, user_id_registration, date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      requestId,
      item.materialId || item.material_id || null,
      item.nombre || item.material_name || 'Material',
      item.cantidadSolicitada || item.requested_quantity || 1,
      item.unidadMedida || item.unit || 'unidad',
      item.observaciones || item.observations || null,
      userId
    ]);
    insertedItems.push(result.rows[0]);
  }

  return insertedItems;
};

module.exports = { getAllMaterialRequests, getMaterialRequestById, createMaterialRequest, updateMaterialRequest, deleteMaterialRequest, addMaterialRequestItems };
