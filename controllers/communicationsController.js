const { getAllCommunications, getCommunicationById, createCommunication, updateCommunication, deleteCommunication } = require('../models/communicationsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'all', order_id, read, is_internal } = req.query;
    const communications = await getAllCommunications({ status, order_id, read, is_internal });
    res.json(communications);
  } catch (error) {
    console.error('Error al obtener comunicaciones:', error);
    res.status(500).json({ error: 'Error al obtener comunicaciones' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const communication = await getCommunicationById(id);
    if (!communication) return res.status(404).json({ error: 'Comunicación no encontrada' });
    res.json(communication);
  } catch (error) {
    console.error('Error al obtener comunicación:', error);
    res.status(500).json({ error: 'Error al obtener comunicación' });
  }
};

const create = async (req, res) => {
  try {
    const { order_id, client, communication_type, communication_date, subject, description, read, is_internal, created_by, responsible, status } = req.body;
    const communicationData = { order_id: order_id || null, client: client || null, communication_type: communication_type || null, communication_date: communication_date || null, subject: subject || null, description: description || null, read: read || false, is_internal: is_internal || false, created_by: created_by || null, responsible: responsible || null, status: status || 'pending', user_id_registration: req.user.id };
    const newCommunication = await createCommunication(communicationData);
    res.status(201).json({ mensaje: 'Comunicación creada exitosamente', data: newCommunication });
  } catch (error) {
    console.error('Error al crear comunicación:', error);
    res.status(500).json({ error: 'Error al crear comunicación' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingCommunication = await getCommunicationById(id);
    if (!existingCommunication) return res.status(404).json({ error: 'Comunicación no encontrada' });
    const communicationData = { ...req.body, user_id_modification: req.user.id };
    const updatedCommunication = await updateCommunication(id, communicationData);
    res.json({ mensaje: 'Comunicación actualizada exitosamente', data: updatedCommunication });
  } catch (error) {
    console.error('Error al actualizar comunicación:', error);
    res.status(500).json({ error: 'Error al actualizar comunicación' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingCommunication = await getCommunicationById(id);
    if (!existingCommunication) return res.status(404).json({ error: 'Comunicación no encontrada' });
    const deletedCommunication = await deleteCommunication(id, req.user.id);
    res.json({ mensaje: 'Comunicación eliminada exitosamente', data: deletedCommunication });
  } catch (error) {
    console.error('Error al eliminar comunicación:', error);
    res.status(500).json({ error: 'Error al eliminar comunicación' });
  }
};

module.exports = { getAll, getById, create, update, remove };
