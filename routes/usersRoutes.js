const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  updatePassword
} = require('../controllers/usersController');

// 👉 Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Todas las rutas requieren autenticación
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// GET /api/users - Obtener todos los usuarios
router.get('/', getAll);

// GET /api/users/:id - Obtener un usuario por ID
router.get('/:id', getById);

// POST /api/users - Crear un nuevo usuario
router.post('/', create);

// PUT /api/users/:id - Actualizar un usuario
router.put('/:id', update);

// PUT /api/users/:id/password - Cambiar contraseña de un usuario
router.put('/:id/password', updatePassword);

// DELETE /api/users/:id - Eliminar un usuario (soft delete)
router.delete('/:id', remove);

module.exports = router;
