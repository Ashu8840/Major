const express = require("express");
const {
  createEntry,
  getMyEntries,
  getPublicEntries,
  getDraftEntries,
  publishEntry,
  updateEntry,
  deleteEntry,
} = require("../controllers/entryController");
const { protect } = require("../middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory");
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    console.log("Multer destination called for file:", file.originalname);
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const filename = `entry-${Date.now()}${path.extname(file.originalname)}`;
    console.log("Multer filename generated:", filename);
    cb(null, filename);
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Images only!");
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log(
      "Multer fileFilter called for:",
      file.originalname,
      file.mimetype
    );
    checkFileType(file, cb);
  },
});

router.route("/").post(
  protect,
  upload.single("image"),
  (req, res, next) => {
    console.log("=== ENTRY ROUTE MIDDLEWARE ===");
    console.log("POST /api/entries");
    console.log("Body fields:", Object.keys(req.body));
    console.log("File received:", req.file ? "YES" : "NO");
    if (req.file) {
      console.log("File details:", {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    }
    console.log("============================");
    next();
  },
  createEntry
);
router.route("/mine").get(protect, getMyEntries);
router.route("/drafts").get(protect, getDraftEntries);
router.route("/public").get(getPublicEntries);
router.route("/:id/publish").patch(protect, publishEntry);
router
  .route("/:id")
  .patch(protect, upload.single("image"), updateEntry)
  .delete(protect, deleteEntry);

module.exports = router;
