import express from 'express';
import { query } from '../db.js';

const router = express.Router();

const mapNotification = (row) => ({
  id: row.id,
  recipientDirUserId: row.recipient_dir_user_id,
  recipientName: row.recipient_name,
  recipientApt: row.recipient_apt,
  type: row.type,
  notes: row.notes || undefined,
  createdAt: row.created_at,
  createdByUsername: row.created_by_username,
  status: row.status,
  acknowledgedAt: row.acknowledged_at || undefined,
  deliveredAt: row.delivered_at || undefined
});

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows.map(mapNotification));
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications
router.post('/', async (req, res) => {
  const notif = req.body;
  const notifId = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const now = new Date().toISOString();

  try {
    await query(
      `INSERT INTO notifications (
        id, recipient_dir_user_id, recipient_name, recipient_apt, type, notes, created_at, created_by_username, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        notifId,
        notif.recipientDirUserId,
        notif.recipientName,
        notif.recipientApt,
        notif.type,
        notif.notes || null,
        now,
        notif.createdByUsername,
        'pending'
      ]
    );

    const result = await query('SELECT * FROM notifications WHERE id = $1', [notifId]);
    res.json(mapNotification(result.rows[0]));
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const orig = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (orig.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const original = orig.rows[0];

    const status = updates.status !== undefined ? updates.status : original.status;
    const acknowledgedAt = updates.acknowledgedAt !== undefined ? updates.acknowledgedAt : original.acknowledged_at;
    const deliveredAt = updates.deliveredAt !== undefined ? updates.deliveredAt : original.delivered_at;
    const notes = updates.notes !== undefined ? updates.notes : original.notes;

    await query(
      `UPDATE notifications
       SET status = $1, acknowledged_at = $2, delivered_at = $3, notes = $4
       WHERE id = $5`,
      [status, acknowledgedAt, deliveredAt, notes, id]
    );

    const result = await query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows.map(mapNotification));
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
