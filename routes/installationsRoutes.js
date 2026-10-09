const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { getAll, getById, create, update, remove } = require('../controllers/installationsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ error: 'Acceso denegado', message: 'Tu rol de usuario no tiene permiso para usar esta sección. Si necesitas acceder, pide al administrador del sistema que revise el rol asignado a tu usuario.', tipo: 'permiso' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
