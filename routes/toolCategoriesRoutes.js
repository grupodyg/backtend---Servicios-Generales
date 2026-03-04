const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  create,
  update,
  remove
} = require('../controllers/toolCategoriesController');

// Middleware para validar los roles permitidos
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

// GET /api/tool-categories - Obtener todas las categorías de herramientas
router.get('/', getAll);

// GET /api/tool-categories/:id - Obtener una categoría de herramientas por ID
router.get('/:id', getById);

// POST /api/tool-categories - Crear una nueva categoría de herramientas
router.post('/', create);

// PUT /api/tool-categories/:id - Actualizar una categoría de herramientas
router.put('/:id', update);

// DELETE /api/tool-categories/:id - Eliminar una categoría de herramientas (soft delete)
router.delete('/:id', remove);

module.exports = router;
