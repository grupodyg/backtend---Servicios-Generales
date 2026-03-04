const {
  getAllPaymentConditions,
  getPaymentConditionById,
  createPaymentCondition,
  updatePaymentCondition,
  deletePaymentCondition
} = require('../models/paymentConditionsModel');

/**
 * Obtener todas las condiciones de pago
 */
const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const paymentConditions = await getAllPaymentConditions(status);
    res.json(paymentConditions);
  } catch (error) {
    console.error('Error al obtener condiciones de pago:', error);
    res.status(500).json({ error: 'Error al obtener condiciones de pago' });
  }
};

/**
 * Obtener una condición de pago por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentCondition = await getPaymentConditionById(id);

    if (!paymentCondition) {
      return res.status(404).json({ error: 'Condición de pago no encontrada' });
    }

    res.json(paymentCondition);
  } catch (error) {
    console.error('Error al obtener condición de pago:', error);
    res.status(500).json({ error: 'Error al obtener condición de pago' });
  }
};

/**
 * Crear una nueva condición de pago
 */
const create = async (req, res) => {
  try {
    const { name, description, days_term, initial_percentage, display_order } = req.body;

    // Validaciones
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const paymentConditionData = {
      name: name.trim(),
      description: description || null,
      days_term: days_term || null,
      initial_percentage: initial_percentage || null,
      display_order: display_order || 0,
      user_id_registration: req.user.id
    };

    const newPaymentCondition = await createPaymentCondition(paymentConditionData);
    res.status(201).json({
      mensaje: 'Condición de pago creada exitosamente',
      data: newPaymentCondition
    });
  } catch (error) {
    console.error('Error al crear condición de pago:', error);

    // Error de nombre duplicado
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una condición de pago con ese nombre' });
    }

    res.status(500).json({ error: 'Error al crear condición de pago' });
  }
};

/**
 * Actualizar una condición de pago
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, days_term, initial_percentage, display_order, status } = req.body;

    // Validar que la condición de pago existe
    const existingPaymentCondition = await getPaymentConditionById(id);
    if (!existingPaymentCondition) {
      return res.status(404).json({ error: 'Condición de pago no encontrada' });
    }

    const paymentConditionData = {
      name: name ? name.trim() : undefined,
      description,
      days_term,
      initial_percentage,
      display_order,
      status,
      user_id_modification: req.user.id
    };

    const updatedPaymentCondition = await updatePaymentCondition(id, paymentConditionData);
    res.json({
      mensaje: 'Condición de pago actualizada exitosamente',
      data: updatedPaymentCondition
    });
  } catch (error) {
    console.error('Error al actualizar condición de pago:', error);

    // Error de nombre duplicado
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una condición de pago con ese nombre' });
    }

    res.status(500).json({ error: 'Error al actualizar condición de pago' });
  }
};

/**
 * Eliminar una condición de pago (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que la condición de pago existe
    const existingPaymentCondition = await getPaymentConditionById(id);
    if (!existingPaymentCondition) {
      return res.status(404).json({ error: 'Condición de pago no encontrada' });
    }

    const deletedPaymentCondition = await deletePaymentCondition(id, req.user.id);
    res.json({
      mensaje: 'Condición de pago eliminada exitosamente',
      data: deletedPaymentCondition
    });
  } catch (error) {
    console.error('Error al eliminar condición de pago:', error);
    res.status(500).json({ error: 'Error al eliminar condición de pago' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
