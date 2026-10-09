const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const verificarAdmin = require('../middleware/adminMiddleware');
const { getAll, getById, create, update, remove, getNextId, checkCanDelete, getHistory } = require('../controllers/workOrdersController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ error: 'Acceso denegado', message: 'Tu rol de usuario no tiene permiso para usar esta sección. Si necesitas acceder, pide al administrador del sistema que revise el rol asignado a tu usuario.', tipo: 'permiso' });
  }
  next();
};

// Dar inicio a una orden: misma regla que la ruta /ordenes/nueva del frontend.
// Se usa el rol normalizado del token (authModel) para no depender de los IDs de la tabla roles.
const ROLES_CREAN_ORDENES = ['admin', 'supervisor'];

const verificarPuedeCrearOrden = (req, res, next) => {
  if (!ROLES_CREAN_ORDENES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado', message: 'Solo un Administrador o un Supervisor puede crear órdenes de trabajo. Pide a uno de ellos que registre la orden.', tipo: 'permiso' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Rutas sin parámetros primero
router.get('/', getAll);
// POST /api/work-orders - Crear orden (solo admin y supervisor)
router.post('/', verificarPuedeCrearOrden, create);
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
