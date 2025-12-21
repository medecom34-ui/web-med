// server/src/controllers/productController.js
const prisma = require("../prisma/client");


function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeBigInt(v);
    }
    return out;
  }
  return obj;
}

// สินค้าตามหมวดหมู่
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categorySlug, subSlug, sub2Slug } = req.query;

    const targetSlug = sub2Slug || subSlug || categorySlug;
    if (!targetSlug) {
      return res.status(400).json({
        success: false,
        message: "ต้องมี categorySlug หรือ subSlug หรือ sub2Slug อย่างน้อย 1 ตัว",
      });
    }

    const category = await prisma.category.findUnique({
      where: { slug: targetSlug },
    });

    if (!category) {
      return res.json({ success: true, data: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { id: "asc" },
          take: 1,
        },
        media: {
          where: { type: "IMAGE" },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });

    const payload = products.map((p) => {
      const v = p.variants[0] || null;
      const img = p.media[0] || null;
      return {
        id: String(p.id),
        slug: p.slug,
        name: p.name,
        priceTHB: v ? Number(v.price) : null,
        imageUrl: img ? img.url : null,
      };
    });

    res.json({ success: true, data: payload });
  } catch (err) {
    console.error("getProductsByCategory error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// รายละเอียดสินค้า
exports.getProductDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "ต้องมี slug ของสินค้า",
      });
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { id: "asc" },
        },
        media: {
          where: { type: "IMAGE" },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบสินค้า",
      });
    }

    const mainVariant = product.variants[0] || null;

    const payload = {
      id: String(product.id),
      slug: product.slug,
      name: product.name,
      code: mainVariant ? mainVariant.sku : null,
      priceTHB: mainVariant ? Number(mainVariant.price) : null,
      description: product.longDesc || product.shortDesc || "-",
      category: product.category
        ? {
            id: String(product.category.id),
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      images: product.media.map((m) => ({
        id: String(m.id),
        url: m.url,
        alt: m.altText || "",
      })),
      variants: product.variants.map((v) => ({
        id: String(v.id),
        sku: v.sku,
        priceTHB: Number(v.price),
        onHand: v.onHand,
        reserved: v.reserved,
        attributesJson: v.attributesJson || {},
      })),
    };

    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error("getProductDetail error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getProductsBatch = async (req, res) => {
  try {
    let ids = [];
    let slugs = [];

    if (req.method === "GET") {
      if (req.query.ids) ids = String(req.query.ids).split(",").map(x => Number(x)).filter(n => !Number.isNaN(n));
      if (req.query.slugs) slugs = String(req.query.slugs).split(",").map(s => s.trim()).filter(Boolean);
    } else {
      ids = Array.isArray(req.body.ids) ? req.body.ids.map(x => Number(x)).filter(n => !Number.isNaN(n)) : [];
      slugs = Array.isArray(req.body.slugs) ? req.body.slugs.map(s => String(s).trim()).filter(Boolean) : [];
    }

    if (!ids.length && !slugs.length) {
      return res.status(400).json({ success: false, message: "Provide ids or slugs" });
    }

    const where = { OR: [] };
    if (ids.length) where.OR.push({ id: { in: ids } });
    if (slugs.length) where.OR.push({ slug: { in: slugs } });

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: { orderBy: { id: "asc" } },
        media: { orderBy: { sortOrder: "asc" } }
      }
    });

    // Convert DB results to safe JSON-friendly objects (strings for BigInt)
    const safe = serializeBigInt(products);

    // OPTIONAL: normalize fields clients expect (id as string, etc.)
    const normalized = (Array.isArray(safe) ? safe : Object.values(safe)).map(p => ({
      id: p.id != null ? String(p.id) : null,
      slug: p.slug || null,
      name: p.name || null,
      priceTHB: p.variants && p.variants[0] ? Number(p.variants[0].price) : (p.priceTHB ?? p.price ?? null),
      variants: (p.variants || []).map(v => ({
        id: v.id != null ? String(v.id) : null,
        sku: v.sku,
        price: v.price != null ? Number(v.price) : null,
        onHand: v.onHand,
        reserved: v.reserved
      })),
      media: (p.media || []).map(m => ({ id: m.id != null ? String(m.id) : null, url: m.url, altText: m.altText || "" }))
    }));

    return res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("getProductsBatch error:", err);
    return res.status(500).json({ success: false, message: "cannot load products", error: String(err && err.message ? err.message : err) });
  }
};


//สินค้ายอดนิยมและมาใหม่
exports.getPopularProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        shortDesc: "HOT",
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { id: "asc" },
          take: 1,
        },
        media: {
          where: { type: "IMAGE" },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "desc" },
      take: 8,
    });

    const payload = products.map((p) => {
      const v = p.variants[0] || null;
      const img = p.media[0] || null;

      return {
        id: String(p.id),
        slug: p.slug,
        name: p.name,
        sku: v ? v.sku : null,
        priceTHB: v ? Number(v.price) : null,
        imageUrl: img ? img.url : null,
      };
    });

    res.json({ success: true, data: payload });
  } catch (err) {
    console.error("getPopularProducts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getNewestProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        shortDesc: "NEW",
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { id: "asc" },
          take: 1,
        },
        media: {
          where: { type: "IMAGE" },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { id: "desc" },
      take: 8,
    });

    const payload = products.map((p) => {
      const v = p.variants[0] || null;
      const img = p.media[0] || null;

      return {
        id: String(p.id),
        slug: p.slug,
        name: p.name,
        sku: v ? v.sku : null,
        priceTHB: v ? Number(v.price) : null,
        imageUrl: img ? img.url : null,
      };
    });

    res.json({ success: true, data: payload });
  } catch (err) {
    console.error("getNewestProducts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
