import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM app_settings');
    const settings = {};
    
    // Parse default values
    const defaultSettings = {
      condominiumName: "ATLÁNTICO II",
      senderEmail: '',
      recipientEmail: '',
      sendIntervalHours: 0,
      lastSentTimestamp: undefined,
      conciergeModeEnabled: false,
      totalParkingSpots: 100,
      whatsappNotificationsEnabled: false,
    };

    result.rows.forEach(row => {
      let val = row.value;
      if (row.key === 'sendIntervalHours' || row.key === 'totalParkingSpots') {
        val = parseInt(row.value, 10) || 0;
      } else if (row.key === 'lastSentTimestamp') {
        val = parseInt(row.value, 10) || undefined;
      } else if (row.key === 'conciergeModeEnabled' || row.key === 'whatsappNotificationsEnabled') {
        val = row.value === 'true';
      }
      settings[row.key] = val;
    });

    res.json({ ...defaultSettings, ...settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings
router.post('/', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, val] of Object.entries(settings)) {
      const stringValue = val === null || val === undefined ? '' : String(val);
      await query(`
        INSERT INTO app_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [key, stringValue]);
    }
    res.json({ success: true, message: 'Ajustes guardados.' });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
