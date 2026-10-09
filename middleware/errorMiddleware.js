const multer = require('multer');
const { responderErrorServidor } = require('../utils/httpErrors');

/**
 * Crea un error pensado para mostrarse tal cual al usuario (validaciones de archivos, etc.).
 * El manejador global lo responde con su status y mensaje en lugar de un 500.
 */
const crearErrorUsuario = (status, error, message, tipo = 'validacion') => {
  const err = new Error(message);
  err.status = status;
  err.titulo = error;
  err.tipo = tipo;
  err.esErrorUsuario = true;
  return err;
};

// Explicaciones para los errores de multer (subida de archivos)
const MENSAJES_MULTER = {
  LIMIT_UNEXPECTED_FILE: (err) =>
    `El servidor no esperaba un archivo en el campo «${err.field}». Es un problema de la aplicación, no del archivo: recarga la página (Ctrl+F5) e inténtalo de nuevo; si persiste, avisa al administrador del sistema.`,
  LIMIT_FILE_SIZE: () => 'El archivo es demasiado grande para el servidor. Reduce su tamaño e inténtalo de nuevo.',
  LIMIT_FILE_COUNT: () => 'Se enviaron demasiados archivos a la vez. Súbelos en varias tandas.',
  LIMIT_PART_COUNT: () => 'El formulario tiene demasiadas partes. Súbelo en varias tandas.',
  LIMIT_FIELD_KEY: () => 'Uno de los campos del formulario tiene un nombre demasiado largo.',
  LIMIT_FIELD_VALUE: () => 'Uno de los campos del formulario tiene un valor demasiado largo.',
  LIMIT_FIELD_COUNT: () => 'El formulario tiene demasiados campos.',
  MISSING_FIELD_NAME: () => 'Uno de los archivos se envió sin nombre de campo. Recarga la página e inténtalo de nuevo.'
};

/**
 * Cualquier ruta /api que no exista responde JSON (no la página HTML de Express),
 * para que el frontend pueda explicar el problema.
 */
const manejarRutaNoEncontrada = (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La operación solicitada (${req.method} ${req.originalUrl}) no existe en el servidor. Probablemente la aplicación que tienes abierta está desactualizada: recarga la página (Ctrl+F5) e inténtalo de nuevo. Si persiste, avisa al administrador del sistema.`,
    tipo: 'no_encontrado'
  });
};

/**
 * Manejador de errores de último recurso. Express 5 envía aquí las excepciones no
 * capturadas (incluidas las de funciones async), los errores del parser JSON y los de multer.
 */
// eslint-disable-next-line no-unused-vars
const manejarErrorGlobal = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // JSON mal formado en el cuerpo de la petición
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Datos con formato inválido',
      message: 'El servidor recibió datos con un formato incorrecto y no pudo leerlos. Es un problema de la aplicación: recarga la página e inténtalo de nuevo; si persiste, avisa al administrador del sistema.',
      tipo: 'validacion'
    });
  }

  // Cuerpo demasiado grande
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Datos demasiado grandes',
      message: 'La información enviada supera el tamaño máximo que acepta el servidor. Si estás adjuntando archivos o firmas, súbelos en varias tandas.',
      tipo: 'validacion'
    });
  }

  // Errores de subida de archivos (multer)
  if (err instanceof multer.MulterError) {
    const mensaje = (MENSAJES_MULTER[err.code] || (() => `No se pudo recibir el archivo (${err.code}).`))(err);
    return res.status(400).json({ error: 'Error al recibir el archivo', message: mensaje, tipo: 'validacion' });
  }

  // Errores creados para el usuario (filtros de archivos, etc.)
  if (err.esErrorUsuario) {
    return res.status(err.status || 400).json({
      error: err.titulo || 'Solicitud no válida',
      message: err.message,
      tipo: err.tipo || 'validacion'
    });
  }

  // Errores HTTP "expuestos" de otras librerías (http-errors) con status 4xx
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500 && err.expose) {
    return res.status(status).json({ error: 'Solicitud no válida', message: err.message, tipo: 'validacion' });
  }

  // Errores de BD de datos -> 4xx explicados; el resto -> 500 con código de referencia
  console.error(`Error no controlado en ${req.method} ${req.originalUrl}`);
  return responderErrorServidor(res, err, 'Error al procesar la solicitud');
};

module.exports = { crearErrorUsuario, manejarRutaNoEncontrada, manejarErrorGlobal };
