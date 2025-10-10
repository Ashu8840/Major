const express = require("express");
const {
  createSupportTicket,
  getUserSupportTickets,
} = require("../controllers/supportController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", protect, createSupportTicket);
router.get("/mine", protect, getUserSupportTickets);

module.exports = router;
