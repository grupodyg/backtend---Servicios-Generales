const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  create,
  update,
  remove
} = require('../controllers/paymentConditionsController');

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

// GET /api/payment-conditions - Obtener todas las condiciones de pago
router.get('/', getAll);

// GET /api/payment-conditions/:id - Obtener una condición de pago por ID
router.get('/:id', getById);

// POST /api/payment-conditions - Crear una nueva condición de pago
router.post('/', create);

// PUT /api/payment-conditions/:id - Actualizar una condición de pago
router.put('/:id', update);

// DELETE /api/payment-conditions/:id - Eliminar una condición de pago (soft delete)
router.delete('/:id', remove);

module.exports = router;
