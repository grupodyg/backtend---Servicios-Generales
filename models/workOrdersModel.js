const pool = require('../config/db');
const { getCurrentYear, getCurrentTimestamp } = require('../utils/dateUtils');

const getAllWorkOrders = async (filters = {}) => {
  const { status = 'all', approval_status, assigned_technician, client_id, priority, search } = filters;
  let query = `
    SELECT wo.*,
           c.name AS client_name,
           c.type AS client_type,
           COALESCE(
             (SELECT MAX(dr.progress_percentage) FROM daily_reports dr WHERE dr.order_id = wo.id AND dr.status = 'active'),
             wo.progress_percentage
           ) AS progress_percentage
    FROM work_orders wo
    LEFT JOIN clients c ON wo.client_id = c.id
    WHERE wo.status != 'deleted'
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND wo.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (approval_status) {
    query += ` AND wo.approval_status = $${paramIndex}`;
    params.push(approval_status);
    paramIndex++;
  }

  if (assigned_technician) {
    // Normalizar el nombre del técnico: reemplazar tildes y convertir a minúsculas
    const normalizedTechnician = assigned_technician
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Elimina diacríticos (tildes)

    // Búsqueda flexible: case-insensitive, sin acentos, permite coincidencia parcial
    // Usa ILIKE para case-insensitive y busca tanto coincidencia exacta como que empiece con el nombre
    query += ` AND (
      translate(LOWER(wo.assigned_technician), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon') ILIKE $${paramIndex}
      OR translate(LOWER(wo.assigned_technician), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon') ILIKE $${paramIndex + 1}
    )`;
    params.push(normalizedTechnician);
    params.push(normalizedTechnician + '%');
    paramIndex += 2;
  }

  if (client_id) {
    query += ` AND wo.client_id = $${paramIndex}`;
    params.push(client_id);
    paramIndex++;
  }

  if (priority) {
    query += ` AND wo.priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  if (search) {
    query += ` AND (wo.id ILIKE $${paramIndex} OR wo.client ILIKE $${paramIndex} OR wo.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' ORDER BY wo.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getWorkOrderById = async (id) => {
  const query = `
    SELECT wo.*,
           c.name AS client_name,
           c.type AS client_type,
           c.email AS client_email,
           c.phone AS client_phone,
           COALESCE(
             (SELECT MAX(dr.progress_percentage) FROM daily_reports dr WHERE dr.order_id = wo.id AND dr.status = 'active'),
             wo.progress_percentage
           ) AS progress_percentage
    FROM work_orders wo
    LEFT JOIN clients c ON wo.client_id = c.id
    WHERE wo.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createWorkOrder = async (orderData) => {
  const {
    id, client, client_id, service_type, visit_type, technical_visit_id,
    based_on_technical_visit, description, location, priority, due_date,
    estimated_cost, assigned_technician, requested_by, progress_percentage,
    approval_status, estimated_materials, estimated_time, required_tools,
    gps_coordinates, project_name, personnel_list, purchase_order_number,
    purchase_order_document, solpe, resources, selected_materials,
    selected_tools, user_id_registration
  } = orderData;

  // Obtener timestamp actual en zona horaria de Lima
  const currentTs = getCurrentTimestamp();

  const query = `
    INSERT INTO work_orders (
      id, client, client_id, service_type, visit_type, technical_visit_id,
      based_on_technical_visit, description, location, priority, due_date,
      estimated_cost, assigned_technician, requested_by, progress_percentage,
      approval_status, estimated_materials, estimated_time, required_tools,
      gps_coordinates, project_name, personnel_list, purchase_order_number,
      purchase_order_document, first_visit_completed, solpe, resources,
      selected_materials, selected_tools, status, user_id_registration,
      date_time_registration
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, false, $25, $26, $27, $28,
      'pending', $29, $30
    )
    RETURNING *
  `;

  // Helper para serializar campos JSONB de forma segura
  const toJson = (value) => value ? JSON.stringify(value) : null;

  const result = await pool.query(query, [
    id, client, client_id, service_type, visit_type, technical_visit_id,
    based_on_technical_visit || false, description, location, priority, due_date,
    estimated_cost, assigned_technician, requested_by, progress_percentage || 0,
    approval_status || 'unassigned',
    toJson(estimated_materials),      // JSONB - serializar
    toJson(estimated_time),           // JSONB - serializar
    toJson(required_tools),           // JSONB - serializar
    toJson(gps_coordinates),          // JSONB - serializar
    project_name,
    toJson(personnel_list),           // JSONB - serializar
    purchase_order_number,
    toJson(purchase_order_document),  // JSONB - serializar
    solpe,
    toJson(resources),                // JSONB - serializar
    toJson(selected_materials),       // JSONB - serializar
    toJson(selected_tools),           // JSONB - serializar
    user_id_registration, currentTs
  ]);
  return result.rows[0];
};

const updateWorkOrder = async (id, orderData) => {
  const {
    client, client_id, service_type, visit_type, description, location,
    priority, due_date, estimated_cost, assigned_technician, requested_by,
    progress_percentage, approval_status, estimation_date, approval_date,
    approved_by, rejection_date, rejected_by, rejection_reason,
    estimated_materials, estimated_time, required_tools, gps_coordinates,
    project_name, personnel_list, purchase_order_number, purchase_order_document,
    first_visit_completed, first_visit_date, reassignment_date, reassigned_by,
    resources, selected_materials, selected_tools, solpe, resources_update_date,
    status, user_id_modification
  } = orderData;

  const query = `
    UPDATE work_orders
    SET client = COALESCE($1, client),
        client_id = COALESCE($2, client_id),
        service_type = COALESCE($3, service_type),
        visit_type = COALESCE($4, visit_type),
        description = COALESCE($5, description),
        location = COALESCE($6, location),
        priority = COALESCE($7, priority),
        due_date = COALESCE($8, due_date),
        estimated_cost = COALESCE($9, estimated_cost),
        assigned_technician = COALESCE($10, assigned_technician),
        requested_by = COALESCE($11, requested_by),
        progress_percentage = COALESCE($12, progress_percentage),
        approval_status = COALESCE($13, approval_status),
        estimation_date = COALESCE($14, estimation_date),
        approval_date = COALESCE($15, approval_date),
        approved_by = COALESCE($16, approved_by),
        rejection_date = COALESCE($17, rejection_date),
        rejected_by = COALESCE($18, rejected_by),
        rejection_reason = COALESCE($19, rejection_reason),
        estimated_materials = COALESCE($20, estimated_materials),
        estimated_time = COALESCE($21, estimated_time),
        required_tools = COALESCE($22, required_tools),
        gps_coordinates = COALESCE($23, gps_coordinates),
        project_name = COALESCE($24, project_name),
        personnel_list = COALESCE($25, personnel_list),
        purchase_order_number = COALESCE($26, purchase_order_number),
        purchase_order_document = COALESCE($27, purchase_order_document),
        first_visit_completed = COALESCE($28, first_visit_completed),
        first_visit_date = COALESCE($29, first_visit_date),
        reassignment_date = COALESCE($30, reassignment_date),
        reassigned_by = COALESCE($31, reassigned_by),
        resources = COALESCE($32, resources),
        selected_materials = COALESCE($33, selected_materials),
        selected_tools = COALESCE($34, selected_tools),
        solpe = COALESCE($35, solpe),
        resources_update_date = COALESCE($36, resources_update_date),
        status = COALESCE($37, status),
        user_id_modification = $38,
        date_time_modification = $39
    WHERE id = $40
    RETURNING *
  `;

  // Obtener timestamp actual en zona horaria de Lima
  const currentTs = getCurrentTimestamp();

  // Helper para serializar campos JSONB de forma segura
  const toJson = (value) => value ? JSON.stringify(value) : null;

  const result = await pool.query(query, [
    client, client_id, service_type, visit_type, description, location,
    priority, due_date, estimated_cost, assigned_technician, requested_by,
    progress_percentage, approval_status, estimation_date, approval_date,
    approved_by, rejection_date, rejected_by, rejection_reason,
    toJson(estimated_materials),      // JSONB - serializar
    toJson(estimated_time),           // JSONB - serializar
    toJson(required_tools),           // JSONB - serializar
    toJson(gps_coordinates),          // JSONB - serializar
    project_name,
    toJson(personnel_list),           // JSONB - serializar
    purchase_order_number,
    toJson(purchase_order_document),  // JSONB - serializar
    first_visit_completed, first_visit_date, reassignment_date, reassigned_by,
    toJson(resources),                // JSONB - serializar
    toJson(selected_materials),       // JSONB - serializar
    toJson(selected_tools),           // JSONB - serializar
    solpe, resources_update_date,
    status, user_id_modification, currentTs, id
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteWorkOrder = async (id, user_id) => {
  const currentTs = getCurrentTimestamp();
  const query = `
    UPDATE work_orders
    SET status = 'deleted', user_id_modification = $1, date_time_modification = $2
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, currentTs, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Generar ID de orden de trabajo (formato: OT-YYYY-XXXXX)
const generateWorkOrderId = async () => {
  const year = getCurrentYear();
  const prefix = `OT-${year}-`;

  const query = `
    SELECT id FROM work_orders
    WHERE id LIKE $1
    ORDER BY id DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [`${prefix}%`]);

  if (result.rows.length === 0) {
    return `${prefix}00001`;
  }

  const lastId = result.rows[0].id;
  const lastNumber = parseInt(lastId.split('-')[2]);
  const newNumber = (lastNumber + 1).toString().padStart(5, '0');

  return `${prefix}${newNumber}`;
};

const getWorkOrderHistory = async (workOrderId) => {
  // Combinar historial de cambios con reportes diarios generados
  const query = `
    SELECT * FROM (
      -- Historial de cambios de la orden
      SELECT
        woh.id::text,
        woh.work_order_id,
        woh.user_id,
        COALESCE(u.name, 'Sistema') AS user_name,
        u.email AS user_email,
        woh.action_type,
        woh.action_description,
        woh.field_changed,
        woh.old_value,
        woh.new_value,
        woh.ip_address,
        woh.created_at,
        'history' AS source
      FROM work_order_history woh
      LEFT JOIN users u ON woh.user_id = u.id
      WHERE woh.work_order_id = $1

      UNION ALL

      -- Reportes diarios generados
      SELECT
        dr.id::text,
        dr.order_id AS work_order_id,
        dr.user_id_registration AS user_id,
        COALESCE(dr.technician, 'Técnico') AS user_name,
        NULL AS user_email,
        'report_created' AS action_type,
        CONCAT('Reporte diario generado - ', dr.progress_percentage, '% avance') AS action_description,
        'daily_report' AS field_changed,
        NULL::text AS old_value,
        dr.work_description AS new_value,
        NULL::text AS ip_address,
        dr.date_time_registration AS created_at,
        'report' AS source
      FROM daily_reports dr
      WHERE dr.order_id = $1 AND dr.status = 'active'
    ) AS combined
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [workOrderId]);
  return result.rows;
};

const addWorkOrderHistoryEntry = async (historyData) => {
  const {
    work_order_id,
    user_id,
    action_type,
    action_description,
    field_changed = null,
    old_value = null,
    new_value = null,
    ip_address = null,
    user_agent = null
  } = historyData;

  const query = `
    INSERT INTO work_order_history (
      work_order_id,
      user_id,
      action_type,
      action_description,
      field_changed,
      old_value,
      new_value,
      ip_address,
      user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const values = [
    work_order_id,
    user_id,
    action_type,
    action_description,
    field_changed,
    old_value,
    new_value,
    ip_address,
    user_agent
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Actualizar el progreso de una orden basándose en los reportes diarios
const updateWorkOrderProgress = async (workOrderId) => {
  try {
    const currentTs = getCurrentTimestamp();
    // Calcular el progreso basado en el último reporte o el promedio
    const query = `
      UPDATE work_orders
      SET progress_percentage = (
        SELECT COALESCE(MAX(progress_percentage), 0)
        FROM daily_reports
        WHERE order_id = $1
          AND status = 'active'
      ),
      date_time_modification = $2
      WHERE id = $1
      RETURNING progress_percentage
    `;

    const result = await pool.query(query, [workOrderId, currentTs]);
    return result.rows.length > 0 ? result.rows[0].progress_percentage : 0;
  } catch (error) {
    console.error(`Error actualizando progreso de orden ${workOrderId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  generateWorkOrderId,
  getWorkOrderHistory,
  addWorkOrderHistoryEntry,
  updateWorkOrderProgress
};
