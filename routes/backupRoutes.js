const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const verificarAdmin = require('../middleware/adminMiddleware');
const backupController = require('../controllers/backupController');

// Todas las rutas requieren autenticación + rol administrador
router.use(verificarToken, verificarAdmin);

// POST /api/backups - Crear un nuevo backup
router.post('/', backupController.createBackup);

// GET /api/backups - Listar todos los backups
router.get('/', backupController.listBackups);

// GET /api/backups/download/:filename - Descargar un backup
router.get('/download/:filename', backupController.downloadBackup);

// DELETE /api/backups/:filename - Eliminar un backup
router.delete('/:filename', backupController.deleteBackup);

module.exports = router;
