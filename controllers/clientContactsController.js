const { responderErrorServidor } = require('../utils/httpErrors');
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
    responderErrorServidor(res, error, 'Error al obtener contactos');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await getContactById(id);
    if (!contact) {
      return res.status(404).json({
        error: 'Contacto no encontrado',
        message: `El contacto con ID ${id} no existe o fue eliminado por otro usuario. Recarga la ficha del cliente para ver sus contactos actuales.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(contact);
  } catch (error) {
    console.error('Error al obtener contacto:', error);
    responderErrorServidor(res, error, 'Error al obtener contacto');
  }
};

const create = async (req, res) => {
  try {
    const { client_id, name, position, email, phone, is_primary } = req.body;
    if (!client_id || !name) {
      return res.status(400).json({
        error: 'Faltan datos del contacto',
        message: !name
          ? 'El campo «Nombre» del contacto está vacío. Escribe el nombre de la persona de contacto en el formulario y vuelve a guardar.'
          : 'No llegó el cliente al que pertenece el contacto. No es un problema de lo que ingresaste: recarga la ficha del cliente e inténtalo de nuevo. Si persiste, avisa al administrador del sistema.',
        tipo: 'validacion'
      });
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
      return res.status(400).json({
        error: 'El cliente especificado no existe',
        message: `El cliente al que intentas añadir el contacto (ID ${req.body?.client_id}) no existe o fue eliminado. Recarga la lista de clientes, abre el cliente correcto y vuelve a añadir el contacto.`,
        tipo: 'validacion'
      });
    }
    responderErrorServidor(res, error, 'Error al crear contacto');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, email, phone, is_primary, status } = req.body;
    const existingContact = await getContactById(id);
    if (!existingContact) {
      return res.status(404).json({
        error: 'Contacto no encontrado',
        message: `El contacto con ID ${id} no existe o fue eliminado por otro usuario. Recarga la ficha del cliente para ver sus contactos actuales.`,
        tipo: 'no_encontrado'
      });
    }
    const contactData = { name, position, email, phone, is_primary, status, user_id_modification: req.user.id };
    const updatedContact = await updateContact(id, contactData);
    res.json({ mensaje: 'Contacto actualizado exitosamente', data: updatedContact });
  } catch (error) {
    console.error('Error al actualizar contacto:', error);
    responderErrorServidor(res, error, 'Error al actualizar contacto');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingContact = await getContactById(id);
    if (!existingContact) {
      return res.status(404).json({
        error: 'Contacto no encontrado',
        message: `El contacto con ID ${id} no existe o fue eliminado por otro usuario. Recarga la ficha del cliente para ver sus contactos actuales.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedContact = await deleteContact(id, req.user.id);
    res.json({ mensaje: 'Contacto eliminado exitosamente', data: deletedContact });
  } catch (error) {
    console.error('Error al eliminar contacto:', error);
    responderErrorServidor(res, error, 'Error al eliminar contacto');
  }
};

module.exports = { getByClient, getById, create, update, remove };
