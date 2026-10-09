/**
 * Middleware para validar que el usuario sea administrador
 * Solo permite acceso a usuarios con role_id = 1 (Administrador)
 */
function verificarAdmin(req, res, next) {
  // El user ya está en req.user gracias al middleware verificarToken
  if (!req.user) {
    return res.status(401).json({ error: 'Sesión no válida', message: 'No se pudo identificar tu usuario. Cierra sesión y vuelve a iniciarla.', tipo: 'sesion' });
  }

  // Validar que sea administrador (role_id = 1)
  if (req.user.role_id !== 1) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Esta acción solo la puede realizar un usuario con rol Administrador. Si necesitas hacerla, pídesela a un administrador del sistema.',
      tipo: 'permiso'
    });
  }

  next();
}

module.exports = verificarAdmin;
