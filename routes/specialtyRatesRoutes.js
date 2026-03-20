const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const verificarAdmin = require('../middleware/adminMiddleware');
const {
  getAll,
  getById,
  getByName,
  create,
  update,
  remove
} = require('../controllers/specialtyRatesController');

// Todas las rutas requieren autenticacion + ser administrador
// Solo el admin puede ver y gestionar tarifas/precios
router.use(verificarToken);
router.use(verificarAdmin);

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
