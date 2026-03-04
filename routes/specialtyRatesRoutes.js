const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  getByName,
  create,
  update,
  remove
} = require('../controllers/specialtyRatesController');

// Middleware para validar los roles permitidos
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Todas las rutas requieren autenticacion
router.use(verificarToken);
router.use(verificarRolesPermitidos);

// GET /api/specialty-rates - Obtener todas las tarifas de especialidad
router.get('/', getAll);

// GET /api/specialty-rates/by-name/:specialty - Obtener tarifa por nombre de especialidad
router.get('/by-name/:specialty', getByName);

// GET /api/specialty-rates/:id - Obtener una tarifa por ID
router.get('/:id', getById);

// POST /api/specialty-rates - Crear una nueva tarifa de especialidad
router.post('/', create);

// PUT /api/specialty-rates/:id - Actualizar una tarifa de especialidad
router.put('/:id', update);

// DELETE /api/specialty-rates/:id - Eliminar una tarifa de especialidad (soft delete)
router.delete('/:id', remove);

module.exports = router;
