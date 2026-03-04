const {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  generateQuotationNumber,
  createQuotationWithItems,
  updateQuotationWithItems
} = require('../models/quotationsModel');
const { filterSensitiveFields } = require('../utils/filterSensitiveFields');

const getAll = async (req, res) => {
  try {
    const { status = 'all', search } = req.query;
    const quotations = await getAllQuotations({ status, search });
    const filteredQuotations = filterSensitiveFields(quotations, req.user, 'quotation');
    res.json(filteredQuotations);
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await getQuotationById(id);
    if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });
    const filteredQuotation = filterSensitiveFields(quotation, req.user, 'quotation');
    res.json(filteredQuotation);
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

const create = async (req, res) => {
  try {
    const {
      client, quotation_date, expiration_date, validity_days, payment_conditions,
      profit_margin, has_prices_assigned, subtotal, tax, total, prepared_by,
      observations, technical_visit_id, items
    } = req.body;

    const number = await generateQuotationNumber();

    const quotationData = {
      number, client, quotation_date: quotation_date || null, expiration_date: expiration_date || null,
      validity_days: validity_days || null, payment_conditions: payment_conditions || null,
      profit_margin: profit_margin || 0, has_prices_assigned: has_prices_assigned || false,
      subtotal: subtotal || 0, tax: tax || 0, total: total || 0, prepared_by: prepared_by || null,
      observations: observations || null, technical_visit_id: technical_visit_id || null,
      user_id_registration: req.user.id
    };

    // Si hay items, usar la función con transacción para guardar todo junto
    if (items && items.length > 0) {
      const newQuotation = await createQuotationWithItems(quotationData, items, req.user.id);
      const filteredQuotation = filterSensitiveFields(newQuotation, req.user, 'quotation');
      res.status(201).json({ mensaje: 'Cotización creada exitosamente con items', data: filteredQuotation });
    } else {
      const newQuotation = await createQuotation(quotationData);
      const filteredQuotation = filterSensitiveFields(newQuotation, req.user, 'quotation');
      res.status(201).json({ mensaje: 'Cotización creada exitosamente', data: filteredQuotation });
    }
  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({
      error: 'Error al crear cotización',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingQuotation = await getQuotationById(id);
    if (!existingQuotation) return res.status(404).json({ error: 'Cotización no encontrada' });

    const { items, ...quotationFields } = req.body;

    // Si vienen items, usar la función con transacción
    if (items && items.length > 0) {
      const updatedQuotation = await updateQuotationWithItems(id, quotationFields, items, req.user.id);
      const filteredQuotation = filterSensitiveFields(updatedQuotation, req.user, 'quotation');
      res.json({ mensaje: 'Cotización actualizada exitosamente con items', data: filteredQuotation });
    } else {
      // Solo actualizar la cotización sin tocar items
      const quotationData = { ...quotationFields, user_id_modification: req.user.id };
      const updatedQuotation = await updateQuotation(id, quotationData);
      const filteredQuotation = filterSensitiveFields(updatedQuotation, req.user, 'quotation');
      res.json({ mensaje: 'Cotización actualizada exitosamente', data: filteredQuotation });
    }
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingQuotation = await getQuotationById(id);
    if (!existingQuotation) return res.status(404).json({ error: 'Cotización no encontrada' });
    const deletedQuotation = await deleteQuotation(id, req.user.id);
    res.json({ mensaje: 'Cotización cancelada exitosamente', data: deletedQuotation });
  } catch (error) {
    console.error('Error al cancelar cotización:', error);
    res.status(500).json({ error: 'Error al cancelar cotización' });
  }
};

const getNextNumber = async (req, res) => {
  try {
    const nextNumber = await generateQuotationNumber();
    res.json({ next_number: nextNumber });
  } catch (error) {
    console.error('Error al generar número de cotización:', error);
    res.status(500).json({ error: 'Error al generar número de cotización' });
  }
};

module.exports = { getAll, getById, create, update, remove, getNextNumber };
