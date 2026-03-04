const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  emailExists
} = require('../models/usersModel');

/**
 * Obtener todos los usuarios
 */
const getAll = async (req, res) => {
  try {
    const { status = 'active', role_id, specialty } = req.query;
    const users = await getAllUsers({ status, role_id, specialty });
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

/**
 * Obtener un usuario por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

/**
 * Crear un nuevo usuario
 */
const create = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role_id,
      phone,
      dni,
      address,
      position,
      specialty
    } = req.body;

    // Validaciones
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'El email no tiene un formato válido' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (!role_id) {
      return res.status(400).json({ error: 'El rol es requerido' });
    }

    // Verificar si el email ya existe
    if (await emailExists(email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role_id,
      phone: phone || null,
      dni: dni || null,
      address: address || null,
      position: position || null,
      specialty: specialty || null,
      user_id_registration: req.user.id
    };

    const newUser = await createUser(userData);
    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      data: newUser
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);

    // Error de email duplicado
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Error de foreign key (role_id inválido)
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El rol especificado no existe' });
    }

    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

/**
 * Actualizar un usuario
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      role_id,
      phone,
      dni,
      address,
      position,
      specialty,
      status
    } = req.body;

    // Validar que el usuario existe
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si se actualiza el email, validar formato y que no exista
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'El email no tiene un formato válido' });
      }

      if (await emailExists(email, id)) {
        return res.status(409).json({ error: 'El email ya está registrado por otro usuario' });
      }
    }

    const userData = {
      name: name ? name.trim() : undefined,
      email: email ? email.trim().toLowerCase() : undefined,
      role_id,
      phone,
      dni,
      address,
      position,
      specialty,
      status,
      user_id_modification: req.user.id
    };

    const updatedUser = await updateUser(id, userData);
    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

    // Error de email duplicado
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return res.status(409).json({ error: 'El email ya está registrado por otro usuario' });
    }

    // Error de foreign key (role_id inválido)
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El rol especificado no existe' });
    }

    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

/**
 * Eliminar un usuario (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el usuario existe
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Evitar que el usuario se elimine a sí mismo
    if (id == req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    const deletedUser = await deleteUser(id, req.user.id);
    res.json({
      mensaje: 'Usuario eliminado exitosamente',
      data: deletedUser
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

/**
 * Cambiar contraseña de un usuario
 */
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Validar que el usuario existe
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar contraseña
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const updatedUser = await changePassword(id, newPassword, req.user.id);
    res.json({
      mensaje: 'Contraseña actualizada exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  updatePassword
};
