const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { getByQuotation, getById, create, update, remove } = require('../controllers/quotationItemsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

router.get('/quotation/:quotation_id', getByQuotation);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
