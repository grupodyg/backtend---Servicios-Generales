const {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission
} = require('../models/permissionsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const permissions = await getAllPermissions(status);
    res.json(permissions);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await getPermissionById(id);
    if (!permission) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    res.json(permission);
  } catch (error) {
    console.error('Error al obtener permiso:', error);
    res.status(500).json({ error: 'Error al obtener permiso' });
  }
};

const create = async (req, res) => {
  try {
    const { name, description, module } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const permissionData = {
      name: name.trim(),
      description: description || null,
      module: module || null,
      user_id_registration: req.user.id
    };
    const newPermission = await createPermission(permissionData);
    res.status(201).json({ mensaje: 'Permiso creado exitosamente', data: newPermission });
  } catch (error) {
    console.error('Error al crear permiso:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un permiso con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear permiso' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, module, status } = req.body;
    const existingPermission = await getPermissionById(id);
    if (!existingPermission) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    const permissionData = {
      name: name ? name.trim() : undefined,
      description,
      module,
      status,
      user_id_modification: req.user.id
    };
    const updatedPermission = await updatePermission(id, permissionData);
    res.json({ mensaje: 'Permiso actualizado exitosamente', data: updatedPermission });
  } catch (error) {
    console.error('Error al actualizar permiso:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un permiso con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar permiso' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPermission = await getPermissionById(id);
    if (!existingPermission) {
      return res.status(404).json({ error: 'Permiso no encontrado' });
    }
    const deletedPermission = await deletePermission(id, req.user.id);
    res.json({ mensaje: 'Permiso eliminado exitosamente', data: deletedPermission });
  } catch (error) {
    console.error('Error al eliminar permiso:', error);
    res.status(500).json({ error: 'Error al eliminar permiso' });
  }
};

module.exports = { getAll, getById, create, update, remove };
