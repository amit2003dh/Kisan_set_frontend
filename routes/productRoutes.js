const router = require("express").Router();
const Product = require("../models/Product");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/auth");

/* -------------------- MULTER CONFIG -------------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/products";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `product-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files allowed"));
  }
});

/* -------------------- ADD PRODUCT -------------------- */

router.post("/add", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "DB not connected" });
    }

    const productData = {
      sellerId: req.userId,
      name: req.body.name,
      type: req.body.type,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      description: req.body.description,
      status: Number(req.body.stock) > 0 ? "Available" : "Out of Stock",
      verified: false,

      location: req.body.location ? JSON.parse(req.body.location) : undefined,
      contactInfo: req.body.contactInfo
        ? JSON.parse(req.body.contactInfo)
        : undefined
    };

    if (req.file) {
      productData.image = `/uploads/products/${req.file.filename}`;
    }

    const product = new Product(productData);
    await product.save();

    res.json(product);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- GET PRODUCTS -------------------- */
/* Buyer → verified products | Seller → own products */

router.get("/", async (req, res) => {
  try {
    console.log("🔍 GET PRODUCTS - Fetching products");
    console.log("🔍 Query params:", req.query);
    
    const query = req.query.sellerId
      ? { sellerId: req.query.sellerId }
      : { status: "Available" };

    console.log("🔍 Database query:", query);
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    
    console.log("✅ Products found:", products.length);
    console.log("📦 Product list:", products.map(p => ({ 
      id: p._id, 
      name: p.name, 
      type: p.type, 
      price: p.price,
      status: p.status 
    })));
    
    res.json(products);
  } catch (error) {
    console.error("❌ Get products error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* -------------------- MY PRODUCTS -------------------- */

router.get("/my-products", authMiddleware, async (req, res) => {
  const products = await Product.find({ sellerId: req.userId })
    .sort({ createdAt: -1 });
  res.json(products);
});

/* -------------------- UPDATE PRODUCT -------------------- */

router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    sellerId: req.userId
  });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const update = {
    ...req.body,
    price: req.body.price ? Number(req.body.price) : product.price,
    stock: req.body.stock ? Number(req.body.stock) : product.stock,
    status:
      req.body.stock !== undefined
        ? Number(req.body.stock) > 0
          ? "Available"
          : "Out of Stock"
        : product.status
  };

  if (req.file) {
    if (product.image) {
      const old = product.image.replace("/uploads/", "uploads/");
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    update.image = `/uploads/products/${req.file.filename}`;
  }

  if (req.body.location) update.location = JSON.parse(req.body.location);
  if (req.body.contactInfo) update.contactInfo = JSON.parse(req.body.contactInfo);

  const updated = await Product.findByIdAndUpdate(req.params.id, update, {
    new: true
  });

  res.json(updated);
});

/* -------------------- VERIFY / UNVERIFY PRODUCT -------------------- */

router.put("/:id/status", authMiddleware, async (req, res) => {
  const { verified } = req.body;

  const product = await Product.findOne({
    _id: req.params.id,
    sellerId: req.userId
  });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  product.verified = Boolean(verified);
  await product.save();

  res.json(product);
});

/* -------------------- DELETE PRODUCT -------------------- */

router.delete("/:id", authMiddleware, async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    sellerId: req.userId
  });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (product.image) {
    const img = product.image.replace("/uploads/", "uploads/");
    if (fs.existsSync(img)) fs.unlinkSync(img);
  }

  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* -------------------- DECREASE STOCK (ORDER) -------------------- */

router.put("/:id/decrease-stock", async (req, res) => {
  const { quantity } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (product.stock < quantity) {
    return res.status(400).json({ error: "Insufficient stock" });
  }

  product.stock -= quantity;
  product.status = product.stock === 0 ? "Out of Stock" : "Available";
  await product.save();

  res.json(product);
});

module.exports = router;
