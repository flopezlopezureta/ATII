import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Helper to fetch and assemble directory users with all detailed arrays
export const fetchAllDirectoryUsers = async () => {
  const usersRes = await query('SELECT * FROM directory_users');
  const vehiclesRes = await query('SELECT * FROM directory_vehicles');
  const occupantsRes = await query('SELECT * FROM occupants');
  const spotsRes = await query('SELECT * FROM unit_parking_spots');

  const usersMap = {};
  usersRes.rows.forEach(u => {
    usersMap[u.id] = {
      id: u.id,
      authUserId: u.auth_user_id || undefined,
      name: u.name,
      idDocument: u.id_document || '',
      apartment: u.apartment || '',
      phone: u.phone || '',
      email: u.email || '',
      role: u.role,
      roleNotes: u.role_notes || undefined,
      notes: u.notes || '',
      petsInfo: u.pets_info || '',
      workShift: u.work_shift || undefined,
      permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions,
      tenant: typeof u.tenant === 'string' ? JSON.parse(u.tenant) : u.tenant,
      vehicles: [],
      occupants: [],
      unitParkingSpots: [],
      createdAt: u.created_at,
      updatedAt: u.updated_at
    };
  });

  vehiclesRes.rows.forEach(v => {
    if (usersMap[v.directory_user_id]) {
      usersMap[v.directory_user_id].vehicles.push({
        id: v.id,
        licensePlate: v.license_plate,
        parkingSpot: v.parking_spot || '',
        notes: v.notes || ''
      });
    }
  });

  occupantsRes.rows.forEach(o => {
    if (usersMap[o.directory_user_id]) {
      usersMap[o.directory_user_id].occupants.push({
        id: o.id,
        name: o.name,
        relationship: o.relationship || '',
        idDocument: o.id_document || ''
      });
    }
  });

  spotsRes.rows.forEach(s => {
    if (usersMap[s.directory_user_id]) {
      usersMap[s.directory_user_id].unitParkingSpots.push(s.spot);
    }
  });

  return Object.values(usersMap).sort((a, b) => a.name.localeCompare(b.name));
};

// GET /api/directory
router.get('/', async (req, res) => {
  try {
    const users = await fetchAllDirectoryUsers();
    res.json(users);
  } catch (err) {
    console.error('Error fetching directory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/directory
router.post('/', async (req, res) => {
  const user = req.body;
  const now = new Date().toISOString();
  const userId = user.id || 'dir-' + Date.now() + Math.random().toString(36).substring(2, 9);

  try {
    await query('BEGIN');

    await query(
      `INSERT INTO directory_users (id, auth_user_id, name, id_document, apartment, phone, email, role, role_notes, notes, pets_info, work_shift, permissions, tenant, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        userId,
        user.authUserId || null,
        user.name,
        user.idDocument || null,
        user.apartment || null,
        user.phone || null,
        user.email || null,
        user.role,
        user.roleNotes || null,
        user.notes || null,
        user.petsInfo || null,
        user.workShift || null,
        JSON.stringify(user.permissions),
        JSON.stringify(user.tenant || null),
        now,
        now
      ]
    );

    if (user.vehicles && Array.isArray(user.vehicles)) {
      for (const v of user.vehicles) {
        const vehicleId = 'veh-' + Date.now() + Math.random().toString(36).substring(2, 9);
        await query(
          'INSERT INTO directory_vehicles (id, directory_user_id, license_plate, parking_spot, notes) VALUES ($1, $2, $3, $4, $5)',
          [vehicleId, userId, v.licensePlate, v.parkingSpot || null, v.notes || null]
        );
      }
    }

    if (user.occupants && Array.isArray(user.occupants)) {
      for (const o of user.occupants) {
        const occupantId = 'occ-' + Date.now() + Math.random().toString(36).substring(2, 9);
        await query(
          'INSERT INTO occupants (id, directory_user_id, name, relationship, id_document) VALUES ($1, $2, $3, $4, $5)',
          [occupantId, userId, o.name, o.relationship || null, o.idDocument || null]
        );
      }
    }

    if (user.unitParkingSpots && Array.isArray(user.unitParkingSpots)) {
      for (const spot of user.unitParkingSpots) {
        await query(
          'INSERT INTO unit_parking_spots (directory_user_id, spot) VALUES ($1, $2)',
          [userId, spot]
        );
      }
    }

    await query('COMMIT');

    const updatedList = await fetchAllDirectoryUsers();
    res.json(updatedList);
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error creating directory user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/directory/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const now = new Date().toISOString();

  try {
    await query('BEGIN');

    // Retrieve original user details
    const originalRes = await query('SELECT * FROM directory_users WHERE id = $1', [id]);
    if (originalRes.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    const original = originalRes.rows[0];

    // Merge values
    const name = updates.name !== undefined ? updates.name : original.name;
    const authUserId = updates.authUserId !== undefined ? updates.authUserId : original.auth_user_id;
    const idDocument = updates.idDocument !== undefined ? updates.idDocument : original.id_document;
    const apartment = updates.apartment !== undefined ? updates.apartment : original.apartment;
    const phone = updates.phone !== undefined ? updates.phone : original.phone;
    const email = updates.email !== undefined ? updates.email : original.email;
    const role = updates.role !== undefined ? updates.role : original.role;
    const roleNotes = updates.roleNotes !== undefined ? updates.roleNotes : original.role_notes;
    const notes = updates.notes !== undefined ? updates.notes : original.notes;
    const petsInfo = updates.petsInfo !== undefined ? updates.petsInfo : original.pets_info;
    const workShift = updates.workShift !== undefined ? updates.workShift : original.work_shift;
    const permissions = updates.permissions !== undefined ? JSON.stringify(updates.permissions) : JSON.stringify(original.permissions);
    const tenant = updates.tenant !== undefined ? JSON.stringify(updates.tenant) : JSON.stringify(original.tenant);

    await query(
      `UPDATE directory_users
       SET auth_user_id = $1, name = $2, id_document = $3, apartment = $4, phone = $5, email = $6, role = $7, role_notes = $8, notes = $9, pets_info = $10, work_shift = $11, permissions = $12, tenant = $13, updated_at = $14
       WHERE id = $15`,
      [authUserId, name, idDocument, apartment, phone, email, role, roleNotes, notes, petsInfo, workShift, permissions, tenant, now, id]
    );

    // Update vehicles (delete and insert)
    if (updates.vehicles && Array.isArray(updates.vehicles)) {
      await query('DELETE FROM directory_vehicles WHERE directory_user_id = $1', [id]);
      for (const v of updates.vehicles) {
        const vehicleId = v.id && !v.id.startsWith('temp-') ? v.id : 'veh-' + Date.now() + Math.random().toString(36).substring(2, 9);
        await query(
          'INSERT INTO directory_vehicles (id, directory_user_id, license_plate, parking_spot, notes) VALUES ($1, $2, $3, $4, $5)',
          [vehicleId, id, v.licensePlate, v.parkingSpot || null, v.notes || null]
        );
      }
    }

    // Update occupants
    if (updates.occupants && Array.isArray(updates.occupants)) {
      await query('DELETE FROM occupants WHERE directory_user_id = $1', [id]);
      for (const o of updates.occupants) {
        const occupantId = o.id && !o.id.startsWith('temp-') ? o.id : 'occ-' + Date.now() + Math.random().toString(36).substring(2, 9);
        await query(
          'INSERT INTO occupants (id, directory_user_id, name, relationship, id_document) VALUES ($1, $2, $3, $4, $5)',
          [occupantId, id, o.name, o.relationship || null, o.idDocument || null]
        );
      }
    }

    // Update unit parking spots
    if (updates.unitParkingSpots && Array.isArray(updates.unitParkingSpots)) {
      await query('DELETE FROM unit_parking_spots WHERE directory_user_id = $1', [id]);
      for (const spot of updates.unitParkingSpots) {
        await query(
          'INSERT INTO unit_parking_spots (directory_user_id, spot) VALUES ($1, $2)',
          [id, spot]
        );
      }
    }

    await query('COMMIT');

    const updatedList = await fetchAllDirectoryUsers();
    res.json(updatedList);
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error updating directory user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/directory/:id
router.get('/delete/:id', async (req, res) => { // Using standard delete or GET/delete if convenient, but let's use router.delete and custom endpoints
  // Wait, let's look at directoryService.ts. It calls:
  // deleteDirectoryUser(userId)
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('BEGIN');
    const userRes = await query('SELECT auth_user_id FROM directory_users WHERE id = $1', [id]);
    
    // Delete directory user (cascade will delete vehicles, occupants, unit parking spots)
    await query('DELETE FROM directory_users WHERE id = $1', [id]);
    
    // If the directory user has an auth account, delete that too
    if (userRes.rows.length > 0 && userRes.rows[0].auth_user_id) {
      await query('DELETE FROM users WHERE id = $1', [userRes.rows[0].auth_user_id]);
    }
    
    await query('COMMIT');
    const updatedList = await fetchAllDirectoryUsers();
    res.json(updatedList);
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error deleting directory user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
