const { responderErrorServidor } = require('../utils/httpErrors');
const {
  getAllToolCategories,
  getToolCategoryById,
  createToolCategory,
  updateToolCategory,
  deleteToolCategory
} = require('../models/toolCategoriesModel');

/**
 * Obtener todas las categorías de herramientas
 */
const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const categories = await getAllToolCategories(status);
    res.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías de herramientas:', error);
    responderErrorServidor(res, error, 'Error al obtener categorías de herramientas');
  }
};

/**
 * Obtener una categoría de herramientas por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await getToolCategoryById(id);

    if (!category) {
      return res.status(404).json({
        error: 'Categoría de herramientas no encontrada',
        message: `La categoría de herramientas con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de categorías para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    res.json(category);
  } catch (error) {
    console.error('Error al obtener categoría de herramientas:', error);
    responderErrorServidor(res, error, 'Error al obtener categoría de herramientas');
  }
};

/**
 * Crear una nueva categoría de herramientas
 */
const create = async (req, res) => {
  try {
    const { name, prefix, description } = req.body;

    // Validaciones
    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'El nombre es requerido',
        message: 'El campo «Nombre» de la categoría está vacío. Escribe un nombre para la categoría y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    if (!prefix || prefix.trim() === '') {
      return res.status(400).json({
        error: 'El prefijo es requerido',
        message: 'El campo «Prefijo» de la categoría está vacío. El prefijo (de 1 a 4 caracteres, por ejemplo «ELEC») se usa para generar los códigos: escríbelo y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    if (prefix.trim().length > 4) {
      return res.status(400).json({
        error: 'El prefijo no puede tener más de 4 caracteres',
        message: `El prefijo «${prefix.trim()}» tiene ${prefix.trim().length} caracteres y el máximo permitido es 4. Acórtalo en el campo «Prefijo» de la categoría y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    const categoryData = {
      name: name.trim(),
      prefix: prefix.trim().toUpperCase(),
      description: description || null,
      user_id_registration: req.user.id
    };

    const newCategory = await createToolCategory(categoryData);
    res.status(201).json({
      mensaje: 'Categoría de herramientas creada exitosamente',
      data: newCategory
    });
  } catch (error) {
    console.error('Error al crear categoría de herramientas:', error);

    // Error de nombre o prefijo duplicado
    if (error.code === '23505') {
      if (error.constraint === 'tool_categories_name_key') {
        return res.status(409).json({
          error: 'Ya existe una categoría con ese nombre',
          message: `Ya existe una categoría de herramientas llamada «${req.body?.name?.trim()}» (también cuentan las categorías eliminadas). Elige otro nombre en el formulario de la categoría o edita la categoría existente.`,
          tipo: 'conflicto'
        });
      }
      if (error.constraint === 'tool_categories_prefix_key') {
        return res.status(409).json({
          error: 'Ya existe una categoría con ese prefijo',
          message: `Ya existe una categoría de herramientas con el prefijo «${req.body?.prefix?.trim().toUpperCase()}» (también cuentan las categorías eliminadas). Elige otro prefijo en el formulario de la categoría o edita la categoría existente.`,
          tipo: 'conflicto'
        });
      }
    }

    responderErrorServidor(res, error, 'Error al crear categoría de herramientas');
  }
};

/**
 * Actualizar una categoría de herramientas
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prefix, description, status } = req.body;

    // Validar que la categoría existe
    const existingCategory = await getToolCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({
        error: 'Categoría de herramientas no encontrada',
        message: `La categoría de herramientas con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de categorías para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    // Validar prefijo si se proporciona
    if (prefix && prefix.trim().length > 4) {
      return res.status(400).json({
        error: 'El prefijo no puede tener más de 4 caracteres',
        message: `El prefijo «${prefix.trim()}» tiene ${prefix.trim().length} caracteres y el máximo permitido es 4. Acórtalo en el campo «Prefijo» de la categoría y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    const categoryData = {
      name: name ? name.trim() : undefined,
      prefix: prefix ? prefix.trim().toUpperCase() : undefined,
      description,
      status,
      user_id_modification: req.user.id
    };

    const updatedCategory = await updateToolCategory(id, categoryData);
    res.json({
      mensaje: 'Categoría de herramientas actualizada exitosamente',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error al actualizar categoría de herramientas:', error);

    // Error de nombre o prefijo duplicado
    if (error.code === '23505') {
      if (error.constraint === 'tool_categories_name_key') {
        return res.status(409).json({
          error: 'Ya existe una categoría con ese nombre',
          message: `Ya existe una categoría de herramientas llamada «${req.body?.name?.trim()}» (también cuentan las categorías eliminadas). Elige otro nombre en el formulario de la categoría o edita la categoría existente.`,
          tipo: 'conflicto'
        });
      }
      if (error.constraint === 'tool_categories_prefix_key') {
        return res.status(409).json({
          error: 'Ya existe una categoría con ese prefijo',
          message: `Ya existe una categoría de herramientas con el prefijo «${req.body?.prefix?.trim().toUpperCase()}» (también cuentan las categorías eliminadas). Elige otro prefijo en el formulario de la categoría o edita la categoría existente.`,
          tipo: 'conflicto'
        });
      }
    }

    responderErrorServidor(res, error, 'Error al actualizar categoría de herramientas');
  }
};

/**
 * Eliminar una categoría de herramientas (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que la categoría existe
    const existingCategory = await getToolCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({
        error: 'Categoría de herramientas no encontrada',
        message: `La categoría de herramientas con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de categorías para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    const deletedCategory = await deleteToolCategory(id, req.user.id);
    res.json({
      mensaje: 'Categoría de herramientas eliminada exitosamente',
      data: deletedCategory
    });
  } catch (error) {
    console.error('Error al eliminar categoría de herramientas:', error);
    responderErrorServidor(res, error, 'Error al eliminar categoría de herramientas');
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
