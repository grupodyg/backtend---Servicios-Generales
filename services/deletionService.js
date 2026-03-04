const pool = require('../config/db');
const { getCurrentTimestamp } = require('../utils/dateUtils');

/**
 * Servicio para manejar eliminaciones logicas con validacion de dependencias
 */

/**
 * Verifica las dependencias de una orden de trabajo antes de eliminarla
 * @param {string} workOrderId - ID de la orden de trabajo
 * @returns {Object} - { canDelete: boolean, dependencies: Object, message: string }
 */
async function checkWorkOrderDependencies(workOrderId) {
  try {
    const dependencies = {
      daily_reports: 0,
      material_requests: 0,
      tool_requests: 0,
      order_photos: 0,
      final_reports: 0
    };

    // Contar reportes diarios
    const reportsResult = await pool.query(
      'SELECT COUNT(*) as count FROM daily_reports WHERE order_id = $1',
      [workOrderId]
    );
    dependencies.daily_reports = parseInt(reportsResult.rows[0].count);

    // Contar solicitudes de materiales
    const materialsResult = await pool.query(
      'SELECT COUNT(*) as count FROM material_requests WHERE order_id = $1',
      [workOrderId]
    );
    dependencies.material_requests = parseInt(materialsResult.rows[0].count);

    // Contar solicitudes de herramientas
    const toolsResult = await pool.query(
      'SELECT COUNT(*) as count FROM tool_requests WHERE order_id = $1',
      [workOrderId]
    );
    dependencies.tool_requests = parseInt(toolsResult.rows[0].count);

    // Contar fotos
    const photosResult = await pool.query(
      'SELECT COUNT(*) as count FROM order_photos WHERE order_id = $1',
      [workOrderId]
    );
    dependencies.order_photos = parseInt(photosResult.rows[0].count);

    // Contar informes finales
    const finalReportsResult = await pool.query(
      'SELECT COUNT(*) as count FROM final_reports WHERE order_id = $1',
      [workOrderId]
    );
    dependencies.final_reports = parseInt(finalReportsResult.rows[0].count);

    // Calcular total de dependencias
    const totalDependencies = Object.values(dependencies).reduce((sum, val) => sum + val, 0);

    // Generar mensaje descriptivo
    let message = '';
    if (totalDependencies > 0) {
      const parts = [];
      if (dependencies.daily_reports > 0) parts.push(`${dependencies.daily_reports} reporte(s) diario(s)`);
      if (dependencies.material_requests > 0) parts.push(`${dependencies.material_requests} solicitud(es) de materiales`);
      if (dependencies.tool_requests > 0) parts.push(`${dependencies.tool_requests} solicitud(es) de herramientas`);
      if (dependencies.order_photos > 0) parts.push(`${dependencies.order_photos} foto(s)`);
      if (dependencies.final_reports > 0) parts.push(`${dependencies.final_reports} informe(s) final(es)`);

      message = `Esta orden tiene registros asociados: ${parts.join(', ')}. Al eliminarla, estos registros quedarán sin orden asociada.`;
    } else {
      message = 'Esta orden no tiene registros asociados. Puede eliminarse sin problemas.';
    }

    return {
      canDelete: true, // Siempre permitimos eliminación lógica, solo informamos
      hasDependencies: totalDependencies > 0,
      dependencies,
      totalDependencies,
      message
    };
  } catch (error) {
    console.error('Error al verificar dependencias de orden:', error);
    throw error;
  }
}

/**
 * Verifica las dependencias de una visita técnica antes de eliminarla
 * @param {string} visitId - ID de la visita técnica
 * @returns {Object} - { canDelete: boolean, dependencies: Object, message: string }
 */
async function checkTechnicalVisitDependencies(visitId) {
  try {
    const dependencies = {
      quotations: 0,
      work_orders: 0,
      technicians: 0
    };

    // Contar cotizaciones
    const quotationsResult = await pool.query(
      'SELECT COUNT(*) as count FROM quotations WHERE technical_visit_id = $1',
      [visitId]
    );
    dependencies.quotations = parseInt(quotationsResult.rows[0].count);

    // Contar órdenes de trabajo
    const ordersResult = await pool.query(
      'SELECT COUNT(*) as count FROM work_orders WHERE technical_visit_id = $1',
      [visitId]
    );
    dependencies.work_orders = parseInt(ordersResult.rows[0].count);

    // Contar técnicos asignados
    const techniciansResult = await pool.query(
      'SELECT COUNT(*) as count FROM technical_visit_technicians WHERE visit_id = $1',
      [visitId]
    );
    dependencies.technicians = parseInt(techniciansResult.rows[0].count);

    // Calcular total de dependencias
    const totalDependencies = Object.values(dependencies).reduce((sum, val) => sum + val, 0);

    // Generar mensaje descriptivo
    let message = '';
    if (totalDependencies > 0) {
      const parts = [];
      if (dependencies.quotations > 0) parts.push(`${dependencies.quotations} cotización(es)`);
      if (dependencies.work_orders > 0) parts.push(`${dependencies.work_orders} orden(es) de trabajo`);
      if (dependencies.technicians > 0) parts.push(`${dependencies.technicians} técnico(s) asignado(s)`);

      message = `Esta visita técnica tiene registros asociados: ${parts.join(', ')}. Al eliminarla, estos registros quedarán sin visita asociada.`;
    } else {
      message = 'Esta visita técnica no tiene registros asociados. Puede eliminarse sin problemas.';
    }

    return {
      canDelete: true, // Siempre permitimos eliminación lógica, solo informamos
      hasDependencies: totalDependencies > 0,
      dependencies,
      totalDependencies,
      message
    };
  } catch (error) {
    console.error('Error al verificar dependencias de visita técnica:', error);
    throw error;
  }
}

/**
 * Registra una eliminación en el log del sistema
 * @param {Object} deletionData - Datos de la eliminación
 */
async function logDeletion(deletionData) {
  try {
    const {
      entity_type,
      entity_id,
      deleted_by_user_id,
      deletion_reason,
      dependencies_info
    } = deletionData;

    // Por ahora solo registramos en console, mas adelante se puede crear tabla de auditoria
    console.log('[DELETION LOG]', {
      timestamp: getCurrentTimestamp(),
      entity_type,
      entity_id,
      deleted_by: deleted_by_user_id,
      reason: deletion_reason,
      dependencies: dependencies_info
    });

    // TODO: Insertar en tabla deletion_audit cuando esté disponible
    /*
    const query = `
      INSERT INTO deletion_audit (
        entity_type, entity_id, deleted_by_user_id,
        deletion_reason, dependencies_info, deletion_date
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    await pool.query(query, [
      entity_type,
      entity_id,
      deleted_by_user_id,
      deletion_reason,
      JSON.stringify(dependencies_info)
    ]);
    */
  } catch (error) {
    console.error('Error al registrar eliminación:', error);
    // No lanzamos error para no bloquear la eliminación
  }
}

module.exports = {
  checkWorkOrderDependencies,
  checkTechnicalVisitDependencies,
  logDeletion
};
