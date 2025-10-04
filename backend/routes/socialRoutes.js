const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  getSocialOverview,
  searchUsers,
  updateFavoriteFriends,
  createCircle,
  listCircles,
  joinCircle,
  leaveCircle,
  transferCircleOwnership,
  removeCircleMember,
  getCircleDetails,
  getCircleMessages,
  postCircleMessage,
  deleteCircle,
} = require("../controllers/socialController");

const router = express.Router();

router.get("/overview", protect, getSocialOverview);
router.get("/search", protect, searchUsers);
router.post("/favorites", protect, updateFavoriteFriends);

router.route("/circles").get(protect, listCircles).post(protect, createCircle);

router.get("/circles/:circleId", protect, getCircleDetails);
router.post("/circles/:circleId/join", protect, joinCircle);
router.post("/circles/:circleId/leave", protect, leaveCircle);
router.post("/circles/:circleId/transfer", protect, transferCircleOwnership);
router.delete(
  "/circles/:circleId/members/:memberId",
  protect,
  removeCircleMember
);
router.delete("/circles/:circleId", protect, deleteCircle);

router
  .route("/circles/:circleId/messages")
  .get(protect, getCircleMessages)
  .post(protect, postCircleMessage);

module.exports = router;
