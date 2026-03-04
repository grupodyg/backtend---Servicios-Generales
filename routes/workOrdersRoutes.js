const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const verificarAdmin = require('../middleware/adminMiddleware');
const { getAll, getById, create, update, remove, getNextId, checkCanDelete, getHistory } = require('../controllers/workOrdersController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas sin parámetros primero
router.get('/', getAll);
router.post('/', create);
router.get('/next-id', getNextId);

// Rutas con parámetros y sub-rutas ANTES de /:id genérico
// GET /api/work-orders/:id/can-delete - Verificar si se puede eliminar (solo admin)
router.get('/:id/can-delete', verificarAdmin, checkCanDelete);

// GET /api/work-orders/:id/history - Obtener historial de una orden
router.get('/:id/history', getHistory);

// DELETE /api/work-orders/:id - Eliminar orden (solo admin)
router.delete('/:id', verificarAdmin, remove);

// Rutas con parámetro simple al final
router.get('/:id', getById);
router.put('/:id', update);

module.exports = router;
