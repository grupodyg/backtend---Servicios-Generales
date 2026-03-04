const { getAllEmployeePermits, getEmployeePermitById, createEmployeePermit, updateEmployeePermit, deleteEmployeePermit, generatePermitId } = require('../models/employeePermitsModel');

const getAll = async (req, res) => {
  try {
    const { status = 'all', employee_id, permit_type } = req.query;
    const permits = await getAllEmployeePermits({ status, employee_id, permit_type });
    res.json(permits);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const permit = await getEmployeePermitById(id);
    if (!permit) return res.status(404).json({ error: 'Permiso no encontrado' });
    res.json(permit);
  } catch (error) {
    console.error('Error al obtener permiso:', error);
    res.status(500).json({ error: 'Error al obtener permiso' });
  }
};

const create = async (req, res) => {
  try {
    const { employee_id, employee_name, permit_type, start_date, end_date, days_requested, reason, attached_documentation } = req.body;
    const id = await generatePermitId();
    const permitData = { id, employee_id: employee_id || null, employee_name: employee_name || null, permit_type: permit_type || null, start_date: start_date || null, end_date: end_date || null, days_requested: days_requested || null, reason: reason || null, attached_documentation: attached_documentation || null, user_id_registration: req.user.id };
    const newPermit = await createEmployeePermit(permitData);
    res.status(201).json({ mensaje: 'Permiso creado exitosamente', data: newPermit });
  } catch (error) {
    console.error('Error al crear permiso:', error);
    res.status(500).json({ error: 'Error al crear permiso' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPermit = await getEmployeePermitById(id);
    if (!existingPermit) return res.status(404).json({ error: 'Permiso no encontrado' });
    const permitData = { ...req.body, user_id_modification: req.user.id };
    const updatedPermit = await updateEmployeePermit(id, permitData);
    res.json({ mensaje: 'Permiso actualizado exitosamente', data: updatedPermit });
  } catch (error) {
    console.error('Error al actualizar permiso:', error);
    res.status(500).json({ error: 'Error al actualizar permiso' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPermit = await getEmployeePermitById(id);
    if (!existingPermit) return res.status(404).json({ error: 'Permiso no encontrado' });
    const deletedPermit = await deleteEmployeePermit(id, req.user.id);
    res.json({ mensaje: 'Permiso cancelado exitosamente', data: deletedPermit });
  } catch (error) {
    console.error('Error al cancelar permiso:', error);
    res.status(500).json({ error: 'Error al cancelar permiso' });
  }
};

const getNextId = async (req, res) => {
  try {
    const nextId = await generatePermitId();
    res.json({ next_id: nextId });
  } catch (error) {
    console.error('Error al generar ID:', error);
    res.status(500).json({ error: 'Error al generar ID' });
  }
};

module.exports = { getAll, getById, create, update, remove, getNextId };
