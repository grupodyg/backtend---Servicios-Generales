/**
 * Middleware para validar que el usuario sea administrador
 * Solo permite acceso a usuarios con role_id = 1 (Administrador)
 */
function verificarAdmin(req, res, next) {
  // El user ya está en req.user gracias al middleware verificarToken
  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  // Validar que sea administrador (role_id = 1)
  if (req.user.role_id !== 1) {
    return res.status(403).json({
      error: 'Acceso denegado. Solo administradores pueden realizar esta acción.'
    });
  }

  next();
}

module.exports = verificarAdmin;
