const path = require('path');
const {
  getBrandingSettings,
  upsertSetting,
  getSettingValue
} = require('../models/appSettingsModel');
const { uploadFile, deleteFile } = require('../services/wasabiService');

const LOGO_KEY_PREFIX = 'branding/login-logo-';

const extractKeyFromProxyUrl = (url) => {
  if (!url) return null;
  const marker = '/api/files/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
};

const getPublic = async (req, res) => {
  try {
    const settings = await getBrandingSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error al obtener branding público:', error);
    res.status(500).json({ error: 'Error al obtener configuración de branding' });
  }
};

const updateTexts = async (req, res) => {
  try {
    const { company_name, company_subtitle } = req.body;

    if (typeof company_name !== 'string' || company_name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
    }
    if (typeof company_subtitle !== 'string') {
      return res.status(400).json({ error: 'El subtítulo es requerido' });
    }

    await upsertSetting('company_name', company_name.trim(), req.user.id);
    await upsertSetting('company_subtitle', company_subtitle.trim(), req.user.id);

    const settings = await getBrandingSettings();
    res.json({ mensaje: 'Configuración actualizada exitosamente', data: settings });
  } catch (error) {
    console.error('Error al actualizar branding:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió archivo' });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Formato no permitido. Use PNG, JPG o SVG' });
    }

    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'El logo no debe superar 2MB' });
    }

    const previousUrl = await getSettingValue('login_logo_url');
    const previousKey = extractKeyFromProxyUrl(previousUrl);

    const ext = path.extname(req.file.originalname) || '.png';
    const key = `${LOGO_KEY_PREFIX}${Date.now()}${ext}`;
    const url = await uploadFile(req.file.buffer, key, req.file.mimetype);

    await upsertSetting('login_logo_url', url, req.user.id);

    if (previousKey) {
      try {
        await deleteFile(previousKey);
      } catch (err) {
        console.warn('No se pudo eliminar logo anterior:', err.message);
      }
    }

    const settings = await getBrandingSettings();
    res.status(201).json({ mensaje: 'Logo actualizado exitosamente', data: settings });
  } catch (error) {
    console.error('Error al subir logo:', error);
    res.status(500).json({ error: 'Error al subir logo' });
  }
};

const resetLogo = async (req, res) => {
  try {
    const previousUrl = await getSettingValue('login_logo_url');
    const previousKey = extractKeyFromProxyUrl(previousUrl);

    await upsertSetting('login_logo_url', '', req.user.id);

    if (previousKey) {
      try {
        await deleteFile(previousKey);
      } catch (err) {
        console.warn('No se pudo eliminar logo anterior:', err.message);
      }
    }

    const settings = await getBrandingSettings();
    res.json({ mensaje: 'Logo restablecido exitosamente', data: settings });
  } catch (error) {
    console.error('Error al restablecer logo:', error);
    res.status(500).json({ error: 'Error al restablecer logo' });
  }
};

module.exports = {
  getPublic,
  updateTexts,
  uploadLogo,
  resetLogo
};
