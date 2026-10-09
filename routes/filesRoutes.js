const { responderErrorServidor } = require('../utils/httpErrors');
const express = require('express');
const router = express.Router();
const { getFile } = require('../services/wasabiService');

// Proxy para servir archivos desde S3
// GET /api/files/{key} -> stream del archivo desde Wasabi S3
router.get('/*key', async (req, res) => {
  try {
    // req.params.key contiene todo después de /api/files/
    const keyParam = req.params.key;
    const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;

    if (!key) {
      return res.status(400).json({
        error: 'Archivo no indicado',
        message: 'No se indicó qué archivo abrir. Es un problema de la aplicación, no de tus datos: recarga la página e inténtalo de nuevo; si persiste, avisa al administrador del sistema.',
        tipo: 'validacion'
      });
    }

    const s3Response = await getFile(key);

    // Establecer headers de respuesta
    if (s3Response.ContentType) {
      res.setHeader('Content-Type', s3Response.ContentType);
    }
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength);
    }

    // Cache por 1 hora
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream del body al cliente
    s3Response.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        error: 'Archivo no encontrado',
        message: 'El archivo solicitado ya no existe en el almacenamiento: puede que se haya eliminado o reemplazado. Recarga la página; si el archivo sigue apareciendo y no se puede abrir, vuelve a adjuntarlo.',
        tipo: 'no_encontrado'
      });
    }
    console.error('Error al servir archivo desde S3:', error);
    responderErrorServidor(res, error, 'Error al obtener archivo');
  }
});

module.exports = router;
