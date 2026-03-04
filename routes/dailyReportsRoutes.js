const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadDocuments } = require('../middleware/uploadMiddleware');
const { getAll, getById, create, update, remove, uploadDocument, getStatistics } = require('../controllers/dailyReportsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

router.get('/statistics', getStatistics); // Debe ir antes de /:id
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Upload de documento
router.post('/:id/document', uploadDocuments.single('file'), uploadDocument);

module.exports = router;
