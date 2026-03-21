const { getAllToolRequests, getToolRequestById, createToolRequest, createToolRequestItems, updateToolRequest, deleteToolRequest } = require('../models/toolRequestsModel');
const { getCurrentTimestamp } = require('../utils/dateUtils');

const getAll = async (req, res) => {
  try {
    const { status = 'all', order_id, technician_id } = req.query;
    const requests = await getAllToolRequests({ status, order_id, technician_id });
    res.json(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await getToolRequestById(id);
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(request);
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
};

const create = async (req, res) => {
  try {
    const { order_id, technician_id, technician_name, request_date, return_date, observations, herramientas, items } = req.body;

    // Crear la solicitud principal
    const requestData = {
      order_id: order_id || null,
      technician_id: technician_id || null,
      technician_name: technician_name || null,
      request_date: request_date || getCurrentTimestamp(),
      return_date: return_date || null,
      observations: observations || null,
      user_id_registration: req.user.id
    };
    const newRequest = await createToolRequest(requestData);

    // Crear los items de herramientas si vienen en el request
    const toolItems = herramientas || items || [];
    let createdItems = [];

    if (toolItems.length > 0) {
      createdItems = await createToolRequestItems(newRequest.id, toolItems, req.user.id);
    }

    // Obtener la solicitud completa con sus items
    const completeRequest = await getToolRequestById(newRequest.id);

    res.status(201).json({ mensaje: 'Solicitud creada exitosamente', data: completeRequest });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRequest = await getToolRequestById(id);
    if (!existingRequest) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const requestData = { ...req.body, user_id_modification: req.user.id };
    const updatedRequest = await updateToolRequest(id, requestData);
    res.json({ mensaje: 'Solicitud actualizada exitosamente', data: updatedRequest });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ error: 'Error al actualizar solicitud' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRequest = await getToolRequestById(id);
    if (!existingRequest) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const deletedRequest = await deleteToolRequest(id, req.user.id);
    res.json({ mensaje: 'Solicitud cancelada exitosamente', data: deletedRequest });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
};

module.exports = { getAll, getById, create, update, remove };
