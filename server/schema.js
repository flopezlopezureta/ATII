import { pool } from './db.js';

export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        is_approved_by_admin BOOLEAN DEFAULT FALSE,
        password_reset_token VARCHAR(255),
        password_reset_token_expires BIGINT
      )
    `);

    // 2. Directory Users Table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS directory_users (
        id VARCHAR(50) PRIMARY KEY,
        auth_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        id_document VARCHAR(50),
        apartment VARCHAR(100),
        phone VARCHAR(100),
        email VARCHAR(255),
        role VARCHAR(100) NOT NULL,
        role_notes TEXT,
        notes TEXT,
        pets_info TEXT,
        work_shift VARCHAR(100),
        permissions JSONB NOT NULL,
        tenant JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    \`);

    // 3. Directory Vehicles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS directory_vehicles (
        id VARCHAR(50) PRIMARY KEY,
        directory_user_id VARCHAR(50) REFERENCES directory_users(id) ON DELETE CASCADE,
        license_plate VARCHAR(50) NOT NULL,
        parking_spot VARCHAR(100),
        notes TEXT
      )
    `);

    // 4. Occupants Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS occupants (
        id VARCHAR(50) PRIMARY KEY,
        directory_user_id VARCHAR(50) REFERENCES directory_users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        relationship VARCHAR(100),
        id_document VARCHAR(50)
      )
    `);

    // 5. Unit Parking Spots Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS unit_parking_spots (
        id SERIAL PRIMARY KEY,
        directory_user_id VARCHAR(50) REFERENCES directory_users(id) ON DELETE CASCADE,
        spot VARCHAR(50) NOT NULL
      )
    `);

    // 6. Entries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id VARCHAR(50) PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'approved',
        name VARCHAR(255),
        id_document VARCHAR(50),
        apartment VARCHAR(100),
        authorized_by VARCHAR(255),
        invitation_id VARCHAR(50),
        license_plate VARCHAR(50),
        driver_name VARCHAR(255),
        parking_spot VARCHAR(100)
      )
    `);

    // 7. Invitations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR(50) PRIMARY KEY,
        created_by_user_id VARCHAR(50) NOT NULL,
        created_by_user_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
        valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        guest_name VARCHAR(255),
        guest_id_document VARCHAR(50),
        license_plate VARCHAR(50),
        apartment VARCHAR(100) NOT NULL,
        notes TEXT,
        used_at TIMESTAMP WITH TIME ZONE,
        used_by_entry_id VARCHAR(50),
        is_parking_loan BOOLEAN DEFAULT FALSE,
        loaned_by_user_id VARCHAR(50),
        loaned_by_user_name VARCHAR(255),
        loaned_spot VARCHAR(50)
      )
    `);

    // 8. Parking Loan Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS parking_loan_requests (
        id VARCHAR(50) PRIMARY KEY,
        lender_id VARCHAR(50),
        lender_name VARCHAR(255),
        lender_apt VARCHAR(100),
        borrower_id VARCHAR(50) NOT NULL,
        borrower_name VARCHAR(255) NOT NULL,
        borrower_apt VARCHAR(100) NOT NULL,
        spot VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        invitation_id VARCHAR(50),
        visitor_name VARCHAR(255),
        visitor_plate VARCHAR(50)
      )
    `);

    // 9. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        recipient_dir_user_id VARCHAR(50) REFERENCES directory_users(id) ON DELETE CASCADE,
        recipient_name VARCHAR(255) NOT NULL,
        recipient_apt VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by_username VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 10. App Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // --- Seeding ---
    
    // Seed default settings if empty
    const settingsCheck = await client.query('SELECT COUNT(*) FROM app_settings');
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      const defaultSettings = {
        condominiumName: "ATLÁNTICO II",
        senderEmail: '',
        recipientEmail: '',
        sendIntervalHours: '0',
        conciergeModeEnabled: 'false',
        totalParkingSpots: '100',
        whatsappNotificationsEnabled: 'false'
      };
      for (const [key, val] of Object.entries(defaultSettings)) {
        await client.query('INSERT INTO app_settings (key, value) VALUES ($1, $2)', [key, val]);
      }
      console.log('Seeded default app settings.');
    }

    // Seed default superuser if empty
    const superuserCheck = await client.query('SELECT COUNT(*) FROM users WHERE id = $1', ['superuser-active-id']);
    if (parseInt(superuserCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO users (id, username, password_hash, email, is_approved_by_admin)
        VALUES ($1, $2, $3, $4, $5)
      `, ['superuser-active-id', 'admin', 'Dan15223.', 'admin@condoaccess.cl', true]);
      console.log('Seeded default superuser admin.');
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
};
