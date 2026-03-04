const {
  getContactsByClient,
  getContactById,
  createContact,
  updateContact,
  deleteContact
} = require('../models/clientContactsModel');

const getByClient = async (req, res) => {
  try {
    const { client_id } = req.params;
    const contacts = await getContactsByClient(client_id);
    res.json(contacts);
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({ error: 'Error al obtener contactos' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await getContactById(id);
    if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });
    res.json(contact);
  } catch (error) {
    console.error('Error al obtener contacto:', error);
    res.status(500).json({ error: 'Error al obtener contacto' });
  }
};

const create = async (req, res) => {
  try {
    const { client_id, name, position, email, phone, is_primary } = req.body;
    if (!client_id || !name) {
      return res.status(400).json({ error: 'client_id y name son requeridos' });
    }
    const contactData = {
      client_id, name, position: position || null, email: email || null,
      phone: phone || null, is_primary: is_primary || false, user_id_registration: req.user.id
    };
    const newContact = await createContact(contactData);
    res.status(201).json({ mensaje: 'Contacto creado exitosamente', data: newContact });
  } catch (error) {
    console.error('Error al crear contacto:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El cliente especificado no existe' });
    }
    res.status(500).json({ error: 'Error al crear contacto' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, email, phone, is_primary, status } = req.body;
    const existingContact = await getContactById(id);
    if (!existingContact) return res.status(404).json({ error: 'Contacto no encontrado' });
    const contactData = { name, position, email, phone, is_primary, status, user_id_modification: req.user.id };
    const updatedContact = await updateContact(id, contactData);
    res.json({ mensaje: 'Contacto actualizado exitosamente', data: updatedContact });
  } catch (error) {
    console.error('Error al actualizar contacto:', error);
    res.status(500).json({ error: 'Error al actualizar contacto' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingContact = await getContactById(id);
    if (!existingContact) return res.status(404).json({ error: 'Contacto no encontrado' });
    const deletedContact = await deleteContact(id, req.user.id);
    res.json({ mensaje: 'Contacto eliminado exitosamente', data: deletedContact });
  } catch (error) {
    console.error('Error al eliminar contacto:', error);
    res.status(500).json({ error: 'Error al eliminar contacto' });
  }
};

module.exports = { getByClient, getById, create, update, remove };
