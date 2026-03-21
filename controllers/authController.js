const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, updateLastActivity } = require('../models/authModel');
const { getCurrentTimestamp } = require('../utils/dateUtils');

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validar que se proporcionen email y password
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario con su rol y permisos
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'Email no registrado o usuario inactivo' });
    }

    // Comparar contraseñas con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Actualizar última actividad del usuario
    await updateLastActivity(user.id);

    // Actualizar el objeto user con la nueva última actividad
    const currentTimestamp = getCurrentTimestamp();

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Responder con todos los datos del usuario + permisos (excepto password)
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        phone: user.phone,
        dni: user.dni,
        address: user.address,
        position: user.position,
        specialty: user.specialty,
        last_activity: currentTimestamp,
        status: user.status,
        user_id_registration: user.user_id_registration,
        date_time_registration: user.date_time_registration,
        user_id_modification: user.user_id_modification,
        date_time_modification: user.date_time_modification,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

module.exports = { login };
