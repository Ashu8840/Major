const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  listChats,
  getConversationMessages,
  sendDirectMessage,
  blockUser,
  unblockUser,
  deleteConversation,
  clearConversation,
} = require("../controllers/chatController");

const router = express.Router();

router.get("/", protect, listChats);
router.get("/:targetId/messages", protect, getConversationMessages);
router.post("/:targetId/messages", protect, ...sendDirectMessage);
router.post("/:targetId/block", protect, blockUser);
router.delete("/:targetId/block", protect, unblockUser);
router.delete("/:targetId/messages", protect, clearConversation);
router.delete("/:targetId", protect, deleteConversation);

module.exports = router;
