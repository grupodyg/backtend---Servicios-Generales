const path = require('path');
const { getCurrentTimestamp } = require('../utils/dateUtils');
const pool = require('../config/db');
const { uploadFile, deleteFile, listFiles } = require('../services/wasabiService');

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
      return res.status(404).json({ error: 'Visita técnica no encontrada' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos' });
    }

    console.log(`Subiendo ${req.files.length} fotos para visita ${visitId}`);

    const photosData = [];
    for (let index = 0; index < req.files.length; index++) {
      const file = req.files[index];
      const tipo = req.body.tipo || 'photo';
      const ext = path.extname(file.originalname);
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
    res.status(500).json({ error: 'Error al subir fotos', details: error.message });
  }
};

// Subir una sola foto
const uploadSinglePhoto = async (req, res) => {
  try {
    const { id: visitId } = req.params;

    const exists = await visitExists(visitId);
    if (!exists) {
      return res.status(404).json({ error: 'Visita técnica no encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    const tipo = req.body.tipo || 'photo';
    const ext = path.extname(req.file.originalname);
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
    res.status(500).json({ error: 'Error al subir foto', details: error.message });
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
    res.status(500).json({ error: 'Error al eliminar foto', details: error.message });
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
      uploadedAt: item.lastModified ? item.lastModified.toISOString() : new Date().toISOString()
    }));

    res.json({ data: visitPhotos });
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos', details: error.message });
  }
};

module.exports = {
  uploadPhotos,
  uploadSinglePhoto,
  deletePhoto,
  getPhotosByVisit
};
