const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const verificarAdmin = require('../middleware/adminMiddleware');
const { getAll, getById, create, update, remove, getNextId, checkCanDelete } = require('../controllers/technicalVisitsController');
const { uploadPhotos, uploadSinglePhoto, deletePhoto, getPhotosByVisit } = require('../controllers/technicalVisitPhotosController');
const { uploadTechnicalVisitPhotos, uploadTechnicalVisitDocuments } = require('../middleware/uploadMiddleware');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// Logging middleware
router.use((req, res, next) => {
  console.log(`📨 ${req.method} /api/technical-visits${req.url}`);
  next();
});

// Rutas sin parámetros primero
router.get('/', getAll);
router.post('/', create);
router.get('/next-id', getNextId);

// Rutas con parámetros y sub-rutas ANTES de /:id genérico
// GET /api/technical-visits/:id/can-delete - Verificar si se puede eliminar (solo admin)
router.get('/:id/can-delete', verificarAdmin, checkCanDelete);

// ========================================
// RUTAS DE FOTOS PARA VISITAS TÉCNICAS
// ========================================
// POST /api/technical-visits/:id/photos - Subir múltiples fotos
router.post('/:id/photos', uploadTechnicalVisitPhotos.array('photos', 20), uploadPhotos);

// POST /api/technical-visits/:id/photo - Subir una sola foto
router.post('/:id/photo', uploadTechnicalVisitPhotos.single('photo'), uploadSinglePhoto);

// GET /api/technical-visits/:id/photos - Obtener fotos de una visita
router.get('/:id/photos', getPhotosByVisit);

// DELETE /api/technical-visits/:id/photos/:filename - Eliminar una foto
router.delete('/:id/photos/:filename', deletePhoto);

// DELETE /api/technical-visits/:id - Eliminar visita (solo admin)
router.delete('/:id', verificarAdmin, remove);

// Rutas con parámetro simple al final
router.get('/:id', getById);
router.put('/:id', update);

module.exports = router;
