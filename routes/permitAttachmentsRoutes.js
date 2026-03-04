const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { getAll, getById, create, update, remove, uploadFile } = require('../controllers/permitAttachmentsController');
const { uploadDocuments } = require('../middleware/uploadMiddleware');

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
router.post('/', create);
router.post('/upload', uploadDocuments.single('file'), uploadFile);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
