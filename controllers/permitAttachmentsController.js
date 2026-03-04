const { getAllPermitAttachments, getPermitAttachmentById, createPermitAttachment, updatePermitAttachment, deletePermitAttachment } = require('../models/permitAttachmentsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'active', permit_id, uploaded_by } = req.query;
    const attachments = await getAllPermitAttachments({ status, permit_id, uploaded_by });
    res.json(attachments);
  } catch (error) {
    console.error('Error al obtener adjuntos de permisos:', error);
    res.status(500).json({ error: 'Error al obtener adjuntos de permisos' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const attachment = await getPermitAttachmentById(id);
    if (!attachment) return res.status(404).json({ error: 'Adjunto de permiso no encontrado' });
    res.json(attachment);
  } catch (error) {
    console.error('Error al obtener adjunto de permiso:', error);
    res.status(500).json({ error: 'Error al obtener adjunto de permiso' });
  }
};

const create = async (req, res) => {
  try {
    const { permit_id, file_url, file_name, file_type, uploaded_by, status } = req.body;
    const attachmentData = { permit_id, file_url, file_name, file_type, uploaded_by, status, user_id_registration: req.user.id };
    const newAttachment = await createPermitAttachment(attachmentData);
    res.status(201).json({ mensaje: 'Adjunto de permiso creado exitosamente', data: newAttachment });
  } catch (error) {
    console.error('Error al crear adjunto de permiso:', error);
    res.status(500).json({ error: 'Error al crear adjunto de permiso' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingAttachment = await getPermitAttachmentById(id);
    if (!existingAttachment) return res.status(404).json({ error: 'Adjunto de permiso no encontrado' });
    const attachmentData = { ...req.body, user_id_modification: req.user.id };
    const updatedAttachment = await updatePermitAttachment(id, attachmentData);
    res.json({ mensaje: 'Adjunto de permiso actualizado exitosamente', data: updatedAttachment });
  } catch (error) {
    console.error('Error al actualizar adjunto de permiso:', error);
    res.status(500).json({ error: 'Error al actualizar adjunto de permiso' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingAttachment = await getPermitAttachmentById(id);
    if (!existingAttachment) return res.status(404).json({ error: 'Adjunto de permiso no encontrado' });
    const deletedAttachment = await deletePermitAttachment(id, req.user.id);
    res.json({ mensaje: 'Adjunto de permiso eliminado exitosamente', data: deletedAttachment });
  } catch (error) {
    console.error('Error al eliminar adjunto de permiso:', error);
    res.status(500).json({ error: 'Error al eliminar adjunto de permiso' });
  }
};

module.exports = { getAll, getById, create, update, remove };
