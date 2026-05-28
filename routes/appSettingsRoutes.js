const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { uploadPhotos } = require('../middleware/uploadMiddleware');
const {
  getPublic,
  updateTexts,
  uploadLogo,
  resetLogo
} = require('../controllers/appSettingsController');

const ADMIN_ROLE_ID = 1;

const requireAdmin = (req, res, next) => {
  if (req.user?.role_id !== ADMIN_ROLE_ID) {
    return res.status(403).json({ mensaje: 'Acceso denegado: solo administrador' });
  }
  next();
};

// Endpoint público — necesario para que el login muestre el branding sin autenticar
router.get('/public', getPublic);

// Endpoints protegidos — solo administrador
router.put('/', verificarToken, requireAdmin, updateTexts);
router.post('/logo', verificarToken, requireAdmin, uploadPhotos.single('file'), uploadLogo);
router.delete('/logo', verificarToken, requireAdmin, resetLogo);

module.exports = router;
