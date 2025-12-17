// server/scripts/makeAdmin.js
require('dotenv').config(); // เอา DATABASE_URL จาก .env
const prisma = require('../src/prisma/client');

async function main() {
  // รับอีเมลจาก arg หลังคำสั่ง เช่น npm run make-admin -- test@example.com
  const email = process.argv[2];

  if (!email) {
    console.error('❌ กรุณาระบุอีเมล เช่น: npm run make-admin -- test@example.com');
    process.exit(1);
  }

  console.log(`🔎 กำลังเปลี่ยน role ของผู้ใช้: ${email} เป็น ADMIN ...`);

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
  });

  console.log('✅ เปลี่ยนสำเร็จ');
  console.log({
    id: user.id.toString(),
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((err) => {
    console.error('❌ เกิดข้อผิดพลาด:', err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
