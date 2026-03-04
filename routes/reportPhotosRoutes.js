const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadPhotos } = require('../middleware/uploadMiddleware');
const {
  uploadPhotos: uploadController,
  getByReport,
  remove
} = require('../controllers/reportPhotosController');

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN Y PERMISOS
// ========================================
const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// ========================================
// RUTAS
// ========================================

// Upload de fotos (múltiples)
router.post('/report/:reportId', uploadPhotos.array('photos', 10), uploadController);

// Obtener fotos de un reporte
router.get('/report/:reportId', getByReport);

// Eliminar foto
router.delete('/:id', remove);

module.exports = router;
