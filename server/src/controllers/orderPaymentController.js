// server/src/controllers/orderPaymentController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// helper to coerce numbers (reuse pattern from orderController)
function toNumberIfPossible(v){
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// createPayment: POST / (expects body with orderId or mounted under /:orderId)
exports.createPayment = async (req, res) => {
  try {
    const orderId = toNumberIfPossible(req.body.orderId ?? req.params.id ?? req.params.orderId);
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    const payload = req.body || {};
    const created = await prisma.payment.create({
      data: {
        orderId: orderId,
        status: payload.status || 'PENDING',
        amount: Number(payload.amount || 0),
        payerName: payload.payerName || null,
        slipUrl: payload.slipUrl || null
      }
    });

    return res.json({ success: true, data: created });
  } catch (err) {
    console.error('createPayment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'create payment failed' });
  }
};

// getPayment: GET /:id  (id = payment id or if you pass orderId via query it will return payments for order)
exports.getPayment = async (req, res) => {
  try {
    const id = toNumberIfPossible(req.params.id);
    if (id) {
      const p = await prisma.payment.findUnique({ where: { id } });
      return res.json({ success: true, data: p });
    }

    const orderId = toNumberIfPossible(req.query.orderId || req.params.orderId);
    if (orderId) {
      const list = await prisma.payment.findMany({ where: { orderId } });
      return res.json({ success: true, data: list });
    }

    return res.status(400).json({ success: false, message: 'payment id or orderId required' });
  } catch (err) {
    console.error('getPayment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'get payment failed' });
  }
};

// updatePayment: PATCH /:id  (id = payment id)
exports.updatePayment = async (req, res) => {
  try {
    const id = toNumberIfPossible(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'payment id required' });

    const payload = req.body || {};
    const data = {};

    if (payload.status) data.status = payload.status;
    if (payload.amount != null) data.amount = Number(payload.amount);
    if (payload.payerName !== undefined) data.payerName = payload.payerName;
    if (payload.slipUrl !== undefined) data.slipUrl = payload.slipUrl;
    if (payload.verifiedAt) data.verifiedAt = new Date(payload.verifiedAt);
    if (payload.verifiedBy != null) data.verifiedBy = toNumberIfPossible(payload.verifiedBy);

    const updated = await prisma.payment.update({
      where: { id },
      data
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updatePayment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'update payment failed' });
  }
};
