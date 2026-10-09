const { responderErrorServidor } = require('../utils/httpErrors');
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
    responderErrorServidor(res, error, 'Error al obtener permisos');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await getPermissionById(id);
    if (!permission) {
      return res.status(404).json({
        error: 'Permiso no encontrado',
        message: `El permiso del sistema con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(permission);
  } catch (error) {
    console.error('Error al obtener permiso:', error);
    responderErrorServidor(res, error, 'Error al obtener permiso');
  }
};

const create = async (req, res) => {
  try {
    const { name, description, module } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'El nombre es requerido',
        message: 'El campo «Nombre» del permiso está vacío. Escribe un nombre que identifique la acción que habilita y vuelve a guardar.',
        tipo: 'validacion'
      });
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
      return res.status(409).json({
        error: 'Ya existe un permiso con ese nombre',
        message: `Ya existe un permiso del sistema llamado «${req.body?.name?.trim()}». El nombre debe ser único: elige otro nombre o edita el permiso existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al crear permiso');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, module, status } = req.body;
    const existingPermission = await getPermissionById(id);
    if (!existingPermission) {
      return res.status(404).json({
        error: 'Permiso no encontrado',
        message: `El permiso del sistema con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
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
      return res.status(409).json({
        error: 'Ya existe un permiso con ese nombre',
        message: `Ya existe un permiso del sistema llamado «${req.body?.name?.trim()}». El nombre debe ser único: elige otro nombre o edita el permiso existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al actualizar permiso');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPermission = await getPermissionById(id);
    if (!existingPermission) {
      return res.status(404).json({
        error: 'Permiso no encontrado',
        message: `El permiso del sistema con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedPermission = await deletePermission(id, req.user.id);
    res.json({ mensaje: 'Permiso eliminado exitosamente', data: deletedPermission });
  } catch (error) {
    console.error('Error al eliminar permiso:', error);
    responderErrorServidor(res, error, 'Error al eliminar permiso');
  }
};

module.exports = { getAll, getById, create, update, remove };
