const path = require('path');
const fs = require('fs');
const { getCurrentTimestamp } = require('../utils/dateUtils');
const pool = require('../config/db');

/**
 * Controlador para manejar fotos de visitas técnicas
 * Las fotos se guardan en: /uploads/technical_visits/{visitId}/
 * Las URLs se almacenan en el campo place_status de la visita técnica
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

    // Validar que la visita existe antes de procesar las fotos
    const exists = await visitExists(visitId);
    if (!exists) {
      // Eliminar archivos subidos si la visita no existe
      if (req.files) {
        req.files.forEach(file => {
          const filePath = path.join(__dirname, '../uploads/technical_visits', visitId, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      return res.status(404).json({ error: 'Visita técnica no encontrada' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos' });
    }

    console.log(`📸 Subiendo ${req.files.length} fotos para visita ${visitId}`);

    // Construir array de fotos con sus URLs relativas (incluye subcarpeta del visitId)
    const photosData = req.files.map((file, index) => ({
      id: `${visitId}_${Date.now()}_${index}`,
      url: `/uploads/technical_visits/${visitId}/${file.filename}`,
      name: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: getCurrentTimestamp()
    }));

    console.log('✅ Fotos procesadas:', photosData);

    res.status(201).json({
      mensaje: 'Fotos subidas exitosamente',
      data: photosData
    });
  } catch (error) {
    console.error('❌ Error al subir fotos:', error);
    res.status(500).json({ error: 'Error al subir fotos', details: error.message });
  }
};

// Subir una sola foto
const uploadSinglePhoto = async (req, res) => {
  try {
    const { id: visitId } = req.params;

    // Validar que la visita existe antes de procesar la foto
    const exists = await visitExists(visitId);
    if (!exists) {
      // Eliminar archivo subido si la visita no existe
      if (req.file) {
        const filePath = path.join(__dirname, '../uploads/technical_visits', visitId, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(404).json({ error: 'Visita técnica no encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    console.log(`📸 Subiendo foto para visita ${visitId}: ${req.file.filename}`);

    const photoData = {
      id: `${visitId}_${Date.now()}`,
      url: `/uploads/technical_visits/${visitId}/${req.file.filename}`,
      name: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: getCurrentTimestamp()
    };

    console.log('✅ Foto procesada:', photoData);

    res.status(201).json({
      mensaje: 'Foto subida exitosamente',
      data: photoData
    });
  } catch (error) {
    console.error('❌ Error al subir foto:', error);
    res.status(500).json({ error: 'Error al subir foto', details: error.message });
  }
};

// Eliminar una foto del servidor
const deletePhoto = async (req, res) => {
  try {
    const { id: visitId, filename } = req.params;

    // La foto está en la subcarpeta del visitId
    const filePath = path.join(__dirname, '../uploads/technical_visits', visitId, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Foto eliminada: ${visitId}/${filename}`);
      res.json({ mensaje: 'Foto eliminada exitosamente' });
    } else {
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error al eliminar foto:', error);
    res.status(500).json({ error: 'Error al eliminar foto', details: error.message });
  }
};

// Obtener lista de fotos de una visita técnica desde el filesystem
const getPhotosByVisit = async (req, res) => {
  try {
    const { id: visitId } = req.params;
    // Las fotos ahora están en subcarpetas por visitId
    const uploadsDir = path.join(__dirname, '../uploads/technical_visits', visitId);

    if (!fs.existsSync(uploadsDir)) {
      return res.json({ data: [] });
    }

    const files = fs.readdirSync(uploadsDir);
    const visitPhotos = files
      .filter(file => !file.startsWith('.')) // Ignorar archivos ocultos
      .map(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          id: filename.replace(/\.[^/.]+$/, ''),
          url: `/uploads/technical_visits/${visitId}/${filename}`,
          name: filename,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString()
        };
      });

    res.json({ data: visitPhotos });
  } catch (error) {
    console.error('❌ Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos', details: error.message });
  }
};

module.exports = {
  uploadPhotos,
  uploadSinglePhoto,
  deletePhoto,
  getPhotosByVisit
};
