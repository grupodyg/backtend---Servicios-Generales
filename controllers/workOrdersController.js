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
const { checkWorkOrderDependencies, logDeletion } = require('../services/deletionService');
const { filterSensitiveFields } = require('../utils/filterSensitiveFields');

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
        return res.status(404).json({ error: 'Usuario no encontrado' });
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
    res.status(500).json({ error: 'Error al obtener órdenes de trabajo' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const workOrder = await getWorkOrderById(id);
    if (!workOrder) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    const filteredWorkOrder = filterSensitiveFields(workOrder, req.user, 'work_order');
    res.json(filteredWorkOrder);
  } catch (error) {
    console.error('Error al obtener orden de trabajo:', error);
    res.status(500).json({ error: 'Error al obtener orden de trabajo' });
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
      purchase_order_document, solpe, resources, selected_materials, selected_tools
    } = req.body;

    // Validaciones básicas
    if (!service_type) {
      return res.status(400).json({ error: 'El tipo de servicio es requerido' });
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
      selected_tools: selected_tools || null, user_id_registration: req.user.id
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
    res.status(500).json({ error: 'Error al crear orden de trabajo', details: error.message });
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
      resources, selected_materials, selected_tools, solpe, resources_update_date, status
    } = req.body;

    const existingWorkOrder = await getWorkOrderById(id);
    if (!existingWorkOrder) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });

    // PROTECCIÓN: Bloquear modificaciones a órdenes completadas
    // Solo permitir cambios si es una actualización de firmas del informe final
    const isCompleted = existingWorkOrder.status === 'completed';
    if (isCompleted) {
      // Lista de campos permitidos para órdenes completadas (solo lectura/firmas)
      const allowedFieldsForCompleted = ['status']; // Solo permitir cambiar status si es necesario reabrir
      const requestedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined && req.body[key] !== null);
      const hasDisallowedFields = requestedFields.some(field => !allowedFieldsForCompleted.includes(field));

      if (hasDisallowedFields) {
        return res.status(400).json({
          error: 'Orden completada',
          message: 'No se puede modificar una orden de trabajo que ya está completada. El trabajo ya fue cerrado.',
          blockedFields: requestedFields.filter(field => !allowedFieldsForCompleted.includes(field))
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
      status, user_id_modification: req.user.id
    };

    const updatedWorkOrder = await updateWorkOrder(id, orderData);
    const filteredWorkOrder = filterSensitiveFields(updatedWorkOrder, req.user, 'work_order');
    res.json({ mensaje: 'Orden de trabajo actualizada exitosamente', data: filteredWorkOrder });
  } catch (error) {
    console.error('Error al actualizar orden de trabajo:', error);
    res.status(500).json({ error: 'Error al actualizar orden de trabajo' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || 'Sin motivo especificado';

    const existingWorkOrder = await getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
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
    res.status(500).json({ error: 'Error al eliminar orden de trabajo' });
  }
};

const getNextId = async (req, res) => {
  try {
    const nextId = await generateWorkOrderId();
    res.json({ next_id: nextId });
  } catch (error) {
    console.error('Error al generar ID de orden:', error);
    res.status(500).json({ error: 'Error al generar ID de orden' });
  }
};

const checkCanDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const existingWorkOrder = await getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
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
    res.status(500).json({ error: 'Error al verificar dependencias' });
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
    res.status(500).json({ error: 'Error al obtener historial de orden de trabajo' });
  }
};

module.exports = { getAll, getById, create, update, remove, getNextId, checkCanDelete, getHistory };
