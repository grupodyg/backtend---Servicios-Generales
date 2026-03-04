const { createReportPhoto, getPhotosByReportId, deletePhoto } = require('../models/reportPhotosModel');
const { getDailyReportById } = require('../models/dailyReportsModel');
const { addWorkOrderHistoryEntry } = require('../models/workOrdersModel');

// ========================================
// SUBIR FOTOS A UN REPORTE
// ========================================
const uploadPhotos = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { photoType } = req.body; // 'before' o 'after'

    // Validar que photoType sea válido
    const validPhotoTypes = ['before', 'after'];
    if (!photoType || !validPhotoTypes.includes(photoType)) {
      return res.status(400).json({
        error: 'Tipo de foto inválido. Debe ser "before" o "after"'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    // Obtener el reporte para conocer el order_id
    const report = await getDailyReportById(reportId);

    const uploadedPhotos = [];

    for (const file of req.files) {
      const photoUrl = `/uploads/work_orders/reports/work_orders_reports_photos/${file.filename}`;

      const photoData = {
        report_id: reportId,
        photo_type: photoType,
        url: photoUrl,
        name: file.originalname,
        size: file.size,
        user_id_registration: req.user.id
      };

      const savedPhoto = await createReportPhoto(photoData);
      uploadedPhotos.push(savedPhoto);
    }

    // Registrar en historial de la orden si el reporte está asociado a una orden
    if (report && report.order_id) {
      const photoTypeLabel = photoType === 'before' ? 'antes' : 'después';
      await addWorkOrderHistoryEntry({
        work_order_id: report.order_id,
        user_id: req.user.id,
        action_type: 'photos_uploaded',
        action_description: `${uploadedPhotos.length} fotografía(s) ${photoTypeLabel} agregada(s) al reporte ${reportId}`,
        field_changed: 'report_photos',
        new_value: JSON.stringify({
          report_id: reportId,
          photo_type: photoType,
          count: uploadedPhotos.length
        }),
        ip_address: req.ip
      });
    }

    res.status(201).json({
      mensaje: 'Fotos subidas exitosamente',
      data: uploadedPhotos
    });
  } catch (error) {
    console.error('Error al subir fotos:', error);
    res.status(500).json({ error: 'Error al crear fotos' });
  }
};

// ========================================
// OBTENER FOTOS DE UN REPORTE
// ========================================
const getByReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const photos = await getPhotosByReportId(reportId);
    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
};

// ========================================
// ELIMINAR FOTO
// ========================================
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPhoto = await deletePhoto(id, req.user.id);
    res.json({ mensaje: 'Foto eliminada exitosamente', data: deletedPhoto });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ error: 'Error al eliminar foto' });
  }
};

module.exports = {
  uploadPhotos,
  getByReport,
  remove
};
