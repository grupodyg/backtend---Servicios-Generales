const { getAllPayrollSlips, getPayrollSlipById, createPayrollSlip, updatePayrollSlip, deletePayrollSlip } = require('../models/payrollSlipsModel');
const { uploadFile } = require('../services/wasabiService');
const path = require('path');

const getAll = async (req, res) => {
  try {
    const { status, employee_id, period_month, period_year, payment_date_from, payment_date_to } = req.query;
    const payrollSlips = await getAllPayrollSlips({ status, employee_id, period_month, period_year, payment_date_from, payment_date_to });
    res.json(payrollSlips);
  } catch (error) {
    console.error('Error al obtener nóminas:', error);
    res.status(500).json({ error: 'Error al obtener nóminas' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const payrollSlip = await getPayrollSlipById(id);
    if (!payrollSlip) return res.status(404).json({ error: 'Nómina no encontrada' });
    res.json(payrollSlip);
  } catch (error) {
    console.error('Error al obtener nómina:', error);
    res.status(500).json({ error: 'Error al obtener nómina' });
  }
};

const create = async (req, res) => {
  try {
    const {
      employee_id,
      employee_name,
      position,
      year,
      month,
      period,
      base_salary,
      overtime_hours,
      bonuses,
      deductions,
      total_amount,
      file_url,
      file_name,
      file_size,
      uploaded_by,
      status
    } = req.body;

    const payrollSlipData = {
      employee_id,
      employee_name,
      position,
      year,
      month,
      period,
      base_salary,
      overtime_hours,
      bonuses,
      deductions,
      total_amount,
      file_url,
      file_name,
      file_size,
      uploaded_by: uploaded_by || req.user.name,
      status,
      user_id_registration: req.user.id
    };

    const newPayrollSlip = await createPayrollSlip(payrollSlipData);
    res.status(201).json({ mensaje: 'Nómina creada exitosamente', data: newPayrollSlip });
  } catch (error) {
    console.error('Error al crear nómina:', error);
    res.status(500).json({ error: 'Error al crear nómina' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPayrollSlip = await getPayrollSlipById(id);
    if (!existingPayrollSlip) return res.status(404).json({ error: 'Nómina no encontrada' });
    const payrollSlipData = { ...req.body, user_id_modification: req.user.id };
    const updatedPayrollSlip = await updatePayrollSlip(id, payrollSlipData);
    res.json({ mensaje: 'Nómina actualizada exitosamente', data: updatedPayrollSlip });
  } catch (error) {
    console.error('Error al actualizar nómina:', error.message);
    console.error('Stack:', error.stack);
    console.error('Datos recibidos:', req.body);
    res.status(500).json({ error: 'Error al actualizar nómina', details: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPayrollSlip = await getPayrollSlipById(id);
    if (!existingPayrollSlip) return res.status(404).json({ error: 'Nómina no encontrada' });
    const deletedPayrollSlip = await deletePayrollSlip(id, req.user.id);
    res.json({ mensaje: 'Nómina eliminada exitosamente', data: deletedPayrollSlip });
  } catch (error) {
    console.error('Error al eliminar nómina:', error);
    res.status(500).json({ error: 'Error al eliminar nómina' });
  }
};

// ========================================
// SUBIR ARCHIVO DE BOLETA A S3
// ========================================
const uploadFileHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió archivo' });
    }

    const ext = path.extname(req.file.originalname);
    const key = `payroll-slips/${Date.now()}_${Math.random().toString(36).substring(7)}_${req.file.originalname}`;
    const fileUrl = await uploadFile(req.file.buffer, key, req.file.mimetype);

    res.status(201).json({
      mensaje: 'Archivo subido exitosamente',
      data: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error al subir archivo de boleta:', error);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
};

module.exports = { getAll, getById, create, update, remove, uploadFile: uploadFileHandler };
