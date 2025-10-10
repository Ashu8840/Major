const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  getPublicBooks,
  getSellerStatus,
  registerSeller,
  getSellerBooks,
  createBook,
  getSellerAnalytics,
  deleteSellerBook,
  getBookAccess,
  getBookReviews,
  submitBookReview,
  recordBookView,
  recordBookDownload,
  recordBookPurchase,
  recordBookRent,
  recordBookTip,
  getReaderBooks,
  updateReaderBook,
  removeReaderBook,
  addBookToWishlist,
  removeBookFromWishlist,
  getReaderBookStatuses,
} = require("../controllers/marketplaceController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

const storage = multer.memoryStorage();

const imageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];

const bookMimeTypes = [
  "application/pdf",
  "application/epub+zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB combined payload cap
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "cover") {
      if (imageMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error("Invalid cover image format"));
    }

    if (file.fieldname === "file") {
      if (
        bookMimeTypes.includes(file.mimetype) ||
        [".pdf", ".epub", ".doc", ".docx", ".txt"].includes(
          path.extname(file.originalname).toLowerCase()
        )
      ) {
        return cb(null, true);
      }
      return cb(new Error("Invalid book file format"));
    }

    cb(null, false);
  },
});

router.get("/books", getPublicBooks);

router.get("/seller/status", protect, getSellerStatus);
router.post("/seller/register", protect, registerSeller);
router.get("/seller/books", protect, getSellerBooks);
router.get("/seller/analytics", protect, getSellerAnalytics);
router.delete("/seller/books/:id", protect, deleteSellerBook);
router.get("/reader/books", protect, getReaderBooks);
router.patch("/reader/books/:id", protect, updateReaderBook);
router.delete("/reader/books/:id", protect, removeReaderBook);
router.post("/reader/status", protect, getReaderBookStatuses);

router.post(
  "/books",
  protect,
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  createBook
);

router.get("/books/:id/access", protect, getBookAccess);
router.get("/books/:id/reviews", getBookReviews);
router.post("/books/:id/reviews", protect, submitBookReview);
router.post("/books/:id/wishlist", protect, addBookToWishlist);
router.delete("/books/:id/wishlist", protect, removeBookFromWishlist);
router.post("/books/:id/view", recordBookView);
router.post("/books/:id/download", protect, recordBookDownload);
router.post("/books/:id/purchase", protect, recordBookPurchase);
router.post("/books/:id/rent", protect, recordBookRent);
router.post("/books/:id/tip", protect, recordBookTip);

module.exports = router;
