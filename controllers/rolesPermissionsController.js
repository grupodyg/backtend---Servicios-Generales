const {
  getPermissionsByRole,
  assignPermissionToRole,
  removePermissionFromRole,
  syncPermissionsToRole
} = require('../models/rolesPermissionsModel');

// Obtener permisos de un rol
const getByRole = async (req, res) => {
  try {
    const { role_id } = req.params;
    const permissions = await getPermissionsByRole(role_id);
    res.json(permissions);
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    res.status(500).json({ error: 'Error al obtener permisos del rol' });
  }
};

// Asignar permiso a rol
const assign = async (req, res) => {
  try {
    const { role_id, permission_id } = req.body;
    if (!role_id || !permission_id) {
      return res.status(400).json({ error: 'role_id y permission_id son requeridos' });
    }
    const assignment = await assignPermissionToRole(role_id, permission_id, req.user.id);
    res.status(201).json({ mensaje: 'Permiso asignado exitosamente', data: assignment });
  } catch (error) {
    console.error('Error al asignar permiso:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El permiso ya está asignado a este rol' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El rol o permiso especificado no existe' });
    }
    res.status(500).json({ error: 'Error al asignar permiso' });
  }
};

// Remover permiso de rol
const remove = async (req, res) => {
  try {
    const { role_id, permission_id } = req.params;
    const removed = await removePermissionFromRole(role_id, permission_id, req.user.id);
    if (!removed) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }
    res.json({ mensaje: 'Permiso removido exitosamente', data: removed });
  } catch (error) {
    console.error('Error al remover permiso:', error);
    res.status(500).json({ error: 'Error al remover permiso' });
  }
};

// Sincronizar permisos de un rol (sobrescribe existentes)
const sync = async (req, res) => {
  try {
    const { role_id } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ error: 'permission_ids debe ser un array' });
    }

    const permissions = await syncPermissionsToRole(role_id, permission_ids, req.user.id);
    res.json({ mensaje: 'Permisos sincronizados exitosamente', data: permissions });
  } catch (error) {
    console.error('Error al sincronizar permisos:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El rol o algún permiso especificado no existe' });
    }
    res.status(500).json({ error: 'Error al sincronizar permisos' });
  }
};

module.exports = { getByRole, assign, remove, sync };
