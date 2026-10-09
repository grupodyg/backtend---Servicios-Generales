const { responderErrorServidor } = require('../utils/httpErrors');
const {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  updateMaterialImage,
  deleteMaterial
} = require('../models/materialsModel');
const { filterSensitiveFields } = require('../utils/filterSensitiveFields');
const { uploadFile, deleteFile } = require('../services/wasabiService');
const { extractS3Key, generateS3Key } = require('../utils/fileUtils');

const getAll = async (req, res) => {
  try {
    const { status = 'available', category_id, low_stock, search } = req.query;
    const materials = await getAllMaterials({ status, category_id, low_stock, search });
    const filteredMaterials = filterSensitiveFields(materials, req.user, 'material');
    res.json(filteredMaterials);
  } catch (error) {
    console.error('Error al obtener materiales:', error);
    responderErrorServidor(res, error, 'Error al obtener materiales');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await getMaterialById(id);
    if (!material) {
      return res.status(404).json({
        error: 'Material no encontrado',
        message: `El material con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla Materiales para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const filteredMaterial = filterSensitiveFields(material, req.user, 'material');
    res.json(filteredMaterial);
  } catch (error) {
    console.error('Error al obtener material:', error);
    responderErrorServidor(res, error, 'Error al obtener material');
  }
};

const create = async (req, res) => {
  try {
    const {
      code, name, category_id, unit, current_stock, minimum_stock,
      unit_price, supplier, warehouse_location
    } = req.body;

    if (!code || !name || !unit) {
      const faltantes = [!code && '«Código»', !name && '«Nombre»', !unit && '«Unidad de medida»'].filter(Boolean);
      return res.status(400).json({
        error: 'Código, nombre y unidad son requeridos',
        message: `Falta completar ${faltantes.join(', ').replace(/, ([^,]*)$/, ' y $1')}. El código, el nombre y la unidad de medida son obligatorios para registrar un material: complétalos en el formulario y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Usuario no autenticado correctamente',
        message: 'No se pudo identificar tu usuario en la sesión actual. Cierra sesión, vuelve a iniciarla e inténtalo de nuevo.',
        tipo: 'sesion'
      });
    }

    let imageUrl = null;
    if (req.file) {
      const key = generateS3Key('materials/images', req.file.originalname);
      imageUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);
    }

    const materialData = {
      code, name, category_id: category_id || null, unit,
      current_stock: current_stock || 0, minimum_stock: minimum_stock || 0,
      unit_price: unit_price || 0, supplier: supplier || null,
      warehouse_location: warehouse_location || null, image_url: imageUrl,
      user_id_registration: req.user.id
    };

    const newMaterial = await createMaterial(materialData);
    const filteredMaterial = filterSensitiveFields(newMaterial, req.user, 'material');
    res.status(201).json({ mensaje: 'Material creado exitosamente', data: filteredMaterial });
  } catch (error) {
    console.error('Error al crear material:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe un material con ese código',
        message: `Ya hay otro material registrado con el código${req.body?.code ? ` «${req.body.code}»` : ''}. El código debe ser único: cámbialo en el campo «Código» del formulario o busca y edita el material existente.`,
        tipo: 'conflicto'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'La categoría especificada no existe',
        message: 'La categoría seleccionada para el material no existe o fue eliminada. Recarga la página y elige otra categoría en el campo «Categoría» del formulario.',
        tipo: 'validacion'
      });
    }
    responderErrorServidor(res, error, 'Error al crear material');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, name, category_id, unit, current_stock, minimum_stock,
      unit_price, supplier, warehouse_location, status, remove_image
    } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Usuario no autenticado correctamente',
        message: 'No se pudo identificar tu usuario en la sesión actual. Cierra sesión, vuelve a iniciarla e inténtalo de nuevo.',
        tipo: 'sesion'
      });
    }

    const existingMaterial = await getMaterialById(id);
    if (!existingMaterial) {
      return res.status(404).json({
        error: 'Material no encontrado',
        message: `El material con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla Materiales para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    let imageUrl = undefined;

    if (req.file) {
      const oldKey = extractS3Key(existingMaterial.image_url);
      if (oldKey) {
        try { await deleteFile(oldKey); } catch (e) { console.warn('No se pudo eliminar imagen anterior:', e.message); }
      }
      const key = generateS3Key('materials/images', req.file.originalname);
      imageUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);
    } else if (remove_image === 'true') {
      const oldKey = extractS3Key(existingMaterial.image_url);
      if (oldKey) {
        try { await deleteFile(oldKey); } catch (e) { console.warn('No se pudo eliminar imagen:', e.message); }
      }
      await updateMaterialImage(id, null);
    }

    const materialData = {
      code, name, category_id, unit, current_stock, minimum_stock,
      unit_price, supplier, warehouse_location, image_url: imageUrl,
      status, user_id_modification: req.user.id
    };

    const updatedMaterial = await updateMaterial(id, materialData);
    const filteredMaterial = filterSensitiveFields(updatedMaterial, req.user, 'material');
    res.json({ mensaje: 'Material actualizado exitosamente', data: filteredMaterial });
  } catch (error) {
    console.error('Error al actualizar material:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe un material con ese código',
        message: `Ya hay otro material registrado con el código${req.body?.code ? ` «${req.body.code}»` : ''}. El código debe ser único: cámbialo en el campo «Código» del formulario o busca y edita el material existente.`,
        tipo: 'conflicto'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'La categoría especificada no existe',
        message: 'La categoría seleccionada para el material no existe o fue eliminada. Recarga la página y elige otra categoría en el campo «Categoría» del formulario.',
        tipo: 'validacion'
      });
    }
    responderErrorServidor(res, error, 'Error al actualizar material');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Usuario no autenticado correctamente',
        message: 'No se pudo identificar tu usuario en la sesión actual. Cierra sesión, vuelve a iniciarla e inténtalo de nuevo.',
        tipo: 'sesion'
      });
    }

    const existingMaterial = await getMaterialById(id);
    if (!existingMaterial) {
      return res.status(404).json({
        error: 'Material no encontrado',
        message: `El material con ID ${id} no existe o fue eliminado por otro usuario. Recarga la pantalla Materiales para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedMaterial = await deleteMaterial(id, req.user.id);
    res.json({ mensaje: 'Material eliminado exitosamente', data: deletedMaterial });
  } catch (error) {
    console.error('Error al eliminar material:', error);
    responderErrorServidor(res, error, 'Error al eliminar material');
  }
};

module.exports = { getAll, getById, create, update, remove };
