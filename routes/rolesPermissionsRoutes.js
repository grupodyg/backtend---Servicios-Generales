const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { getByRole, assign, remove, sync } = require('../controllers/rolesPermissionsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// GET /api/roles-permissions/:role_id - Obtener permisos de un rol
router.get('/:role_id', getByRole);

// POST /api/roles-permissions - Asignar permiso a rol
router.post('/', assign);

// DELETE /api/roles-permissions/:role_id/:permission_id - Remover permiso de rol
router.delete('/:role_id/:permission_id', remove);

// PUT /api/roles-permissions/:role_id/sync - Sincronizar permisos de un rol
router.put('/:role_id/sync', sync);

module.exports = router;
