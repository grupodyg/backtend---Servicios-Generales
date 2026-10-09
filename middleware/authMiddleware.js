const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Sesión no iniciada',
      message: 'No hay una sesión activa. Inicia sesión para continuar.',
      tipo: 'sesion'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // Puedes acceder desde los controladores
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Sesión expirada',
      message: 'Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión para continuar.',
      tipo: 'sesion'
    });
  }
}

// VERSIÓN SIMULADA (para pruebas sin frontend/login)
// function verificarToken(req, res, next) {
//   req.user = { id: 1 };
//   next();
// }

module.exports = verificarToken;
