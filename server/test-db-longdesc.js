// test-db-longdesc.js
// Usage:
// 1) ensure .env contains DATABASE_URL pointing to your Railway DB
// 2) run: npx prisma generate
// 3) run: node test-db-longdesc.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const longDescSample = `รายละเอียดสินค้า
1. ขนาดเตียงมีความยาว 2,125 มิลลิเมตร กว้าง 970 มิลลิเมตร ความสูง 430-790 มิลลิเมตร
2. โครงสร้างของเตียงผลิตจากเหล็กพ่นสี
3. พนักหัวเตียง – ท้ายเตียง ทำจากพลาสติก ABS
4. ราวกั้นเตียงทำจากอลูมิเนียม สามารถปรับขึ้น-ลงได้
5. ล้อทั้ง 4 ล้อ มีขนาด 5 นิ้ว มีเบรกทั้ง 4 ล้อ สามารถล็อคล้อได้
6. สามารถปรับเตียงได้ 3 ฟังก์ชั่น ด้วยมือหมุนดังนี้
6.1 ปรับระดับพนักพิงได้ตั้งแต่ 0-75 องศา (±5 องศา)
6.2 ปรับระดับปลายเท้าได้ตั้งแต่ 0-40 องศา (±5 องศา)
6.3 ปรับระดับความสูงได้ตั้งแต่ 430-790 มิลลิเมตร
`; // ปรับข้อความตรงนี้ได้ตามต้องการ

async function main(){
  try {
    console.log("1) เชื่อมต่อ DB ผ่าน Prisma...");

    // ตรวจสอบ connection แบบง่าย (query current timestamp)
    const now = await prisma.$queryRaw`SELECT NOW() as now;`;
    console.log("DB connected. now =", now[0]?.now ?? now);

    // ตรวจสอบชนิดคอลัมน์ longDesc (MySQL)
    console.log("\n2) ตรวจสอบชนิดคอลัมน์ longDesc ในตาราง Product...");
    const colInfo = await prisma.$queryRaw`
      SELECT COLUMN_TYPE, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Product' 
        AND COLUMN_NAME = 'longDesc'
        AND TABLE_SCHEMA = DATABASE();
    `;
    if (!colInfo || colInfo.length === 0) {
      console.log("  ! ไม่พบคอลัมน์ longDesc ในตาราง Product (หรือชื่อ schema/table ต่างกัน)");
    } else {
      console.log("  ColumnType:", colInfo[0].COLUMN_TYPE, "| DataType:", colInfo[0].DATA_TYPE);
    }

    // พยายาม insert test row (จะใช้ slug ไม่ซ้ำ)
    const testSlug = 'test-longdesc-' + Date.now();
    console.log("\n3) ลอง INSERT product ทดสอบ (slug =", testSlug, ") ...");
    const created = await prisma.product.create({
      data: {
        slug: testSlug,
        name: "TEST : longDesc insert",
        brand: "TEST",
        shortDesc: "ทดสอบ insert longDesc แบบยาว",
        longDesc: longDescSample,
        isActive: true,
        categoryId: null
      }
    });
    console.log("  ✅ Inserted product id =", created.id);

    // อ่านกลับมาเพื่อยืนยัน
    const fetched = await prisma.product.findUnique({ where: { id: created.id } });
    console.log("\n4) ตรวจสอบข้อมูลที่อ่านกลับมา (ย่อ):");
    console.log("  id:", fetched.id, "slug:", fetched.slug);
    console.log("  longDesc length:", fetched.longDesc ? fetched.longDesc.length : 0);
    console.log("  longDesc preview:", (fetched.longDesc || "").slice(0,200).replace(/\n/g,' '), "...");
    
    // ลบ test row (ถ้าต้องการเก็บไว้ก็ไม่ต้องลบ)
    await prisma.product.delete({ where: { id: created.id } });
    console.log("\n5) ลบ test row เรียบร้อย");

  } catch (err) {
    console.error("\n⚠️ เกิดข้อผิดพลาด:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
