const {
  getAllMaterialCategories,
  getMaterialCategoryById,
  createMaterialCategory,
  updateMaterialCategory,
  deleteMaterialCategory
} = require('../models/materialCategoriesModel');

/**
 * Obtener todas las categorías de materiales
 */
const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const categories = await getAllMaterialCategories(status);
    res.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías de materiales:', error);
    res.status(500).json({ error: 'Error al obtener categorías de materiales' });
  }
};

/**
 * Obtener una categoría de materiales por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await getMaterialCategoryById(id);

    if (!category) {
      return res.status(404).json({ error: 'Categoría de materiales no encontrada' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error al obtener categoría de materiales:', error);
    res.status(500).json({ error: 'Error al obtener categoría de materiales' });
  }
};

/**
 * Crear una nueva categoría de materiales
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

    const newCategory = await createMaterialCategory(categoryData);
    res.status(201).json({
      mensaje: 'Categoría de materiales creada exitosamente',
      data: newCategory
    });
  } catch (error) {
    console.error('Error al crear categoría de materiales:', error);

    // Error de nombre o prefijo duplicado
    if (error.code === '23505') {
      if (error.constraint === 'material_categories_name_key') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      if (error.constraint === 'material_categories_prefix_key') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese prefijo' });
      }
    }

    res.status(500).json({ error: 'Error al crear categoría de materiales' });
  }
};

/**
 * Actualizar una categoría de materiales
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prefix, description, status } = req.body;

    // Validar que la categoría existe
    const existingCategory = await getMaterialCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoría de materiales no encontrada' });
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

    const updatedCategory = await updateMaterialCategory(id, categoryData);
    res.json({
      mensaje: 'Categoría de materiales actualizada exitosamente',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error al actualizar categoría de materiales:', error);

    // Error de nombre o prefijo duplicado
    if (error.code === '23505') {
      if (error.constraint === 'material_categories_name_key') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      if (error.constraint === 'material_categories_prefix_key') {
        return res.status(409).json({ error: 'Ya existe una categoría con ese prefijo' });
      }
    }

    res.status(500).json({ error: 'Error al actualizar categoría de materiales' });
  }
};

/**
 * Eliminar una categoría de materiales (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que la categoría existe
    const existingCategory = await getMaterialCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoría de materiales no encontrada' });
    }

    const deletedCategory = await deleteMaterialCategory(id, req.user.id);
    res.json({
      mensaje: 'Categoría de materiales eliminada exitosamente',
      data: deletedCategory
    });
  } catch (error) {
    console.error('Error al eliminar categoría de materiales:', error);
    res.status(500).json({ error: 'Error al eliminar categoría de materiales' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
