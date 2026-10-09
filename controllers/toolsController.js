const { responderErrorServidor } = require('../utils/httpErrors');
const { getAllTools, getToolById, createTool, updateTool, updateToolImage, deleteTool } = require('../models/toolsModel');
const { filterSensitiveFields } = require('../utils/filterSensitiveFields');
const { uploadFile, deleteFile } = require('../services/wasabiService');
const { extractS3Key, generateS3Key } = require('../utils/fileUtils');

const getAll = async (req, res) => {
  try {
    const { status = 'all', assigned_to_user_id, search, category_id } = req.query;
    const tools = await getAllTools({ status, assigned_to_user_id, search, category_id });
    const filteredTools = filterSensitiveFields(tools, req.user, 'tool');
    res.json(filteredTools);
  } catch (error) {
    console.error('Error al obtener herramientas:', error);
    responderErrorServidor(res, error, 'Error al obtener herramientas');
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const tool = await getToolById(id);
    if (!tool) {
      return res.status(404).json({
        error: 'Herramienta no encontrada',
        message: `La herramienta con ID ${id} no existe o fue eliminada por otro usuario. Recarga la pantalla Herramientas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const filteredTool = filterSensitiveFields(tool, req.user, 'tool');
    res.json(filteredTool);
  } catch (error) {
    console.error('Error al obtener herramienta:', error);
    responderErrorServidor(res, error, 'Error al obtener herramienta');
  }
};

const create = async (req, res) => {
  try {
    const { code, name, brand, model, description, quantity, value, admission_date, category_id } = req.body;
    if (!code || !name) {
      return res.status(400).json({
        error: 'Código y nombre son requeridos',
        message: `${!code && !name ? 'Los campos «Código» y «Nombre» están vacíos' : !code ? 'El campo «Código» está vacío' : 'El campo «Nombre» está vacío'}. Ambos son obligatorios para registrar una herramienta: complétalos en el formulario y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    let imageUrl = null;
    if (req.file) {
      const key = generateS3Key('tools/images', req.file.originalname);
      imageUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);
    }

    const toolData = {
      code, name, brand: brand || null, model: model || null, description: description || null,
      quantity: quantity || 1, value: value || null,
      admission_date: admission_date || null, category_id: category_id || null,
      image_url: imageUrl, user_id_registration: req.user.id
    };
    const newTool = await createTool(toolData);
    const filteredTool = filterSensitiveFields(newTool, req.user, 'tool');
    res.status(201).json({ mensaje: 'Herramienta creada exitosamente', data: filteredTool });
  } catch (error) {
    console.error('Error al crear herramienta:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una herramienta con ese código',
        message: `Ya hay otra herramienta registrada con el código${req.body?.code ? ` «${req.body.code}»` : ''}. El código debe ser único: cámbialo en el campo «Código» del formulario o busca y edita la herramienta existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al crear herramienta');
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, brand, model, description, quantity, value, assigned_to_user_id, assignment_date, category_id, status, remove_image } = req.body;
    const existingTool = await getToolById(id);
    if (!existingTool) {
      return res.status(404).json({
        error: 'Herramienta no encontrada',
        message: `La herramienta con ID ${id} no existe o fue eliminada por otro usuario. Recarga la pantalla Herramientas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    let imageUrl = undefined;

    if (req.file) {
      const oldKey = extractS3Key(existingTool.image_url);
      if (oldKey) {
        try { await deleteFile(oldKey); } catch (e) { console.warn('No se pudo eliminar imagen anterior:', e.message); }
      }
      const key = generateS3Key('tools/images', req.file.originalname);
      imageUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);
    } else if (remove_image === 'true') {
      const oldKey = extractS3Key(existingTool.image_url);
      if (oldKey) {
        try { await deleteFile(oldKey); } catch (e) { console.warn('No se pudo eliminar imagen:', e.message); }
      }
      await updateToolImage(id, null);
    }

    const toolData = {
      code, name, brand, model, description, quantity, value,
      assigned_to_user_id, assignment_date, category_id, image_url: imageUrl,
      status, user_id_modification: req.user.id
    };
    const updatedTool = await updateTool(id, toolData);
    const filteredTool = filterSensitiveFields(updatedTool, req.user, 'tool');
    res.json({ mensaje: 'Herramienta actualizada exitosamente', data: filteredTool });
  } catch (error) {
    console.error('Error al actualizar herramienta:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una herramienta con ese código',
        message: `Ya hay otra herramienta registrada con el código${req.body?.code ? ` «${req.body.code}»` : ''}. El código debe ser único: cámbialo en el campo «Código» del formulario o busca y edita la herramienta existente.`,
        tipo: 'conflicto'
      });
    }
    responderErrorServidor(res, error, 'Error al actualizar herramienta');
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingTool = await getToolById(id);
    if (!existingTool) {
      return res.status(404).json({
        error: 'Herramienta no encontrada',
        message: `La herramienta con ID ${id} no existe o fue eliminada por otro usuario. Recarga la pantalla Herramientas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }
    const deletedTool = await deleteTool(id, req.user.id);
    res.json({ mensaje: 'Herramienta eliminada exitosamente', data: deletedTool });
  } catch (error) {
    console.error('Error al eliminar herramienta:', error);
    responderErrorServidor(res, error, 'Error al eliminar herramienta');
  }
};

module.exports = { getAll, getById, create, update, remove };
