const { getAllInstallations, getInstallationById, createInstallation, updateInstallation, deleteInstallation } = require('../models/installationsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'active', client_id, specialty, search } = req.query;
    const installations = await getAllInstallations({ status, client_id, specialty, search });
    res.json(installations);
  } catch (error) {
    console.error('Error al obtener instalaciones:', error);
    res.status(500).json({ error: 'Error al obtener instalaciones' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const installation = await getInstallationById(id);
    if (!installation) return res.status(404).json({ error: 'Instalación no encontrada' });
    res.json(installation);
  } catch (error) {
    console.error('Error al obtener instalación:', error);
    res.status(500).json({ error: 'Error al obtener instalación' });
  }
};

const create = async (req, res) => {
  try {
    const {
      name, code, client, client_id, address, specialty, equipment_type, brand, model,
      serial_number, installation_date, maintenance_frequency, last_maintenance_date, next_maintenance_date
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Nombre y código son requeridos' });
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
      return res.status(409).json({ error: 'Ya existe una instalación con ese código' });
    }
    res.status(500).json({ error: 'Error al crear instalación' });
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
    if (!existingInstallation) return res.status(404).json({ error: 'Instalación no encontrada' });

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
      return res.status(409).json({ error: 'Ya existe una instalación con ese código' });
    }
    res.status(500).json({ error: 'Error al actualizar instalación' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingInstallation = await getInstallationById(id);
    if (!existingInstallation) return res.status(404).json({ error: 'Instalación no encontrada' });
    const deletedInstallation = await deleteInstallation(id, req.user.id);
    res.json({ mensaje: 'Instalación eliminada exitosamente', data: deletedInstallation });
  } catch (error) {
    console.error('Error al eliminar instalación:', error);
    res.status(500).json({ error: 'Error al eliminar instalación' });
  }
};

module.exports = { getAll, getById, create, update, remove };
