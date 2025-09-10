const express = require("express");
const {
  createEntry,
  getMyEntries,
  getPublicEntries,
  updateEntry,
  deleteEntry,
} = require("../controllers/entryController");
const { protect } = require("../middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(null, `entry-${Date.now()}${path.extname(file.originalname)}`);
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
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

router.route("/").post(protect, upload.single("image"), createEntry);
router.route("/mine").get(protect, getMyEntries);
router.route("/public").get(getPublicEntries);
router
  .route("/:id")
  .patch(protect, upload.single("image"), updateEntry)
  .put(protect, upload.single("image"), updateEntry)
  .delete(protect, deleteEntry);

module.exports = router;
