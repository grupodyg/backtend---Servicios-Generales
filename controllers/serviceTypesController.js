const {
  getAllServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType
} = require('../models/serviceTypesModel');

/**
 * Obtener todos los tipos de servicio
 */
const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const serviceTypes = await getAllServiceTypes(status);
    res.json(serviceTypes);
  } catch (error) {
    console.error('Error al obtener tipos de servicio:', error);
    res.status(500).json({ error: 'Error al obtener tipos de servicio' });
  }
};

/**
 * Obtener un tipo de servicio por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceType = await getServiceTypeById(id);

    if (!serviceType) {
      return res.status(404).json({ error: 'Tipo de servicio no encontrado' });
    }

    res.json(serviceType);
  } catch (error) {
    console.error('Error al obtener tipo de servicio:', error);
    res.status(500).json({ error: 'Error al obtener tipo de servicio' });
  }
};

/**
 * Crear un nuevo tipo de servicio
 */
const create = async (req, res) => {
  try {
    const { name, description, icon, color, display_order } = req.body;

    // Validaciones
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const serviceTypeData = {
      name: name.trim(),
      description: description || null,
      icon: icon || null,
      color: color || null,
      display_order: display_order || 0,
      user_id_registration: req.user.id
    };

    const newServiceType = await createServiceType(serviceTypeData);
    res.status(201).json({
      mensaje: 'Tipo de servicio creado exitosamente',
      data: newServiceType
    });
  } catch (error) {
    console.error('Error al crear tipo de servicio:', error);

    // Error de nombre duplicado
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un tipo de servicio con ese nombre' });
    }

    res.status(500).json({ error: 'Error al crear tipo de servicio' });
  }
};

/**
 * Actualizar un tipo de servicio
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, display_order, status } = req.body;

    // Validar que el tipo de servicio existe
    const existingServiceType = await getServiceTypeById(id);
    if (!existingServiceType) {
      return res.status(404).json({ error: 'Tipo de servicio no encontrado' });
    }

    const serviceTypeData = {
      name: name ? name.trim() : undefined,
      description,
      icon,
      color,
      display_order,
      status,
      user_id_modification: req.user.id
    };

    const updatedServiceType = await updateServiceType(id, serviceTypeData);
    res.json({
      mensaje: 'Tipo de servicio actualizado exitosamente',
      data: updatedServiceType
    });
  } catch (error) {
    console.error('Error al actualizar tipo de servicio:', error);

    // Error de nombre duplicado
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un tipo de servicio con ese nombre' });
    }

    res.status(500).json({ error: 'Error al actualizar tipo de servicio' });
  }
};

/**
 * Eliminar un tipo de servicio (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el tipo de servicio existe
    const existingServiceType = await getServiceTypeById(id);
    if (!existingServiceType) {
      return res.status(404).json({ error: 'Tipo de servicio no encontrado' });
    }

    const deletedServiceType = await deleteServiceType(id, req.user.id);
    res.json({
      mensaje: 'Tipo de servicio eliminado exitosamente',
      data: deletedServiceType
    });
  } catch (error) {
    console.error('Error al eliminar tipo de servicio:', error);
    res.status(500).json({ error: 'Error al eliminar tipo de servicio' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
