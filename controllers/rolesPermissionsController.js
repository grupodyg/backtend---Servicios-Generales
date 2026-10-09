const { responderErrorServidor } = require('../utils/httpErrors');
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
    responderErrorServidor(res, error, 'Error al obtener permisos del rol');
  }
};

// Asignar permiso a rol
const assign = async (req, res) => {
  try {
    const { role_id, permission_id } = req.body;
    if (!role_id || !permission_id) {
      return res.status(400).json({
        error: 'Faltan el rol o el permiso',
        message: `No llegó ${!role_id ? 'el rol' : 'el permiso'} que se quiere asignar. No es un problema de lo que seleccionaste, sino de la aplicación: recarga la pantalla de roles y permisos e inténtalo de nuevo. Si persiste, avisa al administrador del sistema.`,
        tipo: 'validacion'
      });
    }
    const assignment = await assignPermissionToRole(role_id, permission_id, req.user.id);
    res.status(201).json({ mensaje: 'Permiso asignado exitosamente', data: assignment });
  } catch (error) {
    console.error('Error al asignar permiso:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'El permiso ya está asignado a este rol',
        message: 'Este rol ya tiene el permiso seleccionado, así que no hace falta asignarlo de nuevo. Recarga la pantalla de roles y permisos para ver los permisos actuales del rol.',
        tipo: 'conflicto'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'El rol o permiso especificado no existe',
        message: 'El rol o el permiso seleccionado no existe o fue eliminado por otro usuario. Recarga la pantalla de roles y permisos y vuelve a seleccionarlos.',
        tipo: 'validacion'
      });
    }
    responderErrorServidor(res, error, 'Error al asignar permiso');
  }
};

// Remover permiso de rol
const remove = async (req, res) => {
  try {
    const { role_id, permission_id } = req.params;
    const removed = await removePermissionFromRole(role_id, permission_id, req.user.id);
    if (!removed) {
      return res.status(404).json({
        error: 'Asignación no encontrada',
        message: 'El rol ya no tiene asignado ese permiso (es posible que otro usuario lo haya quitado). Recarga la pantalla de roles y permisos para ver los permisos actuales del rol.',
        tipo: 'no_encontrado'
      });
    }
    res.json({ mensaje: 'Permiso removido exitosamente', data: removed });
  } catch (error) {
    console.error('Error al remover permiso:', error);
    responderErrorServidor(res, error, 'Error al remover permiso');
  }
};

// Sincronizar permisos de un rol (sobrescribe existentes)
const sync = async (req, res) => {
  try {
    const { role_id } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({
        error: 'Lista de permisos no válida',
        message: 'La lista de permisos del rol no llegó en el formato esperado. No es un problema de lo que seleccionaste, sino de la aplicación: recarga la pantalla de roles y permisos y vuelve a guardar. Si persiste, avisa al administrador del sistema.',
        tipo: 'validacion'
      });
    }

    const permissions = await syncPermissionsToRole(role_id, permission_ids, req.user.id);
    res.json({ mensaje: 'Permisos sincronizados exitosamente', data: permissions });
  } catch (error) {
    console.error('Error al sincronizar permisos:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'El rol o algún permiso especificado no existe',
        message: 'El rol o alguno de los permisos marcados ya no existe (puede haber sido eliminado por otro usuario). Recarga la pantalla de roles y permisos, revisa la selección y vuelve a guardar.',
        tipo: 'validacion'
      });
    }
    responderErrorServidor(res, error, 'Error al sincronizar permisos');
  }
};

module.exports = { getByRole, assign, remove, sync };
