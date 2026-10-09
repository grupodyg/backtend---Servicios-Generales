const { responderErrorServidor } = require('../utils/httpErrors');
const {
  getAllWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  generateWorkOrderId,
  getWorkOrderHistory,
  addWorkOrderHistoryEntry
} = require('../models/workOrdersModel');
const { getUserById } = require('../models/usersModel');
const { getAllFinalReports, updateFinalReport } = require('../models/finalReportsModel');
const { checkWorkOrderDependencies, logDeletion } = require('../services/deletionService');
const { filterSensitiveFields } = require('../utils/filterSensitiveFields');
const {
  isValidSignatureConfig,
  normalizeSignatureConfig,
  computeSignatureStatus,
  COMPLETED_STATUS
} = require('../utils/signatureFlow');

const ADMIN_ROLE_ID = 1;

// Nombres legibles de los campos de la orden (para explicar qué se intentó modificar)
const ETIQUETAS_CAMPOS_ORDEN = {
  client: 'cliente', client_id: 'cliente', service_type: 'tipo de servicio', visit_type: 'tipo de visita',
  description: 'descripción', location: 'ubicación', priority: 'prioridad', due_date: 'fecha de vencimiento',
  estimated_cost: 'costo estimado', assigned_technician: 'técnico asignado', requested_by: 'solicitante',
  progress_percentage: 'porcentaje de avance', approval_status: 'estado de aprobación',
  estimation_date: 'fecha de estimación', approval_date: 'fecha de aprobación', approved_by: 'aprobado por',
  rejection_date: 'fecha de rechazo', rejected_by: 'rechazado por', rejection_reason: 'motivo de rechazo',
  estimated_materials: 'materiales estimados', estimated_time: 'tiempo estimado', required_tools: 'herramientas requeridas',
  gps_coordinates: 'coordenadas GPS', project_name: 'nombre del proyecto', personnel_list: 'lista de personal',
  purchase_order_number: 'número de orden de compra', purchase_order_document: 'documento de orden de compra',
  first_visit_completed: 'primera visita completada', first_visit_date: 'fecha de primera visita',
  reassignment_date: 'fecha de reasignación', reassigned_by: 'reasignado por', resources: 'recursos',
  selected_materials: 'materiales seleccionados', selected_tools: 'herramientas seleccionadas', solpe: 'SOLPE',
  resources_update_date: 'fecha de actualización de recursos', observations: 'observaciones',
  is_emergency: 'emergencia', technical_visit_id: 'visita técnica', based_on_technical_visit: 'basada en visita técnica'
};

const describirCampos = (campos, maximo = 5) => {
  const etiquetas = [...new Set(campos.map(c => ETIQUETAS_CAMPOS_ORDEN[c] || c.replace(/_/g, ' ')))];
  if (etiquetas.length <= maximo) return etiquetas.join(', ');
  return `${etiquetas.slice(0, maximo).join(', ')} y ${etiquetas.length - maximo} más`;
};

/**
 * Solo el administrador define qué firmas del informe final son obligatorias.
 * Para cualquier otro rol el campo se ignora (el COALESCE del modelo conserva el valor actual).
 * Devuelve { config } con la configuración normalizada, { config: undefined } si no aplica,
 * o { error } si el administrador envió un formato inválido.
 */
const resolveSignatureConfig = (req, rawConfig) => {
  if (rawConfig === undefined || rawConfig === null || req.user.role_id !== ADMIN_ROLE_ID) {
    return { config: undefined };
  }
  if (!isValidSignatureConfig(rawConfig)) {
    return {
      error: 'Configuración de firmas no válida',
      message: 'La configuración de firmas obligatorias recibida no es válida: debe indicar, para la firma del técnico, del supervisor y del administrador, si es obligatoria u opcional. Recarga la página y vuelve a configurar las firmas en la sección «Firmas del Informe Final».'
    };
  }
  return { config: normalizeSignatureConfig(rawConfig) };
};

/**
 * Si el administrador cambia las firmas obligatorias con un informe final ya generado y
 * todavía pendiente, se recalcula el estado del informe para que el flujo continúe con la
 * firma correcta (o quede completado si ya no falta ninguna obligatoria).
 * Los informes completados o cancelados no se tocan.
 */
const syncPendingFinalReports = async (orderId, signatureConfig, userId) => {
  const reports = await getAllFinalReports({ order_id: orderId });
  const pendingReports = reports.filter(r => r.status !== COMPLETED_STATUS && r.status !== 'cancelled');

  for (const report of pendingReports) {
    const { status, blocked } = computeSignatureStatus(signatureConfig, report.signatures);
    if (status !== report.status || blocked !== Boolean(report.blocked)) {
      await updateFinalReport(report.id, { status, blocked, user_id_modification: userId });
    }
  }
};

const getAll = async (req, res) => {
  try {
    const { status = 'all', approval_status, assigned_technician, client_id, priority, search } = req.query;
    const userId = req.user.id;
    const userRoleId = req.user.role_id;

    // Si es técnico (role_id = 4), filtrar automáticamente por su nombre
    let finalAssignedTechnician = assigned_technician;

    if (userRoleId === 4) {
      // Consultar nombre del técnico desde la tabla users
      const technician = await getUserById(userId);

      if (!technician) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: 'No se encontró tu usuario en el sistema, así que no se pueden mostrar tus órdenes asignadas (es posible que lo hayan desactivado o eliminado después de que iniciaste sesión). Cierra sesión y vuelve a ingresar; si el problema continúa, avisa al administrador del sistema.',
          tipo: 'no_encontrado'
        });
      }

      // Forzar filtrado por el nombre del técnico logueado
      finalAssignedTechnician = technician.name;
    }

    const workOrders = await getAllWorkOrders({
      status,
      approval_status,
      assigned_technician: finalAssignedTechnician,
      client_id,
      priority,
      search
    });

    const filteredWorkOrders = filterSensitiveFields(workOrders, req.user, 'work_order');
    res.json(filteredWorkOrders);
  } catch (error) {
    console.error('Error al obtener órdenes de trabajo:', error);
    responderErrorServidor(res, error, 'Error al obtener órdenes de trabajo');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const workOrder = await getWorkOrderById(id);
    if (!workOrder) {
      return res.status(404).json({
        error: 'Orden de trabajo no encontrada',
        message: `La orden de trabajo ${id} no existe o fue eliminada por otro usuario. Recarga la pantalla Órdenes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const filteredWorkOrder = filterSensitiveFields(workOrder, req.user, 'work_order');
    res.json(filteredWorkOrder);
  } catch (error) {
    console.error('Error al obtener orden de trabajo:', error);
    responderErrorServidor(res, error, 'Error al obtener orden de trabajo');
  }
};

const create = async (req, res) => {
  try {
    console.log('🔍 [workOrdersController.create] Datos recibidos:', JSON.stringify(req.body, null, 2));

    const {
      client, client_id, service_type, visit_type, technical_visit_id,
      based_on_technical_visit, description, location, priority, due_date,
      estimated_cost, assigned_technician, requested_by, progress_percentage,
      approval_status, estimated_materials, estimated_time, required_tools,
      gps_coordinates, project_name, personnel_list, purchase_order_number,
      purchase_order_document, solpe, resources, selected_materials, selected_tools,
      is_emergency, signature_config, observations
    } = req.body;

    // Validaciones básicas
    if (!service_type) {
      return res.status(400).json({
        error: 'El tipo de servicio es requerido',
        message: 'No se seleccionó el tipo de servicio de la orden. Elige una opción en el campo «Tipo de servicio» del formulario y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    const signatureConfigResult = resolveSignatureConfig(req, signature_config);
    if (signatureConfigResult.error) {
      return res.status(400).json({ error: signatureConfigResult.error, message: signatureConfigResult.message, tipo: 'validacion' });
    }

    // Generar ID automático
    const id = await generateWorkOrderId();

    // Si hay technical_visit_id, el visit_type debe ser 'con_visita'
    const resolvedVisitType = technical_visit_id ? 'con_visita' : (visit_type || 'sin_visita');

    const orderData = {
      id, client, client_id: client_id || null, service_type, visit_type: resolvedVisitType,
      technical_visit_id: technical_visit_id || null, based_on_technical_visit: technical_visit_id ? true : (based_on_technical_visit || false),
      description: description || null, location: location || null, priority: priority || 'media',
      due_date: due_date || null, estimated_cost: estimated_cost || null,
      assigned_technician: assigned_technician || null, requested_by: requested_by || null,
      progress_percentage: progress_percentage || 0, approval_status: approval_status || 'unassigned',
      estimated_materials: estimated_materials || null, estimated_time: estimated_time || null,
      required_tools: required_tools || null, gps_coordinates: gps_coordinates || null,
      project_name: project_name || null, personnel_list: personnel_list || null,
      purchase_order_number: purchase_order_number || null, purchase_order_document: purchase_order_document || null,
      solpe: solpe || null, resources: resources || null, selected_materials: selected_materials || null,
      selected_tools: selected_tools || null, user_id_registration: req.user.id,
      is_emergency: is_emergency || false,
      signature_config: signatureConfigResult.config || null,
      observations: observations || null
    };

    const newWorkOrder = await createWorkOrder(orderData);

    // Registrar creación de la orden en el historial (si la tabla existe)
    try {
      await addWorkOrderHistoryEntry({
        work_order_id: newWorkOrder.id,
        user_id: req.user.id,
        action_type: 'created',
        action_description: `Orden de trabajo creada - Cliente: ${client || 'Sin cliente'}, Servicio: ${service_type}`,
        field_changed: null,
        old_value: null,
        new_value: JSON.stringify({
          service_type,
          priority,
          assigned_technician,
          visit_type
        }),
        ip_address: req.ip
      });
    } catch (historyError) {
      // Si falla el historial, solo logueamos pero no bloqueamos la creación
      console.warn('⚠️ No se pudo registrar en historial (tabla puede no existir):', historyError.message);
    }

    const filteredWorkOrder = filterSensitiveFields(newWorkOrder, req.user, 'work_order');
    res.status(201).json({ mensaje: 'Orden de trabajo creada exitosamente', data: filteredWorkOrder });
  } catch (error) {
    console.error('❌ [workOrdersController.create] Error completo:', error);
    console.error('❌ Stack trace:', error.stack);
    responderErrorServidor(res, error, 'Error al crear orden de trabajo');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client, client_id, service_type, visit_type, description, location,
      priority, due_date, estimated_cost, assigned_technician, requested_by,
      progress_percentage, approval_status, estimation_date, approval_date,
      approved_by, rejection_date, rejected_by, rejection_reason,
      estimated_materials, estimated_time, required_tools, gps_coordinates,
      project_name, personnel_list, purchase_order_number, purchase_order_document,
      first_visit_completed, first_visit_date, reassignment_date, reassigned_by,
      resources, selected_materials, selected_tools, solpe, resources_update_date, status,
      signature_config, observations
    } = req.body;

    const existingWorkOrder = await getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({
        error: 'Orden de trabajo no encontrada',
        message: `La orden de trabajo ${id} no existe o fue eliminada por otro usuario, así que no se pueden guardar los cambios. Recarga la pantalla Órdenes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    const signatureConfigResult = resolveSignatureConfig(req, signature_config);
    if (signatureConfigResult.error) {
      return res.status(400).json({ error: signatureConfigResult.error, message: signatureConfigResult.message, tipo: 'validacion' });
    }

    // PROTECCIÓN: Bloquear modificaciones a órdenes completadas
    // Solo permitir cambios si es una actualización de firmas del informe final
    const isCompleted = existingWorkOrder.status === 'completed';
    if (isCompleted) {
      // Lista de campos permitidos para órdenes completadas (solo lectura/firmas)
      // - status: por si es necesario reabrir
      // - signature_config: el administrador puede ajustar las firmas obligatorias mientras el informe siga pendiente
      const allowedFieldsForCompleted = ['status', 'signature_config'];
      const requestedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined && req.body[key] !== null);
      const hasDisallowedFields = requestedFields.some(field => !allowedFieldsForCompleted.includes(field));

      if (hasDisallowedFields) {
        const blockedFields = requestedFields.filter(field => !allowedFieldsForCompleted.includes(field));
        return res.status(409).json({
          error: 'Orden completada',
          message: `La orden ${id} está completada: el trabajo ya fue cerrado y sus datos no se pueden modificar (se intentó cambiar: ${describirCampos(blockedFields)}). En una orden completada solo el administrador puede ajustar qué firmas del informe final son obligatorias, desde la sección «Firmas del Informe Final» o desde el informe final de la orden.`,
          tipo: 'conflicto',
          blockedFields
        });
      }
    }

    const orderData = {
      client, client_id, service_type, visit_type, description, location,
      priority, due_date, estimated_cost, assigned_technician, requested_by,
      progress_percentage, approval_status, estimation_date, approval_date,
      approved_by, rejection_date, rejected_by, rejection_reason,
      estimated_materials, estimated_time, required_tools, gps_coordinates,
      project_name, personnel_list, purchase_order_number, purchase_order_document,
      first_visit_completed, first_visit_date, reassignment_date, reassigned_by,
      resources, selected_materials, selected_tools, solpe, resources_update_date,
      status, user_id_modification: req.user.id,
      signature_config: signatureConfigResult.config,
      observations
    };

    const updatedWorkOrder = await updateWorkOrder(id, orderData);

    if (signatureConfigResult.config) {
      await syncPendingFinalReports(id, signatureConfigResult.config, req.user.id);
    }

    const filteredWorkOrder = filterSensitiveFields(updatedWorkOrder, req.user, 'work_order');
    res.json({ mensaje: 'Orden de trabajo actualizada exitosamente', data: filteredWorkOrder });
  } catch (error) {
    console.error('Error al actualizar orden de trabajo:', error);
    responderErrorServidor(res, error, 'Error al actualizar orden de trabajo');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || 'Sin motivo especificado';

    const existingWorkOrder = await getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({
        error: 'Orden de trabajo no encontrada',
        message: `La orden de trabajo ${id} no existe o ya fue eliminada por otro usuario. Recarga la pantalla Órdenes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    // Verificar dependencias antes de eliminar
    const dependencyCheck = await checkWorkOrderDependencies(id);

    // Registrar la eliminación en el log
    await logDeletion({
      entity_type: 'work_order',
      entity_id: id,
      deleted_by_user_id: req.user.id,
      deletion_reason: reason,
      dependencies_info: dependencyCheck.dependencies
    });

    // Realizar eliminación lógica
    const deletedWorkOrder = await deleteWorkOrder(id, req.user.id);

    res.json({
      mensaje: 'Orden de trabajo eliminada exitosamente',
      data: deletedWorkOrder,
      dependenciesInfo: {
        hasDependencies: dependencyCheck.hasDependencies,
        totalDependencies: dependencyCheck.totalDependencies,
        message: dependencyCheck.message
      }
    });
  } catch (error) {
    console.error('Error al eliminar orden de trabajo:', error);
    responderErrorServidor(res, error, 'Error al eliminar orden de trabajo');
  }
};

const getNextId = async (req, res) => {
  try {
    const nextId = await generateWorkOrderId();
    res.json({ next_id: nextId });
  } catch (error) {
    console.error('Error al generar ID de orden:', error);
    responderErrorServidor(res, error, 'Error al generar ID de orden');
  }
};

const checkCanDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const existingWorkOrder = await getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({
        error: 'Orden de trabajo no encontrada',
        message: `La orden de trabajo ${id} no existe o ya fue eliminada por otro usuario. Recarga la pantalla Órdenes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    const dependencyCheck = await checkWorkOrderDependencies(id);

    res.json({
      canDelete: dependencyCheck.canDelete,
      hasDependencies: dependencyCheck.hasDependencies,
      totalDependencies: dependencyCheck.totalDependencies,
      dependencies: dependencyCheck.dependencies,
      message: dependencyCheck.message
    });
  } catch (error) {
    console.error('Error al verificar dependencias:', error);
    responderErrorServidor(res, error, 'Error al verificar dependencias');
  }
};

const getHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const history = await getWorkOrderHistory(id);

    // Devolver array vacio si no hay historial (no es un error, solo no hay registros aun)
    res.json(history || []);
  } catch (error) {
    console.error('Error al obtener historial de orden de trabajo:', error);
    responderErrorServidor(res, error, 'Error al obtener historial de orden de trabajo');
  }
};

module.exports = { getAll, getById, create, update, remove, getNextId, checkCanDelete, getHistory };
