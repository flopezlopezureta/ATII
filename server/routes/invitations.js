import express from 'express';
import { query } from '../db.js';

const router = express.Router();

const mapInvitation = (row) => ({
  id: row.id,
  createdByUserId: row.created_by_user_id,
  createdByUserName: row.created_by_user_name,
  createdAt: row.created_at,
  validFrom: row.valid_from,
  validUntil: row.valid_until,
  type: row.type,
  status: row.status,
  guestName: row.guest_name || undefined,
  guestIdDocument: row.guest_id_document || undefined,
  licensePlate: row.license_plate || undefined,
  apartment: row.apartment,
  notes: row.notes || undefined,
  usedAt: row.used_at || undefined,
  usedByEntryId: row.used_by_entry_id || undefined,
  isParkingLoan: row.is_parking_loan,
  loanedByUserId: row.loaned_by_user_id || undefined,
  loanedByUserName: row.loaned_by_user_name || undefined,
  loanedSpot: row.loaned_spot || undefined
});

// GET /api/invitations
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM invitations ORDER BY created_at DESC');
    res.json(result.rows.map(mapInvitation));
  } catch (err) {
    console.error('Error fetching invitations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invitations/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM invitations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    res.json(mapInvitation(result.rows[0]));
  } catch (err) {
    console.error('Error fetching invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invitations
router.post('/', async (req, res) => {
  const inv = req.body;
  const invId = inv.id || 'inv-' + Date.now() + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  try {
    await query(
      `INSERT INTO invitations (
        id, created_by_user_id, created_by_user_name, created_at, valid_from, valid_until, type, status,
        guest_name, guest_id_document, license_plate, apartment, notes, is_parking_loan, loaned_by_user_id, loaned_by_user_name, loaned_spot
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        invId,
        inv.createdByUserId,
        inv.createdByUserName,
        now,
        inv.validFrom,
        inv.validUntil,
        inv.type,
        inv.status || 'active',
        inv.guestName || null,
        inv.guestIdDocument || null,
        inv.licensePlate || null,
        inv.apartment,
        inv.notes || null,
        inv.isParkingLoan || false,
        inv.loanedByUserId || null,
        inv.loanedByUserName || null,
        inv.loanedSpot || null
      ]
    );

    const result = await query('SELECT * FROM invitations WHERE id = $1', [invId]);
    res.json(mapInvitation(result.rows[0]));
  } catch (err) {
    console.error('Error creating invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invitations/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const orig = await query('SELECT * FROM invitations WHERE id = $1', [id]);
    if (orig.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    const original = orig.rows[0];

    const status = updates.status !== undefined ? updates.status : original.status;
    const usedAt = updates.usedAt !== undefined ? updates.usedAt : original.used_at;
    const usedByEntryId = updates.usedByEntryId !== undefined ? updates.usedByEntryId : original.used_by_entry_id;

    await query(
      `UPDATE invitations
       SET status = $1, used_at = $2, used_by_entry_id = $3
       WHERE id = $4`,
      [status, usedAt, usedByEntryId, id]
    );

    const result = await query('SELECT * FROM invitations WHERE id = $1', [id]);
    res.json(mapInvitation(result.rows[0]));
  } catch (err) {
    console.error('Error updating invitation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
