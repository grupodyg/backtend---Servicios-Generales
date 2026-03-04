const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  create,
  update,
  remove
} = require('../controllers/serviceTypesController');

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

// GET /api/service-types - Obtener todos los tipos de servicio
router.get('/', getAll);

// GET /api/service-types/:id - Obtener un tipo de servicio por ID
router.get('/:id', getById);

// POST /api/service-types - Crear un nuevo tipo de servicio
router.post('/', create);

// PUT /api/service-types/:id - Actualizar un tipo de servicio
router.put('/:id', update);

// DELETE /api/service-types/:id - Eliminar un tipo de servicio (soft delete)
router.delete('/:id', remove);

module.exports = router;
