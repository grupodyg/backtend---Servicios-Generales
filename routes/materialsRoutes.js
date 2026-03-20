const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadPhotos } = require('../middleware/uploadMiddleware');
const { getAll, getById, create, update, remove } = require('../controllers/materialsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', uploadPhotos.single('image'), create);
router.put('/:id', uploadPhotos.single('image'), update);
router.delete('/:id', remove);

module.exports = router;
