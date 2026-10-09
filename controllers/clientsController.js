const { responderErrorServidor } = require('../utils/httpErrors');
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} = require('../models/clientsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'active', type, category, search } = req.query;
    const clients = await getAllClients({ status, type, category, search });
    res.json(clients);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    responderErrorServidor(res, error, 'Error al obtener clientes');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: `El cliente con ID ${id} no existe o fue eliminado por otro usuario. Recarga la lista de clientes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(client);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    responderErrorServidor(res, error, 'Error al obtener cliente');
  }
};

const create = async (req, res) => {
  try {
    const { type, name, ruc, dni, email, phone, address, category, notes } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        error: 'El tipo y nombre son requeridos',
        message: `Falta ${!type ? 'el tipo de cliente (persona natural o empresa)' : 'el nombre o la razón social del cliente'}. Complétalo en el formulario de nuevo cliente y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    if (type === 'juridico' && !ruc) {
      return res.status(400).json({
        error: 'RUC es requerido para clientes jurídicos',
        message: 'Los clientes de tipo empresa (persona jurídica) deben tener RUC. Escribe el RUC en el formulario o, si es una persona, cambia el tipo de cliente a persona natural.',
        tipo: 'validacion'
      });
    }

    if (type === 'natural' && !dni) {
      return res.status(400).json({
        error: 'DNI es requerido para clientes naturales',
        message: 'Los clientes de tipo persona natural deben tener DNI. Escribe el DNI en el formulario o, si es una empresa, cambia el tipo de cliente a empresa (persona jurídica).',
        tipo: 'validacion'
      });
    }

    const clientData = {
      type, name, ruc: ruc || null, dni: dni || null, email: email || null,
      phone: phone || null, address: address || null, category: category || null,
      notes: notes || null, user_id_registration: req.user.id
    };

    const newClient = await createClient(clientData);
    res.status(201).json({ mensaje: 'Cliente creado exitosamente', data: newClient });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    responderErrorServidor(res, error, 'Error al crear cliente');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, ruc, dni, email, phone, address, category, notes, status } = req.body;

    console.log('🔄 Recibiendo actualización de cliente:', {
      id,
      body: req.body,
      userId: req.user.id
    });

    const existingClient = await getClientById(id);
    if (!existingClient) {
      console.error('❌ Cliente no encontrado:', id);
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: `El cliente con ID ${id} no existe o fue eliminado por otro usuario, así que no se pueden guardar los cambios. Recarga la lista de clientes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    // Determinar tipo final (usar tipo existente si no se proporciona)
    const finalType = type || existingClient.type;

    // Validar consistencia entre tipo y documentos de identidad SOLO si se está cambiando el tipo
    if (type && type !== existingClient.type) {
      if (finalType === 'juridico') {
        // Si está cambiando a jurídico, debe tener RUC
        const finalRuc = ruc !== undefined ? ruc : existingClient.ruc;
        if (!finalRuc) {
          console.error('❌ Validación fallida: Cambio a cliente jurídico sin RUC');
          return res.status(400).json({
            error: 'Cliente de tipo jurídico requiere RUC',
            message: `Estás cambiando el cliente «${existingClient.name}» a tipo empresa (persona jurídica), pero no tiene RUC. Escribe el RUC en el formulario de edición antes de guardar, o mantén el tipo de cliente actual.`,
            tipo: 'validacion'
          });
        }
      } else if (finalType === 'natural') {
        // Si está cambiando a natural, debe tener DNI
        const finalDni = dni !== undefined ? dni : existingClient.dni;
        if (!finalDni) {
          console.error('❌ Validación fallida: Cambio a cliente natural sin DNI');
          return res.status(400).json({
            error: 'Cliente de tipo natural requiere DNI',
            message: `Estás cambiando el cliente «${existingClient.name}» a tipo persona natural, pero no tiene DNI. Escribe el DNI en el formulario de edición antes de guardar, o mantén el tipo de cliente actual.`,
            tipo: 'validacion'
          });
        }
      }
    }

    const clientData = {
      type, name, ruc, dni, email, phone, address, category, notes, status,
      user_id_modification: req.user.id
    };

    console.log('📦 Datos preparados para actualizar:', clientData);

    const updatedClient = await updateClient(id, clientData);

    console.log('✅ Cliente actualizado exitosamente:', updatedClient.id);

    res.json({ mensaje: 'Cliente actualizado exitosamente', data: updatedClient });
  } catch (error) {
    console.error('❌ Error al actualizar cliente:', {
      error: error.message,
      stack: error.stack,
      clientId: req.params.id
    });
    responderErrorServidor(res, error, 'Error al actualizar cliente');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingClient = await getClientById(id);
    if (!existingClient) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: `El cliente con ID ${id} no existe o ya fue eliminado por otro usuario. Recarga la lista de clientes para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedClient = await deleteClient(id, req.user.id);
    res.json({ mensaje: 'Cliente eliminado exitosamente', data: deletedClient });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    responderErrorServidor(res, error, 'Error al eliminar cliente');
  }
};

module.exports = { getAll, getById, create, update, remove };
