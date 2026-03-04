const pool = require('../config/db');
const { getCurrentYear } = require('../utils/dateUtils');

const getAllQuotations = async (filters = {}) => {
  const { status = 'all', search } = filters;
  let query = `
    SELECT q.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', qi.id, 'item_type', qi.item_type, 'description', qi.description,
                 'code', qi.code, 'quantity', qi.quantity, 'unit', qi.unit,
                 'unit_price', qi.unit_price, 'subtotal', qi.subtotal
               )
               ORDER BY qi.id
             ) FILTER (WHERE qi.id IS NOT NULL),
             '[]'
           ) AS items
    FROM quotations q
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id AND qi.status = 'active'
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status !== 'all') {
    query += ` AND q.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (search) {
    query += ` AND (q.number ILIKE $${paramIndex} OR q.prepared_by ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ' GROUP BY q.id ORDER BY q.date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getQuotationById = async (id) => {
  const query = `
    SELECT q.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', qi.id, 'item_type', qi.item_type, 'description', qi.description,
                 'code', qi.code, 'quantity', qi.quantity, 'unit', qi.unit,
                 'unit_price', qi.unit_price, 'subtotal', qi.subtotal,
                 'material_description', qi.material_description, 'labor_description', qi.labor_description,
                 'equipment_service', qi.equipment_service, 'contractor_deliverables', qi.contractor_deliverables
               )
               ORDER BY qi.id
             ) FILTER (WHERE qi.id IS NOT NULL),
             '[]'
           ) AS items
    FROM quotations q
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    WHERE q.id = $1
    GROUP BY q.id
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createQuotation = async (quotationData) => {
  const {
    number, client, quotation_date, expiration_date, validity_days, payment_conditions,
    profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, observations,
    technical_visit_id, user_id_registration
  } = quotationData;

  const query = `
    INSERT INTO quotations (
      number, client, quotation_date, expiration_date, validity_days, payment_conditions,
      profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, observations,
      technical_visit_id, status, user_id_registration, date_time_registration
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const result = await pool.query(query, [
    number, client, quotation_date, expiration_date, validity_days, payment_conditions,
    profit_margin || 0, has_prices_assigned || false, subtotal || 0, tax || 0, total || 0,
    prepared_by, observations, technical_visit_id, user_id_registration
  ]);
  return result.rows[0];
};

const updateQuotation = async (id, quotationData) => {
  const {
    client, quotation_date, expiration_date, validity_days, payment_conditions,
    profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, approved_by,
    approval_date, rejection_reason, rejection_date, observations, generated_order, status,
    user_id_modification
  } = quotationData;

  const query = `
    UPDATE quotations
    SET client = COALESCE($1, client),
        quotation_date = COALESCE($2, quotation_date),
        expiration_date = COALESCE($3, expiration_date),
        validity_days = COALESCE($4, validity_days),
        payment_conditions = COALESCE($5, payment_conditions),
        profit_margin = COALESCE($6, profit_margin),
        has_prices_assigned = COALESCE($7, has_prices_assigned),
        subtotal = COALESCE($8, subtotal),
        tax = COALESCE($9, tax),
        total = COALESCE($10, total),
        prepared_by = COALESCE($11, prepared_by),
        approved_by = COALESCE($12, approved_by),
        approval_date = COALESCE($13, approval_date),
        rejection_reason = COALESCE($14, rejection_reason),
        rejection_date = COALESCE($15, rejection_date),
        observations = COALESCE($16, observations),
        generated_order = COALESCE($17, generated_order),
        status = COALESCE($18, status),
        user_id_modification = $19,
        date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $20
    RETURNING *
  `;

  const result = await pool.query(query, [
    client, quotation_date, expiration_date, validity_days, payment_conditions,
    profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, approved_by,
    approval_date, rejection_reason, rejection_date, observations, generated_order, status,
    user_id_modification, id
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const deleteQuotation = async (id, user_id) => {
  const query = `
    UPDATE quotations
    SET status = 'cancelled', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const generateQuotationNumber = async () => {
  const year = getCurrentYear();
  const prefix = `COT-${year}-`;
  const query = `SELECT number FROM quotations WHERE number LIKE $1 ORDER BY number DESC LIMIT 1`;
  const result = await pool.query(query, [`${prefix}%`]);
  if (result.rows.length === 0) return `${prefix}00001`;
  const lastNumber = result.rows[0].number;
  const lastNum = parseInt(lastNumber.split('-')[2]);
  const newNum = (lastNum + 1).toString().padStart(5, '0');
  return `${prefix}${newNum}`;
};

/**
 * Crea una cotización junto con sus items en una transacción atómica.
 * Si algo falla, se revierte todo (todo o nada).
 */
const createQuotationWithItems = async (quotationData, items, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Crear la cotización
    const {
      number, client: clientData, quotation_date, expiration_date, validity_days, payment_conditions,
      profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, observations,
      technical_visit_id, user_id_registration
    } = quotationData;

    const quotationQuery = `
      INSERT INTO quotations (
        number, client, quotation_date, expiration_date, validity_days, payment_conditions,
        profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, observations,
        technical_visit_id, status, user_id_registration, date_time_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const quotationResult = await client.query(quotationQuery, [
      number, clientData, quotation_date, expiration_date, validity_days, payment_conditions,
      profit_margin || 0, has_prices_assigned || false, subtotal || 0, tax || 0, total || 0,
      prepared_by, observations, technical_visit_id, user_id_registration
    ]);

    const newQuotation = quotationResult.rows[0];

    // 2. Crear cada item asociado a la cotización
    const createdItems = [];
    for (const item of items) {
      const itemQuery = `
        INSERT INTO quotation_items (
          quotation_id, item_type, description, code, quantity, unit, unit_price, subtotal,
          material_description, labor_description, equipment_service, contractor_deliverables,
          status, user_id_registration, date_time_registration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const itemResult = await client.query(itemQuery, [
        newQuotation.id,
        item.item_type || item.tipo || null,
        item.description || item.descripcion || null,
        item.code || item.codigo || null,
        item.quantity || item.cantidad || 0,
        item.unit || item.unidad || null,
        item.unit_price || item.precioUnitario || 0,
        item.subtotal || 0,
        item.material_description || item.descripcionMateriales || null,
        item.labor_description || item.manoObra || null,
        item.equipment_service || item.equiposServicio || null,
        item.contractor_deliverables || item.entregablesContratista || null,
        userId
      ]);

      createdItems.push(itemResult.rows[0]);
    }

    // 3. Confirmar la transacción
    await client.query('COMMIT');

    // 4. Retornar la cotización con sus items
    return {
      ...newQuotation,
      items: createdItems
    };

  } catch (error) {
    // Si hay error, revertir todo
    await client.query('ROLLBACK');
    console.error('Error en createQuotationWithItems:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Actualiza una cotización junto con sus items en una transacción atómica.
 * Si algo falla, se revierte todo.
 */
const updateQuotationWithItems = async (id, quotationData, items, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Actualizar la cotización principal
    const {
      client: clientData, quotation_date, expiration_date, validity_days, payment_conditions,
      profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, approved_by,
      approval_date, rejection_reason, rejection_date, observations, generated_order, status
    } = quotationData;

    const quotationQuery = `
      UPDATE quotations
      SET client = COALESCE($1, client),
          quotation_date = COALESCE($2, quotation_date),
          expiration_date = COALESCE($3, expiration_date),
          validity_days = COALESCE($4, validity_days),
          payment_conditions = COALESCE($5, payment_conditions),
          profit_margin = COALESCE($6, profit_margin),
          has_prices_assigned = COALESCE($7, has_prices_assigned),
          subtotal = COALESCE($8, subtotal),
          tax = COALESCE($9, tax),
          total = COALESCE($10, total),
          prepared_by = COALESCE($11, prepared_by),
          approved_by = COALESCE($12, approved_by),
          approval_date = COALESCE($13, approval_date),
          rejection_reason = COALESCE($14, rejection_reason),
          rejection_date = COALESCE($15, rejection_date),
          observations = COALESCE($16, observations),
          generated_order = COALESCE($17, generated_order),
          status = COALESCE($18, status),
          user_id_modification = $19,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `;

    const quotationResult = await client.query(quotationQuery, [
      clientData, quotation_date, expiration_date, validity_days, payment_conditions,
      profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by, approved_by,
      approval_date, rejection_reason, rejection_date, observations, generated_order, status,
      userId, id
    ]);

    const updatedQuotation = quotationResult.rows[0];

    // 2. Actualizar items existentes y crear nuevos
    const updatedItems = [];

    for (const item of items) {
      if (item.id) {
        // Item existente - actualizar
        const itemQuery = `
          UPDATE quotation_items
          SET item_type = COALESCE($1, item_type),
              description = COALESCE($2, description),
              code = COALESCE($3, code),
              quantity = COALESCE($4, quantity),
              unit = COALESCE($5, unit),
              unit_price = COALESCE($6, unit_price),
              subtotal = COALESCE($7, subtotal),
              material_description = COALESCE($8, material_description),
              labor_description = COALESCE($9, labor_description),
              equipment_service = COALESCE($10, equipment_service),
              contractor_deliverables = COALESCE($11, contractor_deliverables),
              user_id_modification = $12,
              date_time_modification = CURRENT_TIMESTAMP
          WHERE id = $13
          RETURNING *
        `;

        const itemResult = await client.query(itemQuery, [
          item.item_type || item.tipo || null,
          item.description || item.descripcion || null,
          item.code || item.codigo || null,
          item.quantity || item.cantidad || 0,
          item.unit || item.unidad || null,
          item.unit_price || item.precioUnitario || 0,
          item.subtotal || 0,
          item.material_description || item.descripcionMateriales || null,
          item.labor_description || item.manoObra || null,
          item.equipment_service || item.equiposServicio || null,
          item.contractor_deliverables || item.entregablesContratista || null,
          userId,
          item.id
        ]);

        updatedItems.push(itemResult.rows[0]);
      } else {
        // Item nuevo - crear
        const itemQuery = `
          INSERT INTO quotation_items (
            quotation_id, item_type, description, code, quantity, unit, unit_price, subtotal,
            material_description, labor_description, equipment_service, contractor_deliverables,
            status, user_id_registration, date_time_registration
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, CURRENT_TIMESTAMP)
          RETURNING *
        `;

        const itemResult = await client.query(itemQuery, [
          id,
          item.item_type || item.tipo || null,
          item.description || item.descripcion || null,
          item.code || item.codigo || null,
          item.quantity || item.cantidad || 0,
          item.unit || item.unidad || null,
          item.unit_price || item.precioUnitario || 0,
          item.subtotal || 0,
          item.material_description || item.descripcionMateriales || null,
          item.labor_description || item.manoObra || null,
          item.equipment_service || item.equiposServicio || null,
          item.contractor_deliverables || item.entregablesContratista || null,
          userId
        ]);

        updatedItems.push(itemResult.rows[0]);
      }
    }

    // 3. Marcar como inactivos los items que ya no están en la lista
    const itemIds = items.filter(i => i.id).map(i => i.id);
    if (itemIds.length > 0) {
      await client.query(`
        UPDATE quotation_items
        SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
        WHERE quotation_id = $2 AND id NOT IN (${itemIds.map((_, i) => `$${i + 3}`).join(',')}) AND status = 'active'
      `, [userId, id, ...itemIds]);
    } else {
      // Si no hay items con ID, marcar todos como inactivos (todos son nuevos)
      await client.query(`
        UPDATE quotation_items
        SET status = 'inactive', user_id_modification = $1, date_time_modification = CURRENT_TIMESTAMP
        WHERE quotation_id = $2 AND status = 'active'
      `, [userId, id]);
    }

    // 4. Confirmar la transacción
    await client.query('COMMIT');

    // 5. Retornar la cotización con sus items actualizados
    return {
      ...updatedQuotation,
      items: updatedItems
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en updateQuotationWithItems:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  generateQuotationNumber,
  createQuotationWithItems,
  updateQuotationWithItems
};
