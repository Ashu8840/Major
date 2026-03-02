const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createTransferSession,
  acceptTransferSession,
  getActiveSession,
  cancelTransferSession,
} = require("../controllers/transferController");

// All transfer routes require authentication
router.use(protect);

router.post("/create", createTransferSession);
router.post("/accept", acceptTransferSession);
router.get("/active", getActiveSession);
router.delete("/cancel", cancelTransferSession);

module.exports = router;
