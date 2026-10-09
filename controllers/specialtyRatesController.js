const { responderErrorServidor } = require('../utils/httpErrors');
const {
  getAllSpecialtyRates,
  getSpecialtyRateById,
  getSpecialtyRateByName,
  createSpecialtyRate,
  updateSpecialtyRate,
  deleteSpecialtyRate
} = require('../models/specialtyRatesModel');

/**
 * Obtener todas las tarifas de especialidad
 */
const getAll = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const rates = await getAllSpecialtyRates(status);
    res.json(rates);
  } catch (error) {
    console.error('Error al obtener tarifas de especialidad:', error);
    responderErrorServidor(res, error, 'Error al obtener tarifas de especialidad');
  }
};

/**
 * Obtener una tarifa de especialidad por ID
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const rate = await getSpecialtyRateById(id);

    if (!rate) {
      return res.status(404).json({
        error: 'Tarifa de especialidad no encontrada',
        message: `La tarifa de especialidad con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de tarifas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    res.json(rate);
  } catch (error) {
    console.error('Error al obtener tarifa de especialidad:', error);
    responderErrorServidor(res, error, 'Error al obtener tarifa de especialidad');
  }
};

/**
 * Obtener una tarifa por nombre de especialidad
 */
const getByName = async (req, res) => {
  try {
    const { specialty } = req.params;
    const rate = await getSpecialtyRateByName(specialty);

    if (!rate) {
      return res.status(404).json({
        error: 'No se encontró tarifa para esa especialidad',
        message: `No hay una tarifa activa registrada para la especialidad «${specialty}», así que no se puede calcular su costo. Registra la tarifa diaria de esa especialidad en la configuración de tarifas (o pide al administrador que lo haga), o elige otra especialidad.`,
        tipo: 'no_encontrado'
      });
    }

    res.json(rate);
  } catch (error) {
    console.error('Error al obtener tarifa por especialidad:', error);
    responderErrorServidor(res, error, 'Error al obtener tarifa por especialidad');
  }
};

/**
 * Crear una nueva tarifa de especialidad
 */
const create = async (req, res) => {
  try {
    const { specialty, description, daily_rate, hourly_rate } = req.body;

    // Validaciones
    if (!specialty || specialty.trim() === '') {
      return res.status(400).json({
        error: 'La especialidad es requerida',
        message: 'El campo «Especialidad» está vacío. Escribe el nombre de la especialidad (por ejemplo, «Electricista») y vuelve a guardar.',
        tipo: 'validacion'
      });
    }

    if (!daily_rate || daily_rate <= 0) {
      return res.status(400).json({
        error: 'La tarifa diaria es requerida y debe ser mayor a 0',
        message: `El campo «Tarifa diaria» ${daily_rate ? `tiene el valor ${daily_rate}, pero` : 'está vacío y'} debe ser un monto mayor que 0. Corrígelo y vuelve a guardar.`,
        tipo: 'validacion'
      });
    }

    const rateData = {
      specialty: specialty.trim(),
      description: description || null,
      daily_rate: parseFloat(daily_rate),
      hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
      user_id_registration: req.user?.id || null
    };

    const newRate = await createSpecialtyRate(rateData);
    res.status(201).json({
      mensaje: 'Tarifa de especialidad creada exitosamente',
      data: newRate
    });
  } catch (error) {
    console.error('Error al crear tarifa de especialidad:', error);

    // Error de especialidad duplicada
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una tarifa para esa especialidad',
        message: `Ya existe una tarifa para la especialidad «${req.body?.specialty?.trim()}». Cada especialidad solo puede tener una tarifa: edita la tarifa existente en lugar de crear otra, o cambia el nombre de la especialidad.`,
        tipo: 'conflicto'
      });
    }

    responderErrorServidor(res, error, 'Error al crear tarifa de especialidad');
  }
};

/**
 * Actualizar una tarifa de especialidad
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { specialty, description, daily_rate, hourly_rate, status } = req.body;

    // Validar que la tarifa existe
    const existingRate = await getSpecialtyRateById(id);
    if (!existingRate) {
      return res.status(404).json({
        error: 'Tarifa de especialidad no encontrada',
        message: `La tarifa de especialidad con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de tarifas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    const rateData = {
      specialty: specialty ? specialty.trim() : undefined,
      description,
      daily_rate: daily_rate ? parseFloat(daily_rate) : undefined,
      hourly_rate: hourly_rate !== undefined ? (hourly_rate ? parseFloat(hourly_rate) : null) : undefined,
      status,
      user_id_modification: req.user?.id || null
    };

    const updatedRate = await updateSpecialtyRate(id, rateData);
    res.json({
      mensaje: 'Tarifa de especialidad actualizada exitosamente',
      data: updatedRate
    });
  } catch (error) {
    console.error('Error al actualizar tarifa de especialidad:', error);

    // Error de especialidad duplicada
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ya existe una tarifa para esa especialidad',
        message: `Ya existe una tarifa para la especialidad «${req.body?.specialty?.trim()}». Cada especialidad solo puede tener una tarifa: edita la tarifa existente en lugar de crear otra, o cambia el nombre de la especialidad.`,
        tipo: 'conflicto'
      });
    }

    responderErrorServidor(res, error, 'Error al actualizar tarifa de especialidad');
  }
};

/**
 * Eliminar una tarifa de especialidad (soft delete)
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que la tarifa existe
    const existingRate = await getSpecialtyRateById(id);
    if (!existingRate) {
      return res.status(404).json({
        error: 'Tarifa de especialidad no encontrada',
        message: `La tarifa de especialidad con ID ${id} no existe o fue eliminada por otro usuario. Recarga la lista de tarifas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    const deletedRate = await deleteSpecialtyRate(id, req.user?.id || null);
    res.json({
      mensaje: 'Tarifa de especialidad eliminada exitosamente',
      data: deletedRate
    });
  } catch (error) {
    console.error('Error al eliminar tarifa de especialidad:', error);
    responderErrorServidor(res, error, 'Error al eliminar tarifa de especialidad');
  }
};

module.exports = {
  getAll,
  getById,
  getByName,
  create,
  update,
  remove
};
