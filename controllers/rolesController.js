const { responderErrorServidor } = require('../utils/httpErrors');
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} = require('../models/rolesModel');

const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const roles = await getAllRoles(status);
    res.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    responderErrorServidor(res, error, 'Error al obtener roles');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await getRoleById(id);
    if (!role) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    res.json(role);
  } catch (error) {
    console.error('Error al obtener rol:', error);
    responderErrorServidor(res, error, 'Error al obtener rol');
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'El nombre es requerido',
        message: 'El campo «Nombre» del rol está vacío. Escribe un nombre para el rol (por ejemplo, «Supervisor») y vuelve a guardar.',
        tipo: 'validacion'
      });
    }
    const roleData = {
      name: name.trim(),
      description: description || null,
      user_id_registration: req.user.id
    };
    const newRole = await createRole(roleData);
    res.status(201).json({ mensaje: 'Rol creado exitosamente', data: newRole });
  } catch (error) {
    console.error('Error al crear rol:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe un rol con ese nombre',
        message: `Ya existe un rol llamado «${req.body?.name?.trim()}». El nombre debe ser único: elige otro nombre en el formulario del rol o edita el rol existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al crear rol');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const existingRole = await getRoleById(id);
    if (!existingRole) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const roleData = {
      name: name ? name.trim() : undefined,
      description,
      status,
      user_id_modification: req.user.id
    };
    const updatedRole = await updateRole(id, roleData);
    res.json({ mensaje: 'Rol actualizado exitosamente', data: updatedRole });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe un rol con ese nombre',
        message: `Ya existe un rol llamado «${req.body?.name?.trim()}». El nombre debe ser único: elige otro nombre en el formulario del rol o edita el rol existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al actualizar rol');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRole = await getRoleById(id);
    if (!existingRole) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: `El rol con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedRole = await deleteRole(id, req.user.id);
    res.json({ mensaje: 'Rol eliminado exitosamente', data: deletedRole });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    responderErrorServidor(res, error, 'Error al eliminar rol');
  }
};

module.exports = { getAll, getById, create, update, remove };
