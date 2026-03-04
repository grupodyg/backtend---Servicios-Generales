const pool = require('../config/db');

const getAllDailyReports = async (filters = {}) => {
  const { status = 'active', order_id, installation_id, technician, report_date_from, report_date_to } = filters;
  let query = `
    SELECT dr.*,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object('id', rm.id, 'name', rm.name, 'quantity', rm.quantity, 'unit', rm.unit)
               ORDER BY jsonb_build_object('id', rm.id, 'name', rm.name, 'quantity', rm.quantity, 'unit', rm.unit)
             ) FILTER (WHERE rm.id IS NOT NULL),
             '[]'
           ) AS materials,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object('id', rp.id, 'photo_type', rp.photo_type, 'url', rp.url, 'name', rp.name)
               ORDER BY jsonb_build_object('id', rp.id, 'photo_type', rp.photo_type, 'url', rp.url, 'name', rp.name)
             ) FILTER (WHERE rp.id IS NOT NULL),
             '[]'
           ) AS photos
    FROM daily_reports dr
    LEFT JOIN report_materials rm ON dr.id = rm.report_id AND rm.status = 'active'
    LEFT JOIN report_photos rp ON dr.id = rp.report_id AND rp.status = 'active'
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND dr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (order_id) {
    query += ` AND dr.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (installation_id) {
    query += ` AND dr.installation_id = $${paramIndex}`;
    params.push(installation_id);
    paramIndex++;
  }

  if (technician) {
    query += ` AND dr.technician = $${paramIndex}`;
    params.push(technician);
    paramIndex++;
  }

  if (report_date_from) {
    query += ` AND dr.report_date >= $${paramIndex}`;
    params.push(report_date_from);
    paramIndex++;
  }

  if (report_date_to) {
    query += ` AND dr.report_date <= $${paramIndex}`;
    params.push(report_date_to);
    paramIndex++;
  }

  query += ' GROUP BY dr.id ORDER BY dr.report_date DESC, dr.creation_time DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getDailyReportById = async (id) => {
  const query = `
    SELECT dr.*,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object('id', rm.id, 'name', rm.name, 'quantity', rm.quantity, 'unit', rm.unit, 'status', rm.status)
               ORDER BY jsonb_build_object('id', rm.id, 'name', rm.name, 'quantity', rm.quantity, 'unit', rm.unit, 'status', rm.status)
             ) FILTER (WHERE rm.id IS NOT NULL),
             '[]'
           ) AS materials,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object('id', rp.id, 'photo_type', rp.photo_type, 'url', rp.url, 'name', rp.name, 'size', rp.size, 'status', rp.status)
               ORDER BY jsonb_build_object('id', rp.id, 'photo_type', rp.photo_type, 'url', rp.url, 'name', rp.name, 'size', rp.size, 'status', rp.status)
             ) FILTER (WHERE rp.id IS NOT NULL),
             '[]'
           ) AS photos
    FROM daily_reports dr
    LEFT JOIN report_materials rm ON dr.id = rm.report_id
    LEFT JOIN report_photos rp ON dr.id = rp.report_id
    WHERE dr.id = $1
    GROUP BY dr.id
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createDailyReport = async (reportData) => {
  const {
    order_id, installation_id, report_type, technician, report_date, start_time, end_time,
    work_description, progress_percentage, work_at_height, ats_document, ptr_document,
    environmental_aspects_document, observations, next_tasks, creation_time, user_id_registration
  } = reportData;

  const query = `
    INSERT INTO daily_reports (
      order_id, installation_id, report_type, technician, report_date, start_time, end_time,
      work_description, progress_percentage, work_at_height, ats_document, ptr_document,
      environmental_aspects_document, observations, next_tasks, creation_time, status,
      user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active', $17, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    order_id, installation_id, report_type, technician, report_date, start_time, end_time,
    work_description, progress_percentage || 0, work_at_height || false, ats_document,
    ptr_document, environmental_aspects_document, observations, next_tasks, creation_time,
    user_id_registration
  ]);

  // Actualizar progress_percentage en work_orders si existe order_id
  if (order_id && progress_percentage !== null && progress_percentage !== undefined) {
    await pool.query(
      `UPDATE work_orders
       SET progress_percentage = $1,
           user_id_modification = $2,
           date_time_modification = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [progress_percentage, user_id_registration, order_id]
    );
  }

  return result.rows[0];
};

const updateDailyReport = async (id, reportData) => {
  const {
    order_id, installation_id, report_type, technician, report_date, start_time, end_time,
    work_description, progress_percentage, work_at_height, ats_document, ptr_document,
    environmental_aspects_document, observations, next_tasks, creation_time, status,
    user_id_modification
  } = reportData;

  const query = `
    UPDATE daily_reports
    SET order_id = COALESCE($1, order_id),
        installation_id = COALESCE($2, installation_id),
        report_type = COALESCE($3, report_type),
        technician = COALESCE($4, technician),
        report_date = COALESCE($5, report_date),
        start_time = COALESCE($6, start_time),
        end_time = COALESCE($7, end_time),
        work_description = COALESCE($8, work_description),
        progress_percentage = COALESCE($9, progress_percentage),
        work_at_height = COALESCE($10, work_at_height),
        ats_document = COALESCE($11, ats_document),
        ptr_document = COALESCE($12, ptr_document),
        environmental_aspects_document = COALESCE($13, environmental_aspects_document),
        observations = COALESCE($14, observations),
        next_tasks = COALESCE($15, next_tasks),
        creation_time = COALESCE($16, creation_time),
        status = COALESCE($17, status),
        user_id_modification = $18,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $19
    RETURNING *
  `;

  const result = await pool.query(query, [
    order_id, installation_id, report_type, technician, report_date, start_time, end_time,
    work_description, progress_percentage, work_at_height, ats_document, ptr_document,
    environmental_aspects_document, observations, next_tasks, creation_time, status,
    user_id_modification, id
  ]);

  // Actualizar progress_percentage en work_orders si se modificó
  if (result.rows.length > 0) {
    const updatedReport = result.rows[0];
    if (updatedReport.order_id && progress_percentage !== null && progress_percentage !== undefined) {
      await pool.query(
        `UPDATE work_orders
         SET progress_percentage = $1,
             user_id_modification = $2,
             date_time_modification = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [progress_percentage, user_id_modification, updatedReport.order_id]
      );
    }
  }

  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteDailyReport = async (id, user_id) => {
  const query = `
    UPDATE daily_reports
    SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// ========================================
// ESTADÍSTICAS POR TÉCNICO (DATOS REALES)
// Usa UNACCENT para comparar nombres ignorando acentos
// CORREGIDO: Considera estados en español e inglés
// ========================================
const getStatisticsByTechnician = async () => {
  // Verificar si UNACCENT está disponible
  let useUnaccent = false;
  try {
    await pool.query("SELECT unaccent('test')");
    useUnaccent = true;
  } catch (e) {
    console.log('⚠️ Extensión UNACCENT no disponible, usando TRANSLATE para normalizar');
  }

  // Construir query con UNACCENT o TRANSLATE como fallback
  // Nota: assigned_technician tiene formato "Nombre - Especialidad", por eso usamos LIKE
  const normalizeFunc = useUnaccent
    ? 'UNACCENT(LOWER(%s))'
    : "TRANSLATE(LOWER(%s), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon')";

  const compareFunc = useUnaccent
    ? 'UNACCENT(LOWER(wo.assigned_technician)) LIKE UNACCENT(LOWER(u.name)) || \'%\''
    : "TRANSLATE(LOWER(wo.assigned_technician), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon') LIKE TRANSLATE(LOWER(u.name), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon') || '%'";

  const compareReports = useUnaccent
    ? 'UNACCENT(LOWER(dr.technician)) = UNACCENT(LOWER(u.name))'
    : "TRANSLATE(LOWER(dr.technician), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon') = TRANSLATE(LOWER(u.name), 'áéíóúàèìòùäëïöüâêîôûãõñ', 'aeiouaeiouaeiouaeiouaon')";

  const query = `
    SELECT
      u.name AS technician,
      u.specialty,
      COUNT(DISTINCT wo.id) AS total_orders,
      COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) AS completed_orders,
      COUNT(DISTINCT CASE WHEN wo.status = 'in_progress' THEN wo.id END) AS in_progress_orders,
      COUNT(DISTINCT dr.id) AS total_reports,
      ROUND(COALESCE(AVG(dr.progress_percentage), 0)::numeric, 0) AS avg_progress,
      ROUND(
        CASE
          WHEN COUNT(DISTINCT wo.id) > 0
          THEN (COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END)::numeric / COUNT(DISTINCT wo.id)::numeric) * 100
          ELSE 0
        END, 0
      ) AS efficiency
    FROM users u
    LEFT JOIN work_orders wo ON ${compareFunc} AND wo.status NOT IN ('cancelled', 'deleted')
    LEFT JOIN daily_reports dr ON ${compareReports} AND dr.status = 'active'
    WHERE u.role_id = 4 AND u.status = 'active'
    GROUP BY u.id, u.name, u.specialty
    ORDER BY total_reports DESC, efficiency DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// ========================================
// ESTADÍSTICAS GENERALES DE REPORTES
// ========================================
const getReportStatistics = async () => {
  const query = `
    SELECT
      COUNT(*) AS total_reports,
      COUNT(CASE WHEN report_date = CURRENT_DATE THEN 1 END) AS reports_today,
      COUNT(CASE WHEN report_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS reports_last_week,
      COUNT(CASE WHEN report_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS reports_last_month,
      ROUND(AVG(progress_percentage)::numeric, 0) AS avg_progress,
      COUNT(DISTINCT technician) AS active_technicians,
      COUNT(DISTINCT order_id) AS orders_with_reports
    FROM daily_reports
    WHERE status = 'active'
  `;
  const result = await pool.query(query);
  return result.rows[0];
};

// ========================================
// KPIs CALCULADOS DESDE LA BD
// ========================================
const getKPIs = async () => {
  // 1. Tasa de cumplimiento: órdenes completadas / total órdenes activas * 100
  // CORREGIDO: Considera estados en español e inglés
  const completionQuery = `
    SELECT
      COUNT(*) AS total_orders,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
      ROUND(
        CASE
          WHEN COUNT(*) > 0
          THEN (COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric) * 100
          ELSE 0
        END, 1
      ) AS completion_rate
    FROM work_orders
    WHERE status NOT IN ('cancelled', 'deleted')
  `;

  // 2. Días promedio por orden (desde fecha de creación hasta completada)
  // CORREGIDO: Considera estados en español e inglés
  const avgDaysQuery = `
    SELECT
      ROUND(
        AVG(
          CASE
            WHEN status = 'completed' AND date_time_modification IS NOT NULL
            THEN EXTRACT(EPOCH FROM (date_time_modification - date_time_registration)) / 86400
            ELSE NULL
          END
        )::numeric, 1
      ) AS avg_days_per_order
    FROM work_orders
    WHERE status = 'completed'
  `;

  // 3. Costo promedio por orden (basado en órdenes de trabajo con costo estimado)
  // CORREGIDO: Excluye también deleted
  const avgCostQuery = `
    SELECT
      ROUND(AVG(estimated_cost)::numeric, 2) AS avg_cost_per_order
    FROM work_orders
    WHERE status NOT IN ('cancelled', 'deleted')
      AND estimated_cost IS NOT NULL
      AND estimated_cost > 0
  `;

  const [completionResult, avgDaysResult, avgCostResult] = await Promise.all([
    pool.query(completionQuery),
    pool.query(avgDaysQuery),
    pool.query(avgCostQuery)
  ]);

  return {
    total_orders: parseInt(completionResult.rows[0]?.total_orders) || 0,
    completed_orders: parseInt(completionResult.rows[0]?.completed_orders) || 0,
    completion_rate: parseFloat(completionResult.rows[0]?.completion_rate) || 0,
    avg_days_per_order: parseFloat(avgDaysResult.rows[0]?.avg_days_per_order) || 0,
    avg_cost_per_order: parseFloat(avgCostResult.rows[0]?.avg_cost_per_order) || 0
  };
};

// ========================================
// PRODUCTIVIDAD DIARIA (CONFIGURABLE POR PERIODO)
// ========================================
const getDailyProductivity = async (days = 7) => {
  // Validar y limitar el parámetro days
  const validDays = Math.min(Math.max(parseInt(days) || 7, 1), 365);

  const query = `
    SELECT
      report_date::date AS date,
      COUNT(*) AS reports_count,
      COUNT(DISTINCT technician) AS technicians_active,
      ROUND(AVG(progress_percentage)::numeric, 0) AS avg_progress
    FROM daily_reports
    WHERE status = 'active'
      AND report_date >= CURRENT_DATE - INTERVAL '${validDays} days'
    GROUP BY report_date::date
    ORDER BY report_date DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  getAllDailyReports,
  getDailyReportById,
  createDailyReport,
  updateDailyReport,
  deleteDailyReport,
  getStatisticsByTechnician,
  getReportStatistics,
  getDailyProductivity,
  getKPIs
};
