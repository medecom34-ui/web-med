// server/test-orders.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.order.count();
  console.log("orders count:", c);
  const rows = await prisma.order.findMany({ take: 3 });
  console.log("sample:", rows);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
