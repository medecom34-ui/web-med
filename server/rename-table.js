// server/rename-table.js
// ใช้ CommonJS เพื่อความเข้ากันได้กับ Node ทั่วไป
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function tableExists(name) {
  const res = await prisma.$queryRawUnsafe(`SHOW TABLES LIKE '${name}'`);
  return Array.isArray(res) && res.length > 0;
}

async function main() {
  console.log("Start: rename `Order` -> `orders`");

  const hasOrder = await tableExists('Order');
  const hasOrders = await tableExists('orders');

  if (!hasOrder) {
    console.error("Abort: ไม่มีตารางชื่อ `Order` ใน DB ปัจจุบัน");
    await prisma.$disconnect();
    process.exit(1);
  }

  if (hasOrders) {
    console.error("Abort: มีตารางชื่อ `orders` อยู่แล้ว — ต้อง merge หรือจัดการก่อนที่จะ rename");
    console.error("ถ้าต้องการให้แทนที่: ลบ `orders` ก่อน หรือบอกฉันเพื่อให้สคริปต์ช่วย merge");
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    console.log("1) สร้างสำรอง: Order_backup");
    await prisma.$executeRawUnsafe('CREATE TABLE `Order_backup` LIKE `Order`');
    console.log("2) คัดลอกข้อมูลไปยัง Order_backup");
    await prisma.$executeRawUnsafe('INSERT INTO `Order_backup` SELECT * FROM `Order`');

    console.log("3) เรียก RENAME TABLE");
    await prisma.$executeRawUnsafe('RENAME TABLE `Order` TO `orders`');

    console.log("Rename สำเร็จ ✅");
  } catch (err) {
    console.error("เกิดข้อผิดพลาดระหว่างการรัน:", err);
    console.error("ข้อมูลสำรองอยู่ที่ตาราง `Order_backup` ถ้า create สำเร็จ");
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
