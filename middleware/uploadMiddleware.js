const multer = require('multer');
const { crearErrorUsuario } = require('./errorMiddleware');

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
    cb(crearErrorUsuario(
      400,
      'Tipo de archivo no permitido',
      `El archivo «${file.originalname}» no es una imagen (${file.mimetype || 'tipo desconocido'}). En este apartado solo se pueden adjuntar imágenes (JPG, PNG, WEBP, HEIC...). Quítalo de la selección y vuelve a intentarlo.`
    ), false);
  }
};

// Un "documento" es un PDF o cualquier imagen: en obra se adjuntan tanto
// escaneos como fotografías del papel tomadas con el móvil.
const documentFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(crearErrorUsuario(
      400,
      'Tipo de archivo no permitido',
      `El archivo «${file.originalname}» no es un PDF ni una imagen (${file.mimetype || 'tipo desconocido'}). En este apartado solo se pueden adjuntar documentos PDF o imágenes. Conviértelo a PDF o quítalo de la selección y vuelve a intentarlo.`
    ), false);
  }
};

// ========================================
// EXPORTAR CONFIGURACIONES
// ========================================
// Sin `limits`: las fotografías se suben sin comprimir y una foto de móvil
// supera con facilidad cualquier tope fijo. multer sin `limits` no acota
// ni el tamaño ni el número de archivos.
module.exports = {
  uploadPhotos: multer({
    storage: memoryStorage,
    fileFilter: imageFilter
  }),
  uploadDocuments: multer({
    storage: memoryStorage,
    fileFilter: documentFilter
  }),
  uploadTechnicalVisitPhotos: multer({
    storage: memoryStorage,
    fileFilter: imageFilter
  }),
  uploadTechnicalVisitDocuments: multer({
    storage: memoryStorage,
    fileFilter: documentFilter
  })
};
