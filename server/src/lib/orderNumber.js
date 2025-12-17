// server/src/lib/orderNumber.js
function pad(n, width=2){ return String(n).padStart(width,'0'); }

async function generateOrderNumber(prisma){
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth()+1);
  const DD = pad(d.getDate());
  const dayKey = `${YYYY}-${MM}-${DD}`; // matches OrderSequence.day @db.VarChar(10)

  // atomic upsert increment seq
  const seqRow = await prisma.orderSequence.upsert({
    where: { day: dayKey },
    update: { seq: { increment: 1 } },
    create: { day: dayKey, seq: 1 },
  });

  const seq = seqRow.seq || 1;
  const seqStr = String(seq).padStart(4,'0'); // 0001, 0002...
  return `ORD${YYYY}${MM}${DD}-${seqStr}`; // e.g. ORD20251122-0001
}

module.exports = { generateOrderNumber };
