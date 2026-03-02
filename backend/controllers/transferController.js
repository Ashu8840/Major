const TransferSession = require("../models/TransferSession");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../services/cloudinary");

/** How long a grab session stays valid (milliseconds) */
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── REST handlers ───────────────────────────────────────────────

/**
 * POST /api/transfer/create
 * Body: { imageUrl, thumbnailUrl?, fileName?, mimeType? }
 *
 * Creates a "holding" transfer session for the authenticated user.
 */
const createTransferSession = async (req, res) => {
  try {
    const { imageUrl, thumbnailUrl, fileName, mimeType } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: "imageUrl is required" });
    }

    // Invalidate any lingering sessions for this user
    await TransferSession.deleteMany({
      userId: req.user._id,
      status: "holding",
    });

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = await TransferSession.create({
      sessionId,
      userId: req.user._id,
      imageUrl,
      thumbnailUrl: thumbnailUrl || "",
      fileName: fileName || "transferred-image.jpg",
      mimeType: mimeType || "image/jpeg",
      status: "holding",
      expiresAt,
    });

    // Broadcast to every device of the same user via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("transfer:created", {
        sessionId: session.sessionId,
        imageUrl: session.imageUrl,
        thumbnailUrl: session.thumbnailUrl,
        fileName: session.fileName,
        mimeType: session.mimeType,
        expiresAt: session.expiresAt,
      });
    }

    return res.status(201).json({
      sessionId: session.sessionId,
      imageUrl: session.imageUrl,
      thumbnailUrl: session.thumbnailUrl,
      fileName: session.fileName,
      mimeType: session.mimeType,
      status: session.status,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("createTransferSession error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create transfer session" });
  }
};

/**
 * POST /api/transfer/accept
 * Body: { sessionId }
 *
 * Accepts (consumes) a transfer session on the receiving device.
 */
const acceptTransferSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await TransferSession.findOne({
      sessionId,
      userId: req.user._id,
      status: "holding",
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res
        .status(404)
        .json({ message: "No active transfer session found" });
    }

    session.status = "consumed";
    await session.save();

    // Notify all user devices that the session was consumed
    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("transfer:accepted", {
        sessionId: session.sessionId,
        imageUrl: session.imageUrl,
        thumbnailUrl: session.thumbnailUrl,
        fileName: session.fileName,
        mimeType: session.mimeType,
      });
    }

    return res.json({
      sessionId: session.sessionId,
      imageUrl: session.imageUrl,
      thumbnailUrl: session.thumbnailUrl,
      fileName: session.fileName,
      mimeType: session.mimeType,
      status: "consumed",
    });
  } catch (error) {
    console.error("acceptTransferSession error:", error);
    return res
      .status(500)
      .json({ message: "Failed to accept transfer session" });
  }
};

/**
 * GET /api/transfer/active
 *
 * Returns the user's currently-active (holding) session, if any.
 */
const getActiveSession = async (req, res) => {
  try {
    const session = await TransferSession.findOne({
      userId: req.user._id,
      status: "holding",
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.json({ session: null });
    }

    return res.json({
      session: {
        sessionId: session.sessionId,
        imageUrl: session.imageUrl,
        thumbnailUrl: session.thumbnailUrl,
        fileName: session.fileName,
        mimeType: session.mimeType,
        expiresAt: session.expiresAt,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("getActiveSession error:", error);
    return res.status(500).json({ message: "Failed to get active session" });
  }
};

/**
 * DELETE /api/transfer/cancel
 *
 * Cancels any "holding" session the user owns.
 */
const cancelTransferSession = async (req, res) => {
  try {
    await TransferSession.deleteMany({
      userId: req.user._id,
      status: "holding",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("transfer:cancelled");
    }

    return res.json({ message: "Transfer session cancelled" });
  } catch (error) {
    console.error("cancelTransferSession error:", error);
    return res
      .status(500)
      .json({ message: "Failed to cancel transfer session" });
  }
};

/**
 * POST /api/transfer/upload
 * Multipart: image file
 *
 * Uploads an image to Cloudinary with NO resize/quality transformations
 * so the original quality is fully preserved for the transfer session.
 */
const uploadTransferImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Upload with zero transformations — preserve 100% original quality
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "airgrab_transfers",
      resource_type: "image",
    });

    // Generate a small thumbnail via on-the-fly Cloudinary URL (no re-encode of source)
    const thumbUrl = result.secure_url.replace(
      "/upload/",
      "/upload/w_400,c_limit,q_auto/",
    );

    return res.status(200).json({
      url: result.secure_url,
      thumbUrl,
    });
  } catch (err) {
    console.error("uploadTransferImage error:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
};

module.exports = {
  createTransferSession,
  acceptTransferSession,
  getActiveSession,
  cancelTransferSession,
  uploadTransferImage,
};
