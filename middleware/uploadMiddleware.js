const multer = require('multer');

// ========================================
// ALMACENAMIENTO EN MEMORIA (para S3)
// ========================================
const memoryStorage = multer.memoryStorage();

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
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }),
  uploadDocuments: multer({
    storage: memoryStorage,
    fileFilter: documentFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  }),
  uploadTechnicalVisitPhotos: multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }),
  uploadTechnicalVisitDocuments: multer({
    storage: memoryStorage,
    fileFilter: documentFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  })
};
