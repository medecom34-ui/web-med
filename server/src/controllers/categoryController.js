// server/src/controllers/categoryController.js
const prisma = require('../prisma/client');

// helper: แปลง BigInt → string ก่อนส่งออก (ถ้าจำเป็นใช้กับ categories)
function toSafeJson(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

async function getAllCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: toSafeJson(categories),
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้',
      error: error.message,
      code: error.code || null,
    });
  }
}

async function getCategoryById(req, res) {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id: BigInt(id) },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบหมวดหมู่',
      });
    }

    res.json({
      success: true,
      data: toSafeJson(category),
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้',
      error: error.message,
      code: error.code || null,
    });
  }
}

async function getProductsByCategorySlug(req, res) {
  try {
    const slug = req.params.slug;
    if (!slug) return res.status(400).json({ success: false, message: 'Missing slug' });

    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) return res.json({ success: true, data: [] });

    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { id: 'asc' },
          take: 1,
        },
        media: {
          where: { type: 'IMAGE' },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    });

    const payload = products.map(p => {
      const v = (p.variants && p.variants[0]) || null;
      const img = (p.media && p.media[0]) || null;

      return {
        id: p.id != null ? String(p.id) : null,
        slug: p.slug || null,
        name: p.name || null,
        shortDesc: p.shortDesc || null,
        // price จาก variant ถ้ามี, ถ้าไม่มาจาก product.price/priceTHB
        priceTHB: v ? Number(v.price) : (p.priceTHB ?? p.price ?? null),
        sku: v ? (v.sku || null) : (p.sku || null),
        code: v ? (v.code || null) : (p.code || null),
        variantId: v ? String(v.id) : null,
        imageUrl: img ? img.url : (p.imageUrl || null),
      };
    });


    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('getProductsByCategorySlug error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  getProductsByCategorySlug,
};
