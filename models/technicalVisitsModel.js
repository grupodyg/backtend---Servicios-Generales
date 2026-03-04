const pool = require('../config/db');
const { getCurrentYear, getCurrentTimestamp, TIMEZONE } = require('../utils/dateUtils');

const getAllTechnicalVisits = async (filters = {}) => {
  const { status = 'all', client_id, assigned_technician, visit_date_from, visit_date_to, search } = filters;
  let query = `
    SELECT tv.*,
           c.name AS client_name,
           COALESCE(
             json_agg(
               json_build_object('id', tvt.id, 'name', tvt.name, 'specialty', tvt.specialty)
               ORDER BY tvt.name
             ) FILTER (WHERE tvt.id IS NOT NULL),
             '[]'
           ) AS technicians
    FROM technical_visits tv
    LEFT JOIN clients c ON tv.client_id = c.id
    LEFT JOIN technical_visit_technicians tvt ON tv.id = tvt.visit_id AND tvt.status = 'active'
    WHERE tv.status != 'deleted'
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND tv.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (client_id) {
    query += ` AND tv.client_id = $${paramIndex}`;
    params.push(client_id);
    paramIndex++;
  }

  if (assigned_technician) {
    query += ` AND tv.assigned_technician = $${paramIndex}`;
    params.push(assigned_technician);
    paramIndex++;
  }

  if (visit_date_from) {
    query += ` AND tv.visit_date >= $${paramIndex}`;
    params.push(visit_date_from);
    paramIndex++;
  }

  if (visit_date_to) {
    query += ` AND tv.visit_date <= $${paramIndex}`;
    params.push(visit_date_to);
    paramIndex++;
  }

  if (search) {
    query += ` AND (tv.id ILIKE $${paramIndex} OR tv.client ILIKE $${paramIndex} OR tv.project_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' GROUP BY tv.id, c.name ORDER BY tv.visit_date DESC, tv.visit_time DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getTechnicalVisitById = async (id) => {
  const query = `
    SELECT tv.*,
           c.name AS client_name,
           COALESCE(
             json_agg(
               json_build_object('id', tvt.id, 'technician_id', tvt.technician_id, 'name', tvt.name, 'specialty', tvt.specialty, 'status', tvt.status)
               ORDER BY tvt.name
             ) FILTER (WHERE tvt.id IS NOT NULL),
             '[]'
           ) AS technicians
    FROM technical_visits tv
    LEFT JOIN clients c ON tv.client_id = c.id
    LEFT JOIN technical_visit_technicians tvt ON tv.id = tvt.visit_id
    WHERE tv.id = $1
    GROUP BY tv.id, c.name
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Nueva función para obtener visitas por técnico (usando tabla relacional)
const getVisitsByTechnician = async (technicianId, filters = {}) => {
  const { status = 'all', visit_date_from, visit_date_to, search } = filters;
  let query = `
    SELECT tv.*,
           c.name AS client_name,
           COALESCE(
             json_agg(
               json_build_object('id', tvt2.id, 'technician_id', tvt2.technician_id, 'name', tvt2.name, 'specialty', tvt2.specialty)
               ORDER BY tvt2.name
             ) FILTER (WHERE tvt2.id IS NOT NULL),
             '[]'
           ) AS technicians
    FROM technical_visits tv
    LEFT JOIN clients c ON tv.client_id = c.id
    INNER JOIN technical_visit_technicians tvt ON tv.id = tvt.visit_id
      AND tvt.technician_id = $1
      AND tvt.status = 'active'
    LEFT JOIN technical_visit_technicians tvt2 ON tv.id = tvt2.visit_id
      AND tvt2.status = 'active'
    WHERE tv.status != 'deleted'
  `;
  const params = [technicianId];
  let paramIndex = 2;

  if (status !== 'all') {
    query += ` AND tv.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (visit_date_from) {
    query += ` AND tv.visit_date >= $${paramIndex}`;
    params.push(visit_date_from);
    paramIndex++;
  }

  if (visit_date_to) {
    query += ` AND tv.visit_date <= $${paramIndex}`;
    params.push(visit_date_to);
    paramIndex++;
  }

  if (search) {
    query += ` AND (tv.id ILIKE $${paramIndex} OR tv.client ILIKE $${paramIndex} OR tv.project_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' GROUP BY tv.id, c.name ORDER BY tv.visit_date DESC, tv.visit_time DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

// Función helper para sincronizar assigned_technician con tabla relacional
const syncAssignedTechnicianField = async (visitId, client_db = null) => {
  const db = client_db || pool;

  const query = `
    UPDATE technical_visits tv
    SET assigned_technician = (
      SELECT string_agg(tvt.name, ', ' ORDER BY tvt.name)
      FROM technical_visit_technicians tvt
      WHERE tvt.visit_id = tv.id
        AND tvt.status = 'active'
    )
    WHERE tv.id = $1
    RETURNING assigned_technician
  `;

  const result = await db.query(query, [visitId]);
  return result.rows[0]?.assigned_technician;
};

const createTechnicalVisit = async (visitData) => {
  const {
    id, client, client_id, address, contact, phone, email, visit_date, visit_time,
    service_type, service_description, observations, requested_by,
    project_name, gps_coordinates, estimated_materials, required_tools, required_personnel,
    personnel_list, place_status, solpe, user_id_registration, technicians
  } = visitData;

  // Generar assigned_technician desde array de technicians si no viene del frontend
  let assigned_technician = visitData.assigned_technician;
  if (!assigned_technician && technicians && Array.isArray(technicians) && technicians.length > 0) {
    assigned_technician = technicians
      .map(t => t.name || t.nombre)
      .filter(Boolean)
      .join(', ');
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    // Obtener timestamp actual en zona horaria de Lima
    const currentTs = getCurrentTimestamp();

    // Insertar la visita técnica
    const query = `
      INSERT INTO technical_visits (
        id, client, client_id, address, contact, phone, email, visit_date, visit_time,
        service_type, service_description, observations, assigned_technician, requested_by,
        project_name, gps_coordinates, estimated_materials, required_tools, required_personnel,
        personnel_list, place_status, solpe, status, user_id_registration, date_time_registration
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, 'pending', $23, $24
      )
      RETURNING *
    `;

    const result = await client_db.query(query, [
      id, client, client_id, address, contact, phone, email, visit_date, visit_time,
      service_type, service_description, observations, assigned_technician, requested_by,
      project_name, gps_coordinates, estimated_materials, required_tools, required_personnel,
      personnel_list, place_status, solpe, user_id_registration, currentTs
    ]);

    const newVisit = result.rows[0];

    // Insertar técnicos asignados en la tabla de relación
    if (technicians && Array.isArray(technicians) && technicians.length > 0) {
      const technicianInsertQuery = `
        INSERT INTO technical_visit_technicians (visit_id, technician_id, name, specialty, status)
        VALUES ($1, $2, $3, $4, 'active')
      `;

      for (const tech of technicians) {
        await client_db.query(technicianInsertQuery, [
          id,
          tech.id || tech.technician_id,
          tech.nombre || tech.name,
          tech.especialidad || tech.specialty
        ]);
      }
    }

    await client_db.query('COMMIT');

    // Retornar la visita con los técnicos
    return await getTechnicalVisitById(id);
  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
};

const updateTechnicalVisit = async (id, visitData) => {
  try {
    console.log('📝 updateTechnicalVisit - ID:', id);
    console.log('📝 updateTechnicalVisit - visitData:', JSON.stringify(visitData, null, 2));

    const client_db = await pool.connect();

    try {
      await client_db.query('BEGIN');

      // Si se envían técnicos en el update, actualizar la tabla relacional
      if ('technicians' in visitData && visitData.technicians !== undefined) {
        // Eliminar técnicos existentes (marcarlos como inactivos)
        await client_db.query(
          `UPDATE technical_visit_technicians SET status = 'inactive' WHERE visit_id = $1`,
          [id]
        );

        // Insertar nuevos técnicos
        if (Array.isArray(visitData.technicians) && visitData.technicians.length > 0) {
          const technicianInsertQuery = `
            INSERT INTO technical_visit_technicians (visit_id, technician_id, name, specialty, status)
            VALUES ($1, $2, $3, $4, 'active')
          `;

          for (const tech of visitData.technicians) {
            await client_db.query(technicianInsertQuery, [
              id,
              tech.id || tech.technician_id,
              tech.nombre || tech.name,
              tech.especialidad || tech.specialty
            ]);
          }
        }

        // Sincronizar assigned_technician desde la tabla relacional
        await syncAssignedTechnicianField(id, client_db);
      } else if ('assigned_technician' in visitData && visitData.assigned_technician !== undefined) {
        // Si solo se envía assigned_technician (sin array de technicians), generarlo desde technicians
        const technicianData = visitData.assigned_technician;
        if (!technicianData) {
          // Si viene null, sincronizar desde la tabla relacional
          await syncAssignedTechnicianField(id, client_db);
        }
      }

      // Construir query dinámica solo con campos presentes
      const setFields = [];
      const values = [];
      let paramIndex = 1;

    // Mapeo de campos frontend a backend
    const fieldMapping = {
      client: 'client',
      client_id: 'client_id',
      address: 'address',
      contact: 'contact',
      phone: 'phone',
      email: 'email',
      visit_date: 'visit_date',
      visit_time: 'visit_time',
      service_type: 'service_type',
      service_description: 'service_description',
      observations: 'observations',
      assigned_technician: 'assigned_technician',
      requested_by: 'requested_by',
      project_name: 'project_name',
      gps_coordinates: 'gps_coordinates',
      estimated_materials: 'estimated_materials',
      required_tools: 'required_tools',
      required_personnel: 'required_personnel',
      personnel_list: 'personnel_list',
      place_status: 'place_status',
      technician_signature: 'technician_signature',
      completed_date: 'completed_date',
      place_status_registration_date: 'place_status_registration_date',
      generated_quotation: 'generated_quotation',
      quotation_generation_date: 'quotation_generation_date',
      generated_order: 'generated_order',
      order_generation_date: 'order_generation_date',
      approval: 'approval',
      solpe: 'solpe',
      status: 'status'
    };

    // Agregar solo los campos que están presentes en visitData
    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (key in visitData) {
        setFields.push(`${dbField} = $${paramIndex}`);

        // Para campos JSONB, convertir a JSON string si es objeto/array
        let value = visitData[key];
        if (['gps_coordinates', 'estimated_materials', 'required_tools', 'required_personnel', 'personnel_list', 'place_status', 'approval'].includes(key)) {
          if (value !== null && typeof value === 'object') {
            value = JSON.stringify(value);
          }
        }

        values.push(value);
        paramIndex++;
      }
    }

    // Siempre actualizar user_id_modification y date_time_modification
    setFields.push(`user_id_modification = $${paramIndex}`);
    values.push(visitData.user_id_modification);
    paramIndex++;

    // Usar timestamp con zona horaria de Lima en lugar de CURRENT_TIMESTAMP
    setFields.push(`date_time_modification = $${paramIndex}`);
    values.push(getCurrentTimestamp());
    paramIndex++;

    // Construir query
    const query = `
      UPDATE technical_visits
      SET ${setFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);

      console.log('📝 Generated Query:', query);
      console.log('📝 Query Values:', values);

      // Ejecutar UPDATE dentro de la transacción
      const result = await client_db.query(query, values);
      console.log('✅ Update successful, rows affected:', result.rowCount);

      // Commit de la transacción
      await client_db.query('COMMIT');

      // Retornar la visita actualizada con los técnicos
      const updatedVisit = await getTechnicalVisitById(id);
      return updatedVisit;
    } catch (error) {
      await client_db.query('ROLLBACK');
      console.error('❌ Error in updateTechnicalVisit:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    } finally {
      client_db.release();
    }
  } catch (error) {
    console.error('❌ Error in updateTechnicalVisit (outer):', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};

const deleteTechnicalVisit = async (id, user_id) => {
  const currentTs = getCurrentTimestamp();
  const query = `
    UPDATE technical_visits
    SET status = 'deleted', user_id_modification = $1, date_time_modification = $2
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, currentTs, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const generateTechnicalVisitId = async () => {
  const year = getCurrentYear();
  const prefix = `VT-${year}-`;
  const query = `SELECT id FROM technical_visits WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`;
  const result = await pool.query(query, [`${prefix}%`]);
  if (result.rows.length === 0) return `${prefix}00001`;
  const lastId = result.rows[0].id;
  const lastNumber = parseInt(lastId.split('-')[2]);
  const newNumber = (lastNumber + 1).toString().padStart(5, '0');
  return `${prefix}${newNumber}`;
};

module.exports = {
  getAllTechnicalVisits,
  getTechnicalVisitById,
  getVisitsByTechnician,
  createTechnicalVisit,
  updateTechnicalVisit,
  deleteTechnicalVisit,
  generateTechnicalVisitId
};
