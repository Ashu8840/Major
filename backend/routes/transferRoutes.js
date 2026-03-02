const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createTransferSession,
  acceptTransferSession,
  getActiveSession,
  cancelTransferSession,
  uploadTransferImage,
} = require("../controllers/transferController");

// Multer for transfer image uploads (disk storage, no size limit set here)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(null, `transfer-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

// All transfer routes require authentication
router.use(protect);

router.post("/upload", upload.single("image"), uploadTransferImage);
router.post("/create", createTransferSession);
router.post("/accept", acceptTransferSession);
router.get("/active", getActiveSession);
router.delete("/cancel", cancelTransferSession);

module.exports = router;
