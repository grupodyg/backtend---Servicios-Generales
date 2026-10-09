const { responderErrorServidor } = require('../utils/httpErrors');
const path = require('path');
const { getCurrentTimestamp } = require('../utils/dateUtils');
const pool = require('../config/db');
const { uploadFile, deleteFile, listFiles } = require('../services/wasabiService');
const { getFileExtension } = require('../utils/fileUtils');

/**
 * Controlador para manejar fotos de visitas técnicas
 * Las fotos se suben a S3: technical-visits/{visitId}/{filename}
 */

// Función auxiliar para validar que la visita existe
const visitExists = async (visitId) => {
  const result = await pool.query(
    'SELECT id FROM technical_visits WHERE id = $1 AND status != $2',
    [visitId, 'deleted']
  );
  return result.rows.length > 0;
};

// Subir múltiples fotos para una visita técnica
const uploadPhotos = async (req, res) => {
  try {
    const { id: visitId } = req.params;

    const exists = await visitExists(visitId);
    if (!exists) {
      return res.status(404).json({
        error: 'Visita técnica no encontrada',
        message: `La visita técnica con ID ${visitId} no existe o fue eliminada, así que no se le pueden adjuntar fotos. Recarga la pantalla Visitas técnicas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No se recibieron archivos',
        message: 'No llegó ninguna foto al servidor. Selecciona al menos una foto antes de pulsar el botón de subir.',
        tipo: 'validacion'
      });
    }

    console.log(`Subiendo ${req.files.length} fotos para visita ${visitId}`);

    const photosData = [];
    for (let index = 0; index < req.files.length; index++) {
      const file = req.files[index];
      const tipo = req.body.tipo || 'photo';
      const ext = getFileExtension(file.originalname, file.mimetype);
      const filename = `${tipo}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
      const key = `technical-visits/${visitId}/${filename}`;

      const url = await uploadFile(file.buffer, key, file.mimetype);

      photosData.push({
        id: `${visitId}_${Date.now()}_${index}`,
        url,
        name: filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: getCurrentTimestamp()
      });
    }

    res.status(201).json({
      mensaje: 'Fotos subidas exitosamente',
      data: photosData
    });
  } catch (error) {
    console.error('Error al subir fotos:', error);
    responderErrorServidor(res, error, 'Error al subir fotos');
  }
};

// Subir una sola foto
const uploadSinglePhoto = async (req, res) => {
  try {
    const { id: visitId } = req.params;

    const exists = await visitExists(visitId);
    if (!exists) {
      return res.status(404).json({
        error: 'Visita técnica no encontrada',
        message: `La visita técnica con ID ${visitId} no existe o fue eliminada, así que no se le pueden adjuntar fotos. Recarga la pantalla Visitas técnicas para ver la información actualizada.`,
        tipo: 'no_encontrado'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No se recibió archivo',
        message: 'No llegó ningún archivo al servidor. Selecciona la foto antes de pulsar el botón de subir.',
        tipo: 'validacion'
      });
    }

    const tipo = req.body.tipo || 'photo';
    const ext = getFileExtension(req.file.originalname, req.file.mimetype);
    const filename = `${tipo}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const key = `technical-visits/${visitId}/${filename}`;

    const url = await uploadFile(req.file.buffer, key, req.file.mimetype);

    const photoData = {
      id: `${visitId}_${Date.now()}`,
      url,
      name: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: getCurrentTimestamp()
    };

    res.status(201).json({
      mensaje: 'Foto subida exitosamente',
      data: photoData
    });
  } catch (error) {
    console.error('Error al subir foto:', error);
    responderErrorServidor(res, error, 'Error al subir foto');
  }
};

// Eliminar una foto de S3
const deletePhoto = async (req, res) => {
  try {
    const { id: visitId, filename } = req.params;
    const key = `technical-visits/${visitId}/${filename}`;

    await deleteFile(key);
    console.log(`Foto eliminada: ${key}`);
    res.json({ mensaje: 'Foto eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    responderErrorServidor(res, error, 'Error al eliminar foto');
  }
};

// Obtener lista de fotos de una visita técnica desde S3
const getPhotosByVisit = async (req, res) => {
  try {
    const { id: visitId } = req.params;
    const prefix = `technical-visits/${visitId}/`;

    const files = await listFiles(prefix);
    const visitPhotos = files.map(item => ({
      id: path.basename(item.key).replace(/\.[^/.]+$/, ''),
      url: item.url,
      name: path.basename(item.key),
      size: item.size,
      uploadedAt: item.lastModified ? item.lastModified.toISOString() : getCurrentTimestamp()
    }));

    res.json({ data: visitPhotos });
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    responderErrorServidor(res, error, 'Error al obtener fotos');
  }
};

module.exports = {
  uploadPhotos,
  uploadSinglePhoto,
  deletePhoto,
  getPhotosByVisit
};
