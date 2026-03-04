const { getItemsByQuotation, getItemById, createItem, updateItem, deleteItem } = require('../models/quotationItemsModel');
const { filterSensitiveFields } = require('../utils/filterSensitiveFields');

const getByQuotation = async (req, res) => {
  try {
    const { quotation_id } = req.params;
    const items = await getItemsByQuotation(quotation_id);
    const filteredItems = filterSensitiveFields(items, req.user, 'quotation_item');
    res.json(filteredItems);
  } catch (error) {
    console.error('Error al obtener items:', error);
    res.status(500).json({ error: 'Error al obtener items' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getItemById(id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    const filteredItem = filterSensitiveFields(item, req.user, 'quotation_item');
    res.json(filteredItem);
  } catch (error) {
    console.error('Error al obtener item:', error);
    res.status(500).json({ error: 'Error al obtener item' });
  }
};

const create = async (req, res) => {
  try {
    const { quotation_id, item_type, description, code, quantity, unit, unit_price, subtotal, material_description, labor_description, equipment_service, contractor_deliverables } = req.body;
    if (!quotation_id) return res.status(400).json({ error: 'quotation_id es requerido' });
    const itemData = { quotation_id, item_type: item_type || null, description: description || null, code: code || null, quantity: quantity || 0, unit: unit || null, unit_price: unit_price || 0, subtotal: subtotal || 0, material_description: material_description || null, labor_description: labor_description || null, equipment_service: equipment_service || null, contractor_deliverables: contractor_deliverables || null, user_id_registration: req.user.id };
    const newItem = await createItem(itemData);
    const filteredItem = filterSensitiveFields(newItem, req.user, 'quotation_item');
    res.status(201).json({ mensaje: 'Item creado exitosamente', data: filteredItem });
  } catch (error) {
    console.error('Error al crear item:', error);
    res.status(500).json({ error: 'Error al crear item' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingItem = await getItemById(id);
    if (!existingItem) return res.status(404).json({ error: 'Item no encontrado' });
    const itemData = { ...req.body, user_id_modification: req.user.id };
    const updatedItem = await updateItem(id, itemData);
    const filteredItem = filterSensitiveFields(updatedItem, req.user, 'quotation_item');
    res.json({ mensaje: 'Item actualizado exitosamente', data: filteredItem });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingItem = await getItemById(id);
    if (!existingItem) return res.status(404).json({ error: 'Item no encontrado' });
    const deletedItem = await deleteItem(id, req.user.id);
    res.json({ mensaje: 'Item eliminado exitosamente', data: deletedItem });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
};

module.exports = { getByQuotation, getById, create, update, remove };
