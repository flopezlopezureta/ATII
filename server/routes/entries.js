import express from 'express';
import { query } from '../db.js';

const router = express.Router();

const fetchAllEntries = async () => {
  const result = await query('SELECT * FROM entries ORDER BY timestamp DESC');
  return result.rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    type: row.type,
    status: row.status,
    name: row.name || undefined,
    idDocument: row.id_document || undefined,
    apartment: row.apartment || undefined,
    authorizedBy: row.authorized_by || undefined,
    invitationId: row.invitation_id || undefined,
    licensePlate: row.license_plate || undefined,
    driverName: row.driver_name || undefined,
    parkingSpot: row.parking_spot || undefined
  }));
};

// GET /api/entries
router.get('/', async (req, res) => {
  try {
    const entries = await fetchAllEntries();
    res.json(entries);
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/entries
router.post('/', async (req, res) => {
  const entry = req.body;
  const entryId = 'ent-' + Date.now() + Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toISOString();

  try {
    await query(
      `INSERT INTO entries (id, timestamp, type, status, name, id_document, apartment, authorized_by, invitation_id, license_plate, driver_name, parking_spot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        entryId,
        timestamp,
        entry.type,
        entry.status || 'approved',
        entry.name || null,
        entry.idDocument || null,
        entry.apartment || null,
        entry.authorizedBy || null,
        entry.invitationId || null,
        entry.licensePlate || null,
        entry.driverName || null,
        entry.parkingSpot || null
      ]
    );

    const entries = await fetchAllEntries();
    res.json(entries);
  } catch (err) {
    console.error('Error adding entry:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/entries/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Fetch original
    const orig = await query('SELECT * FROM entries WHERE id = $1', [id]);
    if (orig.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    const original = orig.rows[0];

    const status = updates.status !== undefined ? updates.status : original.status;
    const name = updates.name !== undefined ? updates.name : original.name;
    const idDocument = updates.idDocument !== undefined ? updates.idDocument : original.id_document;
    const apartment = updates.apartment !== undefined ? updates.apartment : original.apartment;
    const authorizedBy = updates.authorizedBy !== undefined ? updates.authorizedBy : original.authorized_by;
    const invitationId = updates.invitationId !== undefined ? updates.invitationId : original.invitation_id;
    const licensePlate = updates.licensePlate !== undefined ? updates.licensePlate : original.license_plate;
    const driverName = updates.driverName !== undefined ? updates.driverName : original.driver_name;
    const parkingSpot = updates.parkingSpot !== undefined ? updates.parkingSpot : original.parking_spot;

    await query(
      `UPDATE entries
       SET status = $1, name = $2, id_document = $3, apartment = $4, authorized_by = $5, invitation_id = $6, license_plate = $7, driver_name = $8, parking_spot = $9
       WHERE id = $10`,
      [status, name, idDocument, apartment, authorizedBy, invitationId, licensePlate, driverName, parkingSpot, id]
    );

    const entries = await fetchAllEntries();
    res.json(entries);
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/entries
router.delete('/', async (req, res) => {
  try {
    await query('DELETE FROM entries');
    res.json([]);
  } catch (err) {
    console.error('Error clearing entries:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
