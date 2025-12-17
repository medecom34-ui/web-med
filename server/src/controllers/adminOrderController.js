// server/src/controllers/adminOrderController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


function normalizeResult(obj) {
  if (obj === null || obj === undefined) return obj;

  // ถ้าเป็น BigInt -> string
  if (typeof obj === "bigint") return obj.toString();

  
  if (obj instanceof Date) return obj.toISOString();


  if (typeof obj === "object" && obj !== null && typeof obj.toString === "function" &&
      obj.constructor && obj.constructor.name === "Decimal") {
    const s = obj.toString();
    const n = Number(s);
    return Number.isNaN(n) ? s : n;
  }


  if (Array.isArray(obj)) return obj.map(normalizeResult);


  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = normalizeResult(v);
    }
    return out;
  }

  return obj;
}


exports.listOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50, q } = req.query;
    const where = {};

    if (status) where.status = String(status).toUpperCase();
    if (q) where.OR = [{ orderNumber: { contains: q } }, { id: !isNaN(Number(q)) ? Number(q) : undefined }];

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { addresses: true, payments: true, shipments: true, items: { include: { product: true, variant: true } } },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    return res.json({ success: true, data: normalizeResult(orders), meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error("admin.listOrders error", err);
    return res.status(500).json({ success: false, message: err.message || "failed to list orders" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: "missing id" });
    let where;
    const n = Number(id);
    if (!Number.isNaN(n) && id.trim() !== "") where = { id: BigInt(n) };
    else where = { orderNumber: String(id) };

    const order = await prisma.order.findUnique({
      where,
      include: { addresses: true, payments: true, shipments: true, items: { include: { product: { include: { media: true } }, variant: true } } }
    });
    if (!order) return res.status(404).json({ success: false, message: "order not found" });
    return res.json({ success: true, data: normalizeResult(order) });
  } catch (err) {
    console.error("admin.getOrder error", err);
    return res.status(500).json({ success: false, message: err.message || "failed to get order" });
  }
};


exports.updateOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: "missing id" });
    const n = Number(id);
    if (Number.isNaN(n)) return res.status(400).json({ success: false, message: "invalid id" });

    const payload = req.body || {};
    const data = {};

    // whitelist allowed statuses (server-side safety)
    const ALLOWED = ["PENDING", "SHIPPED", "CANCELED"];
    if (payload.status) {
      const s = String(payload.status).toUpperCase();
      if (!ALLOWED.includes(s)) {
        return res.status(400).json({ success: false, message: `invalid status: ${payload.status}` });
      }
      data.status = s;
    }

    if (payload.shippingFee !== undefined) data.shippingFee = Number(payload.shippingFee || 0);
    if (payload.subtotal !== undefined) data.subtotal = Number(payload.subtotal || 0);
    if (payload.grandTotal !== undefined) data.grandTotal = Number(payload.grandTotal || 0);
    if (payload.placedAt) data.placedAt = new Date(payload.placedAt);

    const updated = await prisma.order.update({
      where: { id: BigInt(n) },
      data,
      include: { addresses: true, payments: true, shipments: true, items: { include: { product: true, variant: true } } }
    });

    return res.json({ success: true, data: normalizeResult(updated) });
  } catch (err) {
    console.error("admin.updateOrder error", err);
    return res.status(500).json({ success: false, message: err.message || "failed to update order" });
  }
};


exports.createShipment = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: "missing id" });
    const n = Number(id);
    if (Number.isNaN(n)) return res.status(400).json({ success: false, message: "invalid id" });

    const payload = req.body || {};
    const shipmentData = {
      orderId: BigInt(n),
      carrier: payload.carrier || payload.carrierName || "unknown",
      service: payload.service || null,
      trackingNo: payload.trackingNo || null,
      status: payload.status || null,
      shippedAt: payload.shippedAt ? new Date(payload.shippedAt) : null,
      labelUrl: payload.labelUrl || null
    };

    const shipment = await prisma.shipment.create({ data: shipmentData });

    if ((payload.status && payload.status.toUpperCase() === "SHIPPED") || payload.setOrderShipped) {
      await prisma.order.update({ where: { id: BigInt(n) }, data: { status: "SHIPPED" } });
    }

    const order = await prisma.order.findUnique({
      where: { id: BigInt(n) },
      include: { addresses: true, payments: true, shipments: true, items: { include: { product: true, variant: true } } }
    });

    return res.json({ success: true, data: normalizeResult(order) });
  } catch (err) {
    console.error("admin.createShipment error", err);
    return res.status(500).json({ success: false, message: err.message || "failed to create shipment" });
  }
};
