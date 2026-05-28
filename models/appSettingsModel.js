const pool = require('../config/db');

const BRANDING_KEYS = ['company_name', 'company_subtitle', 'login_logo_url'];

const getBrandingSettings = async () => {
  const query = `
    SELECT key, value
    FROM app_settings
    WHERE key = ANY($1::text[])
  `;
  const result = await pool.query(query, [BRANDING_KEYS]);

  const settings = {};
  for (const key of BRANDING_KEYS) {
    settings[key] = '';
  }
  for (const row of result.rows) {
    settings[row.key] = row.value || '';
  }
  return settings;
};

const upsertSetting = async (key, value, userId) => {
  const query = `
    INSERT INTO app_settings (key, value, user_id_modification, date_time_modification)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      user_id_modification = EXCLUDED.user_id_modification,
      date_time_modification = CURRENT_TIMESTAMP
    RETURNING key, value
  `;
  const result = await pool.query(query, [key, value, userId]);
  return result.rows[0];
};

const getSettingValue = async (key) => {
  const result = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return result.rows.length > 0 ? (result.rows[0].value || '') : '';
};

module.exports = {
  BRANDING_KEYS,
  getBrandingSettings,
  upsertSetting,
  getSettingValue
};
