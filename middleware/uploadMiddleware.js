const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========================================
// CONFIGURACIÓN PARA FOTOS DE REPORTES
// ========================================
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/work_orders/reports/work_orders_reports_photos');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// ========================================
// CONFIGURACIÓN PARA VISITAS TÉCNICAS
// ========================================
const technicalVisitPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Crear subcarpeta por ID de visita para mejor organización
    const visitId = req.params.id || req.body.visitId || 'sin_asignar';
    const uploadPath = path.join(__dirname, '../uploads/technical_visits', visitId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Formato: {tipo}_{timestamp}_{random}.{ext}
    const tipo = req.body.tipo || 'photo';
    const uniqueName = `${tipo}_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// ========================================
// CONFIGURACIÓN PARA DOCUMENTOS
// ========================================
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/work_orders/reports/work_orders_reports_documents');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const docType = req.body.docType || 'document';
    const uniqueName = `${docType}_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// ========================================
// FILTROS DE ARCHIVO
// ========================================
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo PDF o imágenes'), false);
  }
};

// ========================================
// EXPORTAR CONFIGURACIONES
// ========================================
module.exports = {
  uploadPhotos: multer({
    storage: photoStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }),
  uploadDocuments: multer({
    storage: documentStorage,
    fileFilter: documentFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  }),
  uploadTechnicalVisitPhotos: multer({
    storage: technicalVisitPhotoStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }),
  uploadTechnicalVisitDocuments: multer({
    storage: technicalVisitPhotoStorage,
    fileFilter: documentFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  })
};
