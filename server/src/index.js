require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bodyParser = require("body-parser");

const app = express();

app.use(cors({
  origin: [
    "https://medecom34-ui.github.io",
  ],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true
}));
app.use(express.json());

// serve client static
const clientPath = path.join(__dirname, '..', '..', 'Client');
app.use(express.static(clientPath));
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// import routes
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes'); 
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const orderPaymentRoutes = require('./routes/orderPaymentRoutes');
const uploadCloudinaryRouter = require('./routes/uploadCloudinary');
const adminRoutes = require("./routes/adminRoutes");
const authMiddleware = require('./middleware/authMiddleware');


// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const base = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    cb(null, base + ext);
  }
});
const upload = multer({ storage });

const uploadController = require('./controllers/uploadController');
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
// use routes
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use("/api/products", productRoutes);

app.use("/api/orders", orderRoutes);          // order CRUD
app.use("/api/orders", orderPaymentRoutes);   // order payments
app.use(authMiddleware);
// upload endpoint
app.use('/api/uploads', uploadCloudinaryRouter);

app.use("/api/admin", adminRoutes);

app.use(express.static("public"));
// start server kub
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
