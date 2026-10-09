const { responderErrorServidor } = require('../utils/httpErrors');
const { createDatabaseBackup, generateBackupFilename } = require('../services/backupService');
const { uploadBackup, getBackup, listBackups, deleteBackup } = require('../services/wasabiService');

const BACKUP_PREFIX = 'backups/';

exports.createBackup = async (req, res) => {
  try {
    const filename = generateBackupFilename();
    const key = `${BACKUP_PREFIX}${filename}`;

    const buffer = await createDatabaseBackup();

    await uploadBackup(buffer, key, 'application/sql');

    res.status(201).json({
      message: 'Backup creado exitosamente',
      backup: {
        key,
        filename,
        size: buffer.length,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error al crear backup:', error);
    responderErrorServidor(res, error, 'Error al crear el backup de la base de datos');
  }
};

exports.listBackups = async (req, res) => {
  try {
    const backups = await listBackups(BACKUP_PREFIX);

    const formatted = backups.map(item => ({
      key: item.key,
      filename: item.key.replace(BACKUP_PREFIX, ''),
      size: item.size,
      lastModified: item.lastModified
    }));

    // Ordenar por fecha descendente (más reciente primero)
    formatted.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json(formatted);
  } catch (error) {
    console.error('Error al listar backups:', error);
    responderErrorServidor(res, error, 'Error al obtener la lista de backups');
  }
};

exports.downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({
        error: 'Nombre de archivo requerido',
        message: 'No se indicó qué backup descargar. Esto es un problema de la aplicación, no de lo que hiciste: recarga la lista de backups en Configuración y pulsa de nuevo el botón de descarga. Si persiste, avisa al administrador del sistema.',
        tipo: 'validacion'
      });
    }

    const key = `${BACKUP_PREFIX}${filename}`;
    const s3Response = await getBackup(key);

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength);
    }

    s3Response.Body.pipe(res);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        error: 'Backup no encontrado',
        message: `El backup «${req.params.filename}» ya no existe en el almacenamiento (es posible que otro usuario lo haya eliminado). Recarga la lista de backups en Configuración para ver los disponibles.`,
        tipo: 'no_encontrado'
      });
    }
    console.error('Error al descargar backup:', error);
    responderErrorServidor(res, error, 'Error al descargar el backup');
  }
};

exports.deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({
        error: 'Nombre de archivo requerido',
        message: 'No se indicó qué backup eliminar. Esto es un problema de la aplicación, no de lo que hiciste: recarga la lista de backups en Configuración y pulsa de nuevo el botón de eliminar. Si persiste, avisa al administrador del sistema.',
        tipo: 'validacion'
      });
    }

    const key = `${BACKUP_PREFIX}${filename}`;
    await deleteBackup(key);

    res.json({ message: 'Backup eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar backup:', error);
    responderErrorServidor(res, error, 'Error al eliminar el backup');
  }
};
