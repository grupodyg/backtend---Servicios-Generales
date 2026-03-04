const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  create,
  update,
  remove
} = require('../controllers/materialCategoriesController');

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

// GET /api/material-categories - Obtener todas las categorías de materiales
router.get('/', getAll);

// GET /api/material-categories/:id - Obtener una categoría de materiales por ID
router.get('/:id', getById);

// POST /api/material-categories - Crear una nueva categoría de materiales
router.post('/', create);

// PUT /api/material-categories/:id - Actualizar una categoría de materiales
router.put('/:id', update);

// DELETE /api/material-categories/:id - Eliminar una categoría de materiales (soft delete)
router.delete('/:id', remove);

module.exports = router;
