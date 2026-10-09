const { responderErrorServidor } = require('../utils/httpErrors');
const { getAllMaterialRequests, getMaterialRequestById, createMaterialRequest, updateMaterialRequest, deleteMaterialRequest, addMaterialRequestItems } = require('../models/materialRequestsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'all', order_id, technician_id, technician, priority, fecha_desde, fecha_hasta, search } = req.query;
    // technician puede ser el nombre del técnico (usado por el frontend)
    const requests = await getAllMaterialRequests({
      status,
      order_id,
      technician_id,
      technician_name: technician,
      priority,
      fecha_desde,
      fecha_hasta,
      search
    });
    res.json(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    responderErrorServidor(res, error, 'Error al obtener solicitudes');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await getMaterialRequestById(id);
    if (!request) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
        message: `La solicitud de materiales con ID ${id} no existe o fue eliminada por otro usuario. Recarga la página para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(request);
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    responderErrorServidor(res, error, 'Error al obtener solicitud');
  }
};

const create = async (req, res) => {
  try {
    const { order_id, technician_id, technician_name, request_date, priority, observations, items } = req.body;
    const requestData = {
      order_id: order_id || null,
      technician_id: technician_id || null,
      technician_name: technician_name || null,
      request_date: request_date || null,
      priority: priority || 'normal',
      observations: observations || null,
      user_id_registration: req.user.id
    };

    // Crear la solicitud
    const newRequest = await createMaterialRequest(requestData);

    // Si hay items (materiales), insertarlos
    if (items && Array.isArray(items) && items.length > 0) {
      await addMaterialRequestItems(newRequest.id, items, req.user.id);
    }

    // Obtener la solicitud completa con los items
    const completeRequest = await getMaterialRequestById(newRequest.id);

    res.status(201).json({ mensaje: 'Solicitud creada exitosamente', data: completeRequest });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    responderErrorServidor(res, error, 'Error al crear solicitud');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRequest = await getMaterialRequestById(id);
    if (!existingRequest) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
        message: `La solicitud de materiales con ID ${id} no existe o fue eliminada por otro usuario. Recarga la página para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const requestData = { ...req.body, user_id_modification: req.user.id };
    const updatedRequest = await updateMaterialRequest(id, requestData);
    res.json({ mensaje: 'Solicitud actualizada exitosamente', data: updatedRequest });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    responderErrorServidor(res, error, 'Error al actualizar solicitud');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRequest = await getMaterialRequestById(id);
    if (!existingRequest) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
        message: `La solicitud de materiales con ID ${id} no existe o fue eliminada por otro usuario. Recarga la página para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedRequest = await deleteMaterialRequest(id, req.user.id);
    res.json({ mensaje: 'Solicitud cancelada exitosamente', data: deletedRequest });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    responderErrorServidor(res, error, 'Error al cancelar solicitud');
  }
};

module.exports = { getAll, getById, create, update, remove };
