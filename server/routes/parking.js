import express from 'express';
import { query } from '../db.js';

const router = express.Router();

const mapLoanRequest = (row) => ({
  id: row.id,
  lenderId: row.lender_id || undefined,
  lenderName: row.lender_name || undefined,
  lenderApt: row.lender_apt || undefined,
  borrowerId: row.borrower_id,
  borrowerName: row.borrower_name,
  borrowerApt: row.borrower_apt,
  spot: row.spot || undefined,
  status: row.status,
  createdAt: row.created_at,
  invitationId: row.invitation_id || undefined,
  visitorName: row.visitor_name || undefined,
  visitorPlate: row.visitor_plate || undefined
});

// GET /api/parking/loans
router.get('/loans', async (req, res) => {
  try {
    const result = await query('SELECT * FROM parking_loan_requests ORDER BY created_at DESC');
    res.json(result.rows.map(mapLoanRequest));
  } catch (err) {
    console.error('Error fetching parking loans:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/parking/loans
router.post('/loans', async (req, res) => {
  const reqData = req.body;
  const loanId = reqData.id || 'loan-' + Date.now() + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  try {
    await query(
      `INSERT INTO parking_loan_requests (
        id, lender_id, lender_name, lender_apt, borrower_id, borrower_name, borrower_apt, spot, status, created_at, invitation_id, visitor_name, visitor_plate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        loanId,
        reqData.lenderId || null,
        reqData.lenderName || null,
        reqData.lenderApt || null,
        reqData.borrowerId,
        reqData.borrowerName,
        reqData.borrowerApt,
        reqData.spot || null,
        reqData.status,
        now,
        reqData.invitationId || null,
        reqData.visitorName || null,
        reqData.visitorPlate || null
      ]
    );

    const result = await query('SELECT * FROM parking_loan_requests WHERE id = $1', [loanId]);
    res.json(mapLoanRequest(result.rows[0]));
  } catch (err) {
    console.error('Error creating parking loan request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/parking/loans/:id
router.put('/loans/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const orig = await query('SELECT * FROM parking_loan_requests WHERE id = $1', [id]);
    if (orig.rows.length === 0) {
      return res.status(404).json({ error: 'Loan request not found' });
    }
    const original = orig.rows[0];

    const lenderId = updates.lenderId !== undefined ? updates.lenderId : original.lender_id;
    const lenderName = updates.lenderName !== undefined ? updates.lenderName : original.lender_name;
    const lenderApt = updates.lenderApt !== undefined ? updates.lenderApt : original.lender_apt;
    const spot = updates.spot !== undefined ? updates.spot : original.spot;
    const status = updates.status !== undefined ? updates.status : original.status;
    const invitationId = updates.invitationId !== undefined ? updates.invitationId : original.invitation_id;
    const visitorName = updates.visitorName !== undefined ? updates.visitorName : original.visitor_name;
    const visitorPlate = updates.visitorPlate !== undefined ? updates.visitorPlate : original.visitor_plate;

    await query(
      `UPDATE parking_loan_requests
       SET lender_id = $1, lender_name = $2, lender_apt = $3, spot = $4, status = $5, invitation_id = $6, visitor_name = $7, visitor_plate = $8
       WHERE id = $9`,
      [lenderId, lenderName, lenderApt, spot, status, invitationId, visitorName, visitorPlate, id]
    );

    const result = await query('SELECT * FROM parking_loan_requests WHERE id = $9', [lenderId, lenderName, lenderApt, spot, status, invitationId, visitorName, visitorPlate, id]);
    // Actually select by id
    const freshResult = await query('SELECT * FROM parking_loan_requests WHERE id = $1', [id]);
    res.json(mapLoanRequest(freshResult.rows[0]));
  } catch (err) {
    console.error('Error updating parking loan request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/parking/loans/:id
router.delete('/loans/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM parking_loan_requests WHERE id = $1', [id]);
    res.json({ success: true, message: 'Solicitud cancelada.' });
  } catch (err) {
    console.error('Error deleting parking loan request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
