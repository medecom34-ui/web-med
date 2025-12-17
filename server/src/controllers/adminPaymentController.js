// server/src/controllers/adminPaymentController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeResult(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "object" && obj !== null && typeof obj.toString === "function" &&
      obj.constructor && obj.constructor.name === "Decimal") {
    const s = obj.toString(); const n = Number(s); return Number.isNaN(n) ? s : n;
  }
  if (Array.isArray(obj)) return obj.map(normalizeResult);
  if (typeof obj === "object") {
    const out = {};
    for (const [k,v] of Object.entries(obj)) out[k] = normalizeResult(v);
    return out;
  }
  return obj;
}

exports.listPayments = async (req, res) => {
  try {
    // query: status optional
    const { status } = req.query;
    const where = {};
    if (status) where.status = String(status).toUpperCase();
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { order: { include: { user: true } } }
    });
    return res.json({ success: true, data: normalizeResult(payments) });
  } catch (err) {
    console.error("adminPayments.listPayments error", err);
    return res.status(500).json({ success:false, message: err.message || "failed to list payments" });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success:false, message: "missing id" });
    const n = Number(id);
    if (Number.isNaN(n)) return res.status(400).json({ success:false, message: "invalid id" });

    const payload = req.body || {};
    if (!payload.status) return res.status(400).json({ success:false, message: "missing status" });
    const STATUS = ["PENDING","VERIFIED","REJECTED"];
    const s = String(payload.status).toUpperCase();
    if (!STATUS.includes(s)) return res.status(400).json({ success:false, message: "invalid status" });

    const data = { status: s };
    if (s === "VERIFIED") data.verifiedAt = new Date();
    // (optional) could set verifiedBy from req.user if adminGuard puts it

    const updated = await prisma.payment.update({
      where: { id: BigInt(n) },
      data,
      include: { order: true }
    });

    return res.json({ success:true, data: normalizeResult(updated) });
  } catch (err) {
    console.error("adminPayments.updatePayment error", err);
    return res.status(500).json({ success:false, message: err.message || "failed to update payment" });
  }
};
