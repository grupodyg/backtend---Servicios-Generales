const { responderErrorServidor } = require('../utils/httpErrors');
const { getAllInstallations, getInstallationById, createInstallation, updateInstallation, deleteInstallation } = require('../models/installationsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'active', client_id, specialty, search } = req.query;
    const installations = await getAllInstallations({ status, client_id, specialty, search });
    res.json(installations);
  } catch (error) {
    console.error('Error al obtener instalaciones:', error);
    responderErrorServidor(res, error, 'Error al obtener instalaciones');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const installation = await getInstallationById(id);
    if (!installation) {
      return res.status(404).json({
        error: 'Instalación no encontrada',
        message: `La instalación con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de instalaciones para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(installation);
  } catch (error) {
    console.error('Error al obtener instalación:', error);
    responderErrorServidor(res, error, 'Error al obtener instalación');
  }
};

const create = async (req, res) => {
  try {
    const {
      name, code, client, client_id, address, specialty, equipment_type, brand, model,
      serial_number, installation_date, maintenance_frequency, last_maintenance_date, next_maintenance_date
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        error: 'Nombre y código son requeridos',
        message: `${!name && !code ? 'Los campos «Nombre» y «Código» están vacíos' : !name ? 'El campo «Nombre» está vacío' : 'El campo «Código» está vacío'}. Ambos son obligatorios para registrar una instalación: complétalos en el formulario y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    const installationData = {
      name, code, client: client || null, client_id: client_id || null, address: address || null,
      specialty: specialty || null, equipment_type: equipment_type || null, brand: brand || null,
      model: model || null, serial_number: serial_number || null, installation_date: installation_date || null,
      maintenance_frequency: maintenance_frequency || null, last_maintenance_date: last_maintenance_date || null,
      next_maintenance_date: next_maintenance_date || null, user_id_registration: req.user.id
    };

    const newInstallation = await createInstallation(installationData);
    res.status(201).json({ mensaje: 'Instalación creada exitosamente', data: newInstallation });
  } catch (error) {
    console.error('Error al crear instalación:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una instalación con ese código',
        message: `Ya hay otra instalación registrada con el código «${req.body?.code}». El código debe ser único: cambia el código en el formulario o busca y edita la instalación existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al crear instalación');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, code, client, client_id, address, specialty, equipment_type, brand, model,
      serial_number, installation_date, maintenance_frequency, last_maintenance_date,
      next_maintenance_date, status
    } = req.body;

    const existingInstallation = await getInstallationById(id);
    if (!existingInstallation) {
      return res.status(404).json({
        error: 'Instalación no encontrada',
        message: `La instalación con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de instalaciones para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    const installationData = {
      name, code, client, client_id, address, specialty, equipment_type, brand, model,
      serial_number, installation_date, maintenance_frequency, last_maintenance_date,
      next_maintenance_date, status, user_id_modification: req.user.id
    };

    const updatedInstallation = await updateInstallation(id, installationData);
    res.json({ mensaje: 'Instalación actualizada exitosamente', data: updatedInstallation });
  } catch (error) {
    console.error('Error al actualizar instalación:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una instalación con ese código',
        message: `Ya hay otra instalación registrada con el código «${req.body?.code}». El código debe ser único: elige otro código en el formulario de edición.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al actualizar instalación');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingInstallation = await getInstallationById(id);
    if (!existingInstallation) {
      return res.status(404).json({
        error: 'Instalación no encontrada',
        message: `La instalación con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de instalaciones para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedInstallation = await deleteInstallation(id, req.user.id);
    res.json({ mensaje: 'Instalación eliminada exitosamente', data: deletedInstallation });
  } catch (error) {
    console.error('Error al eliminar instalación:', error);
    responderErrorServidor(res, error, 'Error al eliminar instalación');
  }
};

module.exports = { getAll, getById, create, update, remove };
