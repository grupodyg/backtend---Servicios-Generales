const { responderErrorServidor } = require('../utils/httpErrors');
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
    responderErrorServidor(res, error, 'Error al obtener usuarios');
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
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `El usuario con ID ${id} no existe o fue eliminado por otro administrador. Recarga la pantalla Usuarios para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    responderErrorServidor(res, error, 'Error al obtener usuario');
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
      return res.status(400).json({
        error: 'El nombre es requerido',
        message: 'El campo «Nombre» del usuario está vacío. Escribe el nombre completo de la persona y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({
        error: 'El email es requerido',
        message: 'El campo «Correo electrónico» está vacío. El correo es obligatorio porque el usuario lo usará para iniciar sesión: escríbelo y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'El email no tiene un formato válido',
        message: `«${email}» no es un correo electrónico válido. Debe tener la forma nombre@dominio.com, sin espacios. Corrige el campo «Correo electrónico» y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres',
        message: `La contraseña ${password ? `tiene ${password.length} caracteres` : 'está vacía'} y debe tener al menos 6. Escribe una contraseña más larga en el campo «Contraseña» y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    if (!role_id) {
      return res.status(400).json({
        error: 'El rol es requerido',
        message: 'No se seleccionó ningún rol para el usuario. Elige un rol en el campo «Rol» (define qué puede ver y hacer en la aplicación) y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    // Verificar si el email ya existe
    if (await emailExists(email)) {
      return res.status(409).json({
        error: 'El email ya está registrado',
        message: `El correo «${email}» ya pertenece a otro usuario. Cada usuario necesita un correo distinto: usa otro correo o busca y edita el usuario existente en la pantalla Usuarios.`,
        tipo: 'conflicto'
      });
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
      return res.status(409).json({
        error: 'El email ya está registrado',
        message: `El correo «${req.body?.email}» ya está registrado en el sistema (puede pertenecer a un usuario eliminado). Usa otro correo o pide al administrador del sistema que libere el que ya está registrado.`,
        tipo: 'conflicto'
      });
    }

    // Error de foreign key (role_id inválido)
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'El rol especificado no existe',
        message: 'El rol seleccionado no existe o fue eliminado. Recarga la página y elige otro rol en el campo «Rol» del formulario.',
        tipo: 'validacion'
      });
    }

    responderErrorServidor(res, error, 'Error al crear usuario');
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
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `El usuario con ID ${id} no existe o fue eliminado por otro administrador, así que no se pueden guardar los cambios. Recarga la pantalla Usuarios para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    // Si se actualiza el email, validar formato y que no exista
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'El email no tiene un formato válido',
          message: `«${email}» no es un correo electrónico válido. Debe tener la forma nombre@dominio.com, sin espacios. Corrige el campo «Correo electrónico» y vuelve a guardar.`,
          tipo: 'validacion'
        });
      }

      if (await emailExists(email, id)) {
        return res.status(409).json({
          error: 'El email ya está registrado por otro usuario',
          message: `El correo «${email}» ya pertenece a otro usuario. Cada usuario necesita un correo distinto: escribe otro correo o deja el que tenía «${existingUser.name}».`,
          tipo: 'conflicto'
        });
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
      return res.status(409).json({
        error: 'El email ya está registrado por otro usuario',
        message: `El correo «${req.body?.email}» ya está registrado en el sistema para otro usuario (puede ser un usuario eliminado). Escribe otro correo en el campo «Correo electrónico» o pide al administrador del sistema que libere el que ya está registrado.`,
        tipo: 'conflicto'
      });
    }

    // Error de foreign key (role_id inválido)
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'El rol especificado no existe',
        message: 'El rol seleccionado no existe o fue eliminado. Recarga la página y elige otro rol en el campo «Rol» del formulario.',
        tipo: 'validacion'
      });
    }

    responderErrorServidor(res, error, 'Error al actualizar usuario');
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
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `El usuario con ID ${id} no existe o ya fue eliminado por otro administrador. Recarga la pantalla Usuarios para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    // Evitar que el usuario se elimine a sí mismo
    if (id == req.user.id) {
      return res.status(400).json({
        error: 'No puedes eliminar tu propio usuario',
        message: 'No se permite eliminar el usuario con el que has iniciado sesión, para que no pierdas el acceso a la aplicación. Si de verdad hay que darlo de baja, pide a otro administrador que lo haga.',
        tipo: 'validacion'
      });
    }

    const deletedUser = await deleteUser(id, req.user.id);
    res.json({
      mensaje: 'Usuario eliminado exitosamente',
      data: deletedUser
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    responderErrorServidor(res, error, 'Error al eliminar usuario');
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
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: `El usuario con ID ${id} no existe o fue eliminado por otro administrador, así que no se puede cambiar su contraseña. Recarga la pantalla Usuarios para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    // Validar contraseña
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres',
        message: `La nueva contraseña ${newPassword ? `tiene ${newPassword.length} caracteres` : 'está vacía'} y debe tener al menos 6. Escribe una contraseña más larga en el campo «Nueva contraseña» y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    const updatedUser = await changePassword(id, newPassword, req.user.id);
    res.json({
      mensaje: 'Contraseña actualizada exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    responderErrorServidor(res, error, 'Error al cambiar contraseña');
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
