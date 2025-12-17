// server/src/controllers/orderController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generateOrderNumber } = require("../lib/orderNumber");


function normalizeValue(value) {
  if (value === null || value === undefined) return value;

  // BigInt
  if (typeof value === "bigint") return value.toString();

  // Date
  if (value instanceof Date) return value.toISOString();

  // Arrays first (สำคัญ)
  if (Array.isArray(value)) return value.map(normalizeValue);

  // If it's a Decimal instance (Prisma Decimal usually has constructor name "Decimal")
  if (typeof value === "object" && value !== null && value.constructor && value.constructor.name === "Decimal" && typeof value.toString === "function") {
    const s = value.toString();
    const n = Number(s);
    return Number.isNaN(n) ? s : n;
  }

  // Some Prisma Decimal values may be plain objects when JSONed: { s, e, d }
  if (typeof value === "object" && value !== null && "s" in value && "e" in value && "d" in value && Array.isArray(value.d)) {
    try {
      const chunks = value.d.map((v, i) => {
        const s = String(v);
        return i === 0 ? s : s.padStart(6, "0");
      });
      const mantissa = chunks.join("");
      const exp = Number(value.e);
      const pos = exp + 1;
      let numStr;
      if (pos <= 0) {
        numStr = "0." + "0".repeat(Math.abs(pos)) + mantissa;
      } else if (pos >= mantissa.length) {
        numStr = mantissa + "0".repeat(pos - mantissa.length);
      } else {
        numStr = mantissa.slice(0, pos) + "." + mantissa.slice(pos);
      }
      if (numStr.includes(".")) {
        numStr = numStr.replace(/\.?0+$/, "");
      }
      const n = Number(numStr);
      return Number.isNaN(n) ? numStr : n;
    } catch (e) {
      return value;
    }
  }

  // If it's an object that has a meaningful toString (but NOT arrays since checked above),
  // try to parse its toString() to number/string (safe guard)
  if (typeof value === "object" && value !== null && typeof value.toString === "function") {
    const ts = value.toString();
    // avoid default "[object Object]" or "[object Date]" results
    if (ts && ts !== "[object Object]" && ts !== "[object Date]") {
      const n = Number(ts);
      if (!Number.isNaN(n)) return n;
      return ts;
    }
  }

  // Objects -> recurse
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeValue(v);
    }
    return out;
  }

  return value;
}

/** helper to normalize whole result (array or object) */
function normalizeResult(obj) {
  return normalizeValue(obj);
}

function toNumberIfPossible(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

exports.createOrder = async (req, res) => {
  try {
    const payload = req.body || {};

    // normalize items from payload
    let items = (payload.items || []).map((i) => ({
      productId: toNumberIfPossible(i.productId),
      variantId: toNumberIfPossible(i.variantId),
      nameSnapshot: i.nameSnapshot || i.name || "",
      skuSnapshot: (i.skuSnapshot !== undefined && i.skuSnapshot !== null) ? String(i.skuSnapshot) : (i.sku || ""),
      qty: toNumberIfPossible(i.qty) || 1,
      unitPrice: Number((i.unitPrice !== undefined && i.unitPrice !== null) ? i.unitPrice : (i.price || 0)),
      lineTotal: Number(i.lineTotal || ((i.qty || 1) * ((i.unitPrice !== undefined && i.unitPrice !== null) ? i.unitPrice : (i.price || 0)))),
      image: i.image || null
    }));

    // เก็บเฉพาะ items ที่มี productId เท่านั้น
    const itemsWithProduct = items.filter(i => i.productId !== null);

    // สร้าง order หลัก
    const orderNumber = await generateOrderNumber(prisma);
    const userId = payload.userId ? BigInt(payload.userId) : null;

    const createData = {
      orderNumber,
      subtotal: Number(payload.subtotal || 0),
      shippingFee: Number(payload.shippingFee || 0),
      taxTotal: Number(payload.taxTotal || 0),
      grandTotal: Number(payload.grandTotal || 0),
      status: payload.status || "PENDING",
      placedAt: payload.placedAt ? new Date(payload.placedAt) : new Date()
    };

    if (userId) {
      createData.user = { connect: { id: userId } };
    }

    const createdOrder = await prisma.order.create({ data: createData });

    // สร้าง order items (เฉพาะที่มี productId)
    if (itemsWithProduct.length > 0) {
      const itemsDb = itemsWithProduct.map(it => ({
        orderId: Number(createdOrder.id),
        productId: Number(it.productId),
        variantId: (it.variantId != null) ? Number(it.variantId) : 0,
        nameSnapshot: it.nameSnapshot || "",
        skuSnapshot: (it.skuSnapshot !== undefined && it.skuSnapshot !== null) ? String(it.skuSnapshot) : "",
        qty: Number(it.qty || 1),
        unitPrice: Number(it.unitPrice || 0),
        lineTotal: Number(it.lineTotal || ((it.qty || 1) * (it.unitPrice || 0)))
      }));

      await prisma.orderItem.createMany({ data: itemsDb });
    }

    // Address
    if (payload.address) {
      await prisma.orderAddress.create({
        data: {
          orderId: createdOrder.id,
          type: payload.address.type || "SHIPPING",
          fullName: payload.address.fullName || "",
          phone: payload.address.phone || "",
          line1: payload.address.line1 || "-",
          subdistrict: payload.address.subdistrict || "",
          district: payload.address.district || "",
          province: payload.address.province || "",
          postcode: payload.address.postcode || "",
          countryCode: payload.address.countryCode || "TH"
        }
      });
    }

    // Initial payment row (optional)
    if (payload.payment) {
      await prisma.payment.create({
        data: {
          orderId: createdOrder.id,
          status: payload.payment.status || "PENDING",
          amount: Number(payload.payment.amount || 0),
          payerName: payload.payment.payerName || null,
          slipUrl: payload.payment.slipUrl || null
        }
      });
    }

    // ดึง order ใหม่พร้อม relations ที่ frontend ต้องการ
    const orderWithRelations = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: {
        items: {
          include: {
            variant: true,
            product: { include: { media: true } }
          }
        },
        addresses: true,
        payments: true,
        shipments: true
      }
    });

    return res.json({ success: true, data: normalizeResult(orderWithRelations) });
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ success: false, message: err.message || "create order failed" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const userIdRaw = req.query.userId ?? null;
    const where = {};

    if (userIdRaw) {
      const n = Number(userIdRaw);
      if (!Number.isNaN(n)) where.userId = BigInt(n);
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            variant: true,
            product: { include: { media: true } }
          }
        },
        addresses: true,
        payments: true,
        shipments: true
      }
    });

    return res.json({ success: true, data: normalizeResult(orders) });
  } catch (err) {
    console.error("getOrders error:", err);
    return res.status(500).json({ success: false, message: err.message || "failed to load orders" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: "missing id" });

    let where;
    const n = Number(id);
    if (!Number.isNaN(n) && id.trim() !== "") {
      where = { id: BigInt(n) };
    } else {
      where = { orderNumber: String(id) };
    }

    const order = await prisma.order.findUnique({
      where,
      include: {
        items: {
          include: {
            variant: true,
            product: { include: { media: true } }
          }
        },
        addresses: true,
        payments: true,
        shipments: true
      }
    });

    if (!order) return res.status(404).json({ success: false, message: "order not found" });

    return res.json({ success: true, data: normalizeResult(order) });
  } catch (err) {
    console.error("getOrder error:", err);
    return res.status(500).json({ success: false, message: err.message || "failed to load order" });
  }
};
