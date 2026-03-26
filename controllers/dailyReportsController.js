const {
  getAllDailyReports,
  getDailyReportById,
  createDailyReport,
  updateDailyReport,
  deleteDailyReport,
  getStatisticsByTechnician,
  getReportStatistics,
  getDailyProductivity,
  getKPIs
} = require('../models/dailyReportsModel');
const { addWorkOrderHistoryEntry, updateWorkOrderProgress } = require('../models/workOrdersModel');
const pool = require('../config/db');
const { getCurrentTimestamp, getCurrentDate } = require('../utils/dateUtils');
const { uploadFile } = require('../services/wasabiService');
const path = require('path');

const getAll = async (req, res) => {
  try {
    const { status = 'active', order_id, installation_id, technician, report_date_from, report_date_to } = req.query;
    const reports = await getAllDailyReports({ status, order_id, installation_id, technician, report_date_from, report_date_to });
    res.json(reports);
  } catch (error) {
    console.error('Error al obtener reportes diarios:', error);
    res.status(500).json({ error: 'Error al obtener reportes diarios' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await getDailyReportById(id);
    if (!report) return res.status(404).json({ error: 'Reporte diario no encontrado' });
    res.json(report);
  } catch (error) {
    console.error('Error al obtener reporte diario:', error);
    res.status(500).json({ error: 'Error al obtener reporte diario' });
  }
};

const create = async (req, res) => {
  try {
    console.log('📝 [dailyReportsController.create] Iniciando creación de reporte...');
    console.log('📝 [dailyReportsController.create] Body recibido:', JSON.stringify(req.body, null, 2));

    const {
      order_id, installation_id, report_type, technician, report_date, start_time, end_time,
      work_description, progress_percentage, work_at_height, ats_document, ptr_document,
      environmental_aspects_document, observations, next_tasks, creation_time, materials
    } = req.body;

    if (!order_id && !installation_id) {
      console.log('❌ [dailyReportsController.create] Error: Se requiere order_id o installation_id');
      return res.status(400).json({ error: 'Se requiere order_id o installation_id' });
    }

    // ========================================
    // OPCIÓN H: Validar que la fecha no sea futura
    // ========================================
    if (report_date) {
      const fechaReporte = new Date(report_date);
      const hoy = getCurrentDate();
      hoy.setHours(23, 59, 59, 999); // Fin del día actual (hora Lima)
      if (fechaReporte > hoy) {
        return res.status(400).json({ error: 'No se pueden crear reportes con fecha futura' });
      }
    }

    // ========================================
    // VALIDAR QUE HORA FIN > HORA INICIO
    // ========================================
    if (start_time && end_time) {
      // Convertir a minutos para comparar (formato HH:MM)
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      const startMinutes = parseTime(start_time);
      const endMinutes = parseTime(end_time);

      if (endMinutes <= startMinutes) {
        return res.status(400).json({ error: 'La hora de fin debe ser posterior a la hora de inicio' });
      }
    }

    // ========================================
    // OPCIÓN F: Verificar técnico asignado (solo log informativo, no bloquea)
    // Se permite que cualquier técnico cree reportes para flexibilidad operativa
    // ========================================
    if (order_id && technician) {
      try {
        const orderResult = await pool.query(
          'SELECT assigned_technician FROM work_orders WHERE id = $1',
          [order_id]
        );
        if (orderResult.rows.length > 0) {
          const assignedTech = orderResult.rows[0].assigned_technician;
          const normalizar = (str) => str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
          if (assignedTech && normalizar(assignedTech) !== normalizar(technician)) {
            console.log(`⚠️ [dailyReportsController.create] AVISO: Técnico diferente al asignado. Creando: "${technician}", Asignado: "${assignedTech}"`);
          } else {
            console.log(`✅ [dailyReportsController.create] Técnico coincide con el asignado`);
          }
        }
      } catch (checkError) {
        console.log(`⚠️ [dailyReportsController.create] No se pudo verificar técnico asignado:`, checkError.message);
      }
    }

    const reportData = {
      order_id: order_id || null, installation_id: installation_id || null,
      report_type: report_type || null, technician: technician || null,
      report_date: report_date || null, start_time: start_time || null, end_time: end_time || null,
      work_description: work_description || null, progress_percentage: progress_percentage || 0,
      work_at_height: work_at_height || false, ats_document: ats_document || null,
      ptr_document: ptr_document || null, environmental_aspects_document: environmental_aspects_document || null,
      observations: observations || null, next_tasks: next_tasks || null,
      creation_time: creation_time || null, user_id_registration: req.user.id
    };

    const newReport = await createDailyReport(reportData);

    // ========================================
    // OPCIÓN A: Guardar materiales en BD (con validación de stock)
    // ========================================
    if (materials && Array.isArray(materials) && materials.length > 0) {
      const advertenciasStock = [];

      for (const material of materials) {
        const nombreMaterial = material.nombre || material.name;
        const cantidadSolicitada = material.cantidad || material.quantity || 1;
        const unidadMaterial = material.unidad || material.unit || 'unidad';

        // Validar stock disponible si el material existe en inventario
        try {
          const stockResult = await pool.query(
            `SELECT id, name, current_stock, unit FROM materials WHERE LOWER(name) = LOWER($1) AND status = 'available' LIMIT 1`,
            [nombreMaterial]
          );

          if (stockResult.rows.length > 0) {
            const materialInventario = stockResult.rows[0];
            const stockDisponible = parseFloat(materialInventario.current_stock) || 0;

            if (cantidadSolicitada > stockDisponible) {
              advertenciasStock.push({
                material: nombreMaterial,
                solicitado: cantidadSolicitada,
                disponible: stockDisponible
              });
              console.log(`⚠️ [dailyReportsController.create] Advertencia: Material "${nombreMaterial}" - Solicitado: ${cantidadSolicitada}, Disponible: ${stockDisponible}`);
            }
          }
        } catch (stockError) {
          console.log(`⚠️ [dailyReportsController.create] No se pudo verificar stock de "${nombreMaterial}":`, stockError.message);
        }

        // Guardar el material en el reporte
        await pool.query(
          `INSERT INTO report_materials (report_id, name, quantity, unit, status, user_id_registration, date_time_registration)
           VALUES ($1, $2, $3, $4, 'active', $5, CURRENT_TIMESTAMP)`,
          [newReport.id, nombreMaterial, cantidadSolicitada, unidadMaterial, req.user.id]
        );

        // ========================================
        // DESCONTAR STOCK DEL INVENTARIO
        // ========================================
        try {
          const materialResult = await pool.query(
            `SELECT id, current_stock FROM materials WHERE LOWER(name) = LOWER($1) AND status = 'available' LIMIT 1`,
            [nombreMaterial]
          );

          if (materialResult.rows.length > 0) {
            const materialId = materialResult.rows[0].id;
            const stockActual = parseFloat(materialResult.rows[0].current_stock) || 0;
            const nuevoStock = Math.max(0, stockActual - cantidadSolicitada); // No permitir stock negativo

            await pool.query(
              `UPDATE materials
               SET current_stock = $1,
                   user_id_modification = $2,
                   date_time_modification = CURRENT_TIMESTAMP
               WHERE id = $3`,
              [nuevoStock, req.user.id, materialId]
            );
            console.log(`📦 Stock actualizado: "${nombreMaterial}" de ${stockActual} a ${nuevoStock}`);
          }
        } catch (stockUpdateError) {
          console.log(`⚠️ No se pudo actualizar stock de "${nombreMaterial}":`, stockUpdateError.message);
          // No lanzar error para no bloquear la creación del reporte
        }
      }

      console.log(`✅ ${materials.length} materiales guardados y stock actualizado para el reporte ${newReport.id}`);

      // Log de advertencias de stock para auditoría
      if (advertenciasStock.length > 0) {
        console.log(`⚠️ [dailyReportsController.create] ${advertenciasStock.length} material(es) exceden el stock disponible:`, advertenciasStock);
      }
    }

    // Registrar en historial de la orden si está asociado a una orden
    if (order_id) {
      await addWorkOrderHistoryEntry({
        work_order_id: order_id,
        user_id: req.user.id,
        action_type: 'report_created',
        action_description: `Reporte ${newReport.id} creado por ${technician || 'técnico'} - Progreso: ${progress_percentage}%`,
        field_changed: 'daily_report',
        new_value: JSON.stringify({
          report_id: newReport.id,
          technician,
          report_date,
          progress_percentage,
          work_description: work_description?.substring(0, 100)
        }),
        ip_address: req.ip
      });
      // OPCIÓN D: Eliminada la llamada duplicada a updateWorkOrderProgress
      // (ya se actualiza en dailyReportsModel.js:122-131)
    }

    res.status(201).json({ mensaje: 'Reporte diario creado exitosamente', data: newReport });
  } catch (error) {
    console.error('Error al crear reporte diario:', error);
    res.status(500).json({ error: 'Error al crear reporte diario' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingReport = await getDailyReportById(id);
    if (!existingReport) return res.status(404).json({ error: 'Reporte diario no encontrado' });

    const reportData = { ...req.body, user_id_modification: req.user.id };
    const updatedReport = await updateDailyReport(id, reportData);

    // Actualizar el progreso de la orden si el reporte está asociado a una orden
    if (updatedReport.order_id) {
      await updateWorkOrderProgress(updatedReport.order_id);
      console.log(`✅ Progreso de orden ${updatedReport.order_id} actualizado después de modificar reporte`);
    }

    res.json({ mensaje: 'Reporte diario actualizado exitosamente', data: updatedReport });
  } catch (error) {
    console.error('Error al actualizar reporte diario:', error);
    res.status(500).json({ error: 'Error al actualizar reporte diario' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingReport = await getDailyReportById(id);
    if (!existingReport) return res.status(404).json({ error: 'Reporte diario no encontrado' });
    const deletedReport = await deleteDailyReport(id, req.user.id);
    res.json({ mensaje: 'Reporte diario eliminado exitosamente', data: deletedReport });
  } catch (error) {
    console.error('Error al eliminar reporte diario:', error);
    res.status(500).json({ error: 'Error al eliminar reporte diario' });
  }
};

// ========================================
// SUBIR DOCUMENTO A UN REPORTE
// ========================================
const DOCUMENT_FIELD_MAP = {
  ats: 'ats_document',
  ptr: 'ptr_document',
  environmental_aspects: 'environmental_aspects_document'
};

const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { docType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se subió archivo' });
    }

    const fieldName = DOCUMENT_FIELD_MAP[docType];
    if (!fieldName) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Subir archivo a S3
    const ext = path.extname(req.file.originalname);
    const key = `report-documents/${docType}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const docUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);

    const documentData = {
      url: docUrl,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedAt: getCurrentTimestamp()
    };

    // Leer documentos existentes y APPEND al array
    // fieldName proviene de DOCUMENT_FIELD_MAP (constante interna, no input de usuario)
    const currentResult = await pool.query(
      `SELECT ${fieldName} FROM daily_reports WHERE id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    let currentValue = currentResult.rows[0][fieldName];
    let docsArray = [];

    if (currentValue) {
      // Si viene como string (posible según configuración del driver), parsear primero
      if (typeof currentValue === 'string') {
        try {
          currentValue = JSON.parse(currentValue);
        } catch (e) {
          currentValue = null;
        }
      }

      if (Array.isArray(currentValue)) {
        docsArray = currentValue;
      } else if (currentValue && typeof currentValue === 'object') {
        // Compatibilidad legacy: objeto singular → convertir a array
        docsArray = [currentValue];
      }
    }

    docsArray.push(documentData);

    const query = `
      UPDATE daily_reports
      SET ${fieldName} = $1,
          user_id_modification = $2,
          date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [
      JSON.stringify(docsArray),
      req.user.id,
      id
    ]);

    res.json({
      mensaje: 'Documento subido exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ error: 'Error al subir documento' });
  }
};

// ========================================
// OBTENER ESTADÍSTICAS DE REPORTES
// ========================================
const getStatistics = async (req, res) => {
  try {
    const { days = 7, client_id } = req.query;
    const periodDays = parseInt(days) || 7;
    const clientId = client_id ? parseInt(client_id) : null;

    // Verificar si el usuario es admin (role_id = 1)
    const isAdmin = req.user?.role_id === 1;

    const [technicianStats, generalStats, dailyProductivity, kpis] = await Promise.all([
      getStatisticsByTechnician(clientId),
      getReportStatistics(clientId),
      getDailyProductivity(periodDays, clientId),
      getKPIs(clientId)
    ]);

    // Filtrar datos financieros sensibles si no es admin
    const filteredKpis = isAdmin ? kpis : {
      total_orders: kpis.total_orders,
      completed_orders: kpis.completed_orders,
      completion_rate: kpis.completion_rate,
      avg_days_per_order: kpis.avg_days_per_order
      // avg_cost_per_order se omite para usuarios no admin
    };

    res.json({
      technicians: technicianStats,
      general: generalStats,
      dailyProductivity: dailyProductivity,
      kpis: filteredKpis,
      periodDays: periodDays // Devolver el periodo usado para referencia
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de reportes' });
  }
};

module.exports = { getAll, getById, create, update, remove, uploadDocument, getStatistics };
