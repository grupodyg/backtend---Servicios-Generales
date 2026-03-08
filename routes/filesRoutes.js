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
      return res.status(400).json({ error: 'Key de archivo requerida' });
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
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    console.error('Error al servir archivo desde S3:', error);
    res.status(500).json({ error: 'Error al obtener archivo' });
  }
});

module.exports = router;
