const { responderErrorServidor } = require('../utils/httpErrors');
const { getAllFinalReports, getFinalReportById, createFinalReport, updateFinalReport, deleteFinalReport } = require('../models/finalReportsModel');
const { updateWorkOrder } = require('../models/workOrdersModel');

const getAll = async (req, res) => {
  try {
    const { status = 'all', order_id } = req.query;
    const reports = await getAllFinalReports({ status, order_id });
    res.json(reports);
  } catch (error) {
    console.error('Error al obtener reportes finales:', error);
    responderErrorServidor(res, error, 'Error al obtener reportes finales');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await getFinalReportById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Reporte final no encontrado',
        message: `El informe final con ID ${id} no existe o fue eliminado por otro usuario. Recarga la orden de trabajo para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(report);
  } catch (error) {
    console.error('Error al obtener reporte final:', error);
    responderErrorServidor(res, error, 'Error al obtener reporte final');
  }
};

const create = async (req, res) => {
  try {
    const { order_id, generation_date, summary, signatures, blocked, status } = req.body;
    if (!order_id) {
      return res.status(400).json({
        error: 'Falta la orden de trabajo',
        message: 'El informe final no llegó vinculado a ninguna orden de trabajo. No es un problema de lo que ingresaste, sino de la aplicación: recarga la orden de trabajo y genera el informe desde allí. Si persiste, avisa al administrador del sistema.',
        tipo: 'validacion'
      });
    }
    const reportData = { order_id, generation_date: generation_date || null, summary: summary || null, signatures: signatures || null, blocked: blocked || false, status: status || 'pending_technician_signature', user_id_registration: req.user.id };
    const newReport = await createFinalReport(reportData);

    // Actualizar el estado de la orden a "completed" cuando se genera el informe final
    try {
      await updateWorkOrder(order_id, {
        status: 'completed',
        user_id_modification: req.user.id
      });
      console.log(`Orden ${order_id} marcada como completada al generar informe final`);
    } catch (orderError) {
      console.error('Error al actualizar estado de la orden:', orderError);
      // No fallar la creación del informe si falla la actualización de la orden
    }

    res.status(201).json({ mensaje: 'Reporte final creado exitosamente', data: newReport });
  } catch (error) {
    console.error('Error al crear reporte final:', error);
    responderErrorServidor(res, error, 'Error al crear reporte final');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingReport = await getFinalReportById(id);
    if (!existingReport) {
      return res.status(404).json({
        error: 'Reporte final no encontrado',
        message: `El informe final con ID ${id} no existe o fue eliminado por otro usuario. Recarga la orden de trabajo para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const reportData = { ...req.body, user_id_modification: req.user.id };
    const updatedReport = await updateFinalReport(id, reportData);
    res.json({ mensaje: 'Reporte final actualizado exitosamente', data: updatedReport });
  } catch (error) {
    console.error('Error al actualizar reporte final:', error);
    responderErrorServidor(res, error, 'Error al actualizar reporte final');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingReport = await getFinalReportById(id);
    if (!existingReport) {
      return res.status(404).json({
        error: 'Reporte final no encontrado',
        message: `El informe final con ID ${id} no existe o fue eliminado por otro usuario. Recarga la orden de trabajo para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedReport = await deleteFinalReport(id, req.user.id);
    res.json({ mensaje: 'Reporte final cancelado exitosamente', data: deletedReport });
  } catch (error) {
    console.error('Error al cancelar reporte final:', error);
    responderErrorServidor(res, error, 'Error al cancelar reporte final');
  }
};

module.exports = { getAll, getById, create, update, remove };
