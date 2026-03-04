const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/authMiddleware');
const { getByClient, getById, create, update, remove } = require('../controllers/clientContactsController');

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.role_id;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

router.use(verificarToken);
router.use(verificarRolesPermitidos);

// GET /api/client-contacts/client/:client_id - Obtener contactos de un cliente
router.get('/client/:client_id', getByClient);

// GET /api/client-contacts/:id - Obtener un contacto por ID
router.get('/:id', getById);

// POST /api/client-contacts - Crear un nuevo contacto
router.post('/', create);

// PUT /api/client-contacts/:id - Actualizar un contacto
router.put('/:id', update);

// DELETE /api/client-contacts/:id - Eliminar un contacto
router.delete('/:id', remove);

module.exports = router;
