// server/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');   

/** แปลง user ให้พร้อมส่งออก (กัน BigInt พัง JSON) */
function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id.toString(),          // BigInt -> string
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** POST /api/auth/register */
async function register(req, res) {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก email, password และชื่อให้ครบถ้วน',
      });
    }

    // เช็ค email ซ้ำ
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว',
      });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,  // field ชื่อ password (map เป็น password_hash ใน DB)
        fullName,
        phone: phone || null,
      },
    });

    const safeUser = toSafeUser(user);

    // สร้าง JWT token (payload มี id, email, role)
    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email, role: safeUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถสมัครสมาชิกได้',
      error: err.message,
    });
  }
}


async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสผ่าน',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    const safeUser = toSafeUser(user);

    // สร้าง token: include id, email, role
    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email, role: safeUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'ไม่สามารถเข้าสู่ระบบได้',
      error: err.message,
    });
  }
}

module.exports = {
  register,
  login,
};
