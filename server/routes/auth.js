import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const result = await query('SELECT id, username, email, is_approved_by_admin AS "isApprovedByAdmin" FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const trimmedUsername = username?.trim();
    const result = await query(
      'SELECT id, username, password_hash AS "passwordHash", email, is_approved_by_admin AS "isApprovedByAdmin" FROM users WHERE LOWER(username) = LOWER($1)',
      [trimmedUsername]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = result.rows[0];
    if (user.passwordHash !== password) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    if (!user.isApprovedByAdmin) {
      return res.status(403).json({ success: false, message: 'Esta cuenta está pendiente de aprobación por la administración. No puedes iniciar sesión aún.' });
    }

    let role = 'Habitante';
    if (user.id === 'superuser-active-id') {
      role = 'Superuser';
    } else {
      const profileResult = await query('SELECT role FROM directory_users WHERE auth_user_id = $1', [user.id]);
      if (profileResult.rows.length > 0) {
        role = profileResult.rows[0].role;
      }
    }

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      user: {
        id: user.id,
        username: user.username,
        isApprovedByAdmin: user.isApprovedByAdmin,
        role
      }
    });
  } catch (err) {
    console.error('Error on login:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { authData, profileData } = req.body;
  const { username, passwordAttempt, email } = authData;

  try {
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim().toLowerCase();

    // Check if username already exists
    const checkUsername = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
    if (checkUsername.rows.length > 0) {
      return res.json({ success: false, message: 'El nombre de usuario ya existe.' });
    }

    // Check if email already exists
    const checkEmail = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (checkEmail.rows.length > 0) {
      return res.json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    const authUserId = 'usr-' + Date.now() + Math.random().toString(36).substring(2, 7);
    const directoryUserId = 'dir-' + Date.now() + Math.random().toString(36).substring(2, 9);

    // SQL Transaction
    await query('BEGIN');

    // Create auth account
    await query(
      'INSERT INTO users (id, username, password_hash, email, is_approved_by_admin) VALUES ($1, $2, $3, $4, $5)',
      [authUserId, trimmedUsername, passwordAttempt, trimmedEmail, false]
    );

    // Create directory user profile
    await query(
      `INSERT INTO directory_users (id, auth_user_id, name, id_document, apartment, phone, email, role, role_notes, notes, pets_info, permissions, tenant)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        directoryUserId,
        authUserId,
        profileData.name,
        profileData.idDocument || null,
        profileData.apartment || null,
        profileData.phone || null,
        trimmedEmail,
        profileData.role || 'Habitante',
        profileData.roleNotes || null,
        profileData.notes || null,
        profileData.petsInfo || null,
        JSON.stringify(profileData.permissions),
        JSON.stringify(profileData.tenant || null)
      ]
    );

    // Insert vehicles
    if (profileData.vehicles && Array.isArray(profileData.vehicles)) {
      for (const v of profileData.vehicles) {
        const vehicleId = 'veh-' + Date.now() + Math.random().toString(36).substring(2, 9);
        await query(
          'INSERT INTO directory_vehicles (id, directory_user_id, license_plate, parking_spot, notes) VALUES ($1, $2, $3, $4, $5)',
          [vehicleId, directoryUserId, v.licensePlate, v.parkingSpot || null, v.notes || null]
        );
      }
    }

    // Insert occupants
    if (profileData.occupants && Array.isArray(profileData.occupants)) {
      for (const o of profileData.occupants) {
        const occupantId = 'occ-' + Date.now() + Math.random().toString(36).substring(2, 9);
        await query(
          'INSERT INTO occupants (id, directory_user_id, name, relationship, id_document) VALUES ($1, $2, $3, $4, $5)',
          [occupantId, directoryUserId, o.name, o.relationship || null, o.idDocument || null]
        );
      }
    }

    // Insert unit parking spots
    if (profileData.unitParkingSpots && Array.isArray(profileData.unitParkingSpots)) {
      for (const spot of profileData.unitParkingSpots) {
        await query(
          'INSERT INTO unit_parking_spots (directory_user_id, spot) VALUES ($1, $2)',
          [directoryUserId, spot]
        );
      }
    }

    await query('COMMIT');
    res.json({
      success: true,
      message: '¡Registro enviado! Tu cuenta está pendiente de aprobación por la administración. Serás notificado una vez que esté activa.',
      authUserId
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
  }
});

// POST /api/auth/approve/:id
router.post('/approve/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('UPDATE users SET is_approved_by_admin = true WHERE id = $1 RETURNING username', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({ success: true, message: `Cuenta de ${result.rows[0].username} aprobada.` });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/disable/:id
router.post('/disable/:id', async (req, res) => {
  const { id } = req.params;
  if (id === 'superuser-active-id') {
    return res.status(400).json({ success: false, message: 'No se puede deshabilitar la cuenta del superusuario.' });
  }
  try {
    const result = await query('UPDATE users SET is_approved_by_admin = false WHERE id = $1 RETURNING username', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({ success: true, message: `Cuenta de ${result.rows[0].username} deshabilitada.` });
  } catch (err) {
    console.error('Error disabling user:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/admin-create
router.post('/admin-create', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const trimmedUsername = username?.trim();
    const checkUsername = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
    if (checkUsername.rows.length > 0) {
      return res.json({ success: false, message: 'El nombre de usuario ya existe.' });
    }

    const authUserId = 'usr-' + Date.now() + Math.random().toString(36).substring(2, 7);
    await query(
      'INSERT INTO users (id, username, password_hash, email, is_approved_by_admin) VALUES ($1, $2, $3, $4, $5)',
      [authUserId, trimmedUsername, password, email || '', true]
    );

    res.json({
      success: true,
      message: 'Cuenta de autenticación creada.',
      user: { id: authUserId, username: trimmedUsername, isApprovedByAdmin: true }
    });
  } catch (err) {
    console.error('Error in admin-create account:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/update-password
router.post('/update-password', async (req, res) => {
  const { authUserId, newPassword } = req.body;
  try {
    const result = await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPassword, authUserId]);
    res.json({ success: true, message: 'Contraseña actualizada exitosamente.' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/change-superuser-password
router.post('/change-superuser-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', ['superuser-active-id']);
    if (result.rows.length === 0 || result.rows[0].password_hash !== currentPassword) {
      return res.json({ success: false, message: 'La contraseña actual es incorrecta.' });
    }

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPassword, 'superuser-active-id']);
    res.json({ success: true, message: 'Contraseña de superusuario actualizada exitosamente.' });
  } catch (err) {
    console.error('Error updating superuser password:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/request-reset
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query('SELECT id, username FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.' });
    }

    const token = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2);
    const expires = Date.now() + 3600000; // 1 hour

    await query('UPDATE users SET password_reset_token = $1, password_reset_token_expires = $2 WHERE email = $3', [token, expires, email]);

    // Simulating email send
    console.log(`\n--- SIMULACIÓN DE RECUPERACIÓN DE CONTRASEÑA ---\nPara: ${email}\nToken: ${token}\n-----------------------------------------------\n`);
    res.json({ success: true, message: 'Si existe una cuenta con este correo, se ha enviado un enlace de recuperación.' });
  } catch (err) {
    console.error('Error requesting password reset:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const result = await query(
      'SELECT id, password_reset_token_expires AS "expires" FROM users WHERE password_reset_token = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Token inválido o no encontrado.' });
    }

    const user = result.rows[0];
    if (user.expires && user.expires < Date.now()) {
      await query('UPDATE users SET password_reset_token = NULL, password_reset_token_expires = NULL WHERE id = $1', [user.id]);
      return res.json({ success: false, message: 'El token ha expirado. Por favor, solicita uno nuevo.' });
    }

    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires = NULL WHERE id = $2',
      [newPassword, user.id]
    );
    res.json({ success: true, message: 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
