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
    res.status(500).json({ error: 'Error al obtener categorías de herramientas' });
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
      return res.status(404).json({ error: 'Categoría de herramientas no encontrada' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error al obtener categoría de herramientas:', error);
    res.status(500).json({ error: 'Error al obtener categoría de herramientas' });
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
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    if (!prefix || prefix.trim() === '') {
      return res.status(400).json({ error: 'El prefijo es requerido' });
    }

    if (prefix.trim().length > 4) {
      return res.status(400).json({ error: 'El prefijo no puede tener más de 4 caracteres' });
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
        return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      if (error.constraint === 'tool_categories_prefix_key') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese prefijo' });
      }
    }

    res.status(500).json({ error: 'Error al crear categoría de herramientas' });
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
      return res.status(404).json({ error: 'Categoría de herramientas no encontrada' });
    }

    // Validar prefijo si se proporciona
    if (prefix && prefix.trim().length > 4) {
      return res.status(400).json({ error: 'El prefijo no puede tener más de 4 caracteres' });
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
        return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      if (error.constraint === 'tool_categories_prefix_key') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese prefijo' });
      }
    }

    res.status(500).json({ error: 'Error al actualizar categoría de herramientas' });
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
      return res.status(404).json({ error: 'Categoría de herramientas no encontrada' });
    }

    const deletedCategory = await deleteToolCategory(id, req.user.id);
    res.json({
      mensaje: 'Categoría de herramientas eliminada exitosamente',
      data: deletedCategory
    });
  } catch (error) {
    console.error('Error al eliminar categoría de herramientas:', error);
    res.status(500).json({ error: 'Error al eliminar categoría de herramientas' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
