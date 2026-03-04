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
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await getRoleById(id);
    if (!role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    res.json(role);
  } catch (error) {
    console.error('Error al obtener rol:', error);
    res.status(500).json({ error: 'Error al obtener rol' });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
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
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear rol' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const existingRole = await getRoleById(id);
    if (!existingRole) {
      return res.status(404).json({ error: 'Rol no encontrado' });
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
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRole = await getRoleById(id);
    if (!existingRole) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }
    const deletedRole = await deleteRole(id, req.user.id);
    res.json({ mensaje: 'Rol eliminado exitosamente', data: deletedRole });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
};

module.exports = { getAll, getById, create, update, remove };
