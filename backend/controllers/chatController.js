const mongoose = require("mongoose");
const multer = require("multer");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");

const ATTACHMENT_LIMIT_MB = 20;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: ATTACHMENT_LIMIT_MB * 1024 * 1024,
  },
});

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(value);
};

const toMap = (value) => {
  if (!value) return new Map();
  if (value instanceof Map) return value;
  return new Map(Object.entries(value));
};

const normaliseProfileImage = (user) => {
  if (!user) return null;
  if (typeof user.profileImage === "string") {
    return { url: user.profileImage };
  }
  if (user.profileImage?.url) {
    return user.profileImage;
  }
  if (user.profilePicture) {
    return { url: user.profilePicture };
  }
  return null;
};

const buildParticipantPayload = (userDoc) => {
  if (!userDoc) return null;
  return {
    _id: userDoc._id,
    username: userDoc.username,
    displayName: userDoc.displayName || userDoc.username,
    profileImage: normaliseProfileImage(userDoc),
  };
};

const ensureDirectChat = async (currentUserId, targetUserId) => {
  const participants = [toObjectId(currentUserId), toObjectId(targetUserId)];

  let chat = await Chat.findOne({
    isGroup: false,
    participants: { $all: participants },
  });

  if (!chat) {
    chat = await Chat.create({
      participants,
      isGroup: false,
      unreadCounts: new Map([
        [participants[0].toString(), 0],
        [participants[1].toString(), 0],
      ]),
      lastMessageAt: new Date(),
      blockedBy: [],
      hiddenFor: [],
    });
  } else {
    if (!Array.isArray(chat.blockedBy)) {
      chat.blockedBy = [];
    }
    if (!Array.isArray(chat.hiddenFor)) {
      chat.hiddenFor = [];
    }
  }

  return chat;
};

const formatChatResponse = (chat, targetUser, currentUserId) => {
  const fallbackLastMessage = chat?.lastMessage || null;
  const unreadCounts = toMap(chat?.unreadCounts);
  const currentUnread = unreadCounts.get(currentUserId.toString()) || 0;
  const blockedBy = Array.isArray(chat?.blockedBy)
    ? chat.blockedBy.map((id) => id.toString())
    : [];
  const hiddenFor = Array.isArray(chat?.hiddenFor)
    ? chat.hiddenFor.map((id) => id.toString())
    : [];
  const currentUserStr = currentUserId?.toString();
  const targetUserStr = targetUser?._id?.toString?.();
  const isBlocked = currentUserStr ? blockedBy.includes(currentUserStr) : false;
  const isBlockedByTarget = targetUserStr
    ? blockedBy.includes(targetUserStr)
    : false;

  return {
    chatId: chat?._id?.toString() || null,
    targetUser: buildParticipantPayload(targetUser),
    lastMessage: fallbackLastMessage
      ? {
          messageId: fallbackLastMessage.messageId,
          sender: fallbackLastMessage.sender,
          text: fallbackLastMessage.text,
          mediaType: fallbackLastMessage.mediaType || null,
          previewUrl: fallbackLastMessage.previewUrl || null,
          createdAt: fallbackLastMessage.createdAt,
        }
      : null,
    lastMessageAt: chat?.lastMessageAt || null,
    unreadCount: currentUnread,
    blockedBy,
    hiddenFor,
    isBlocked,
    isBlockedByTarget,
    canMessage: !isBlocked && !isBlockedByTarget,
    canCall: !isBlocked && !isBlockedByTarget,
  };
};

const serialiseMessage = (messageDoc) => {
  if (!messageDoc) return null;
  return {
    id: messageDoc._id,
    chatId: messageDoc.chatId,
    senderId: messageDoc.sender,
    receiverId: messageDoc.receiver,
    text: messageDoc.text,
    media: messageDoc.media || [],
    status: messageDoc.status || "sent",
    callType: messageDoc.callType || null,
    callStatus: messageDoc.callStatus || null,
    callDuration: messageDoc.callDuration || 0,
    createdAt: messageDoc.createdAt,
    updatedAt: messageDoc.updatedAt,
  };
};

const detectMediaType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

const uploadAttachment = async (file, ownerId) => {
  if (!file) return null;

  const mediaType = detectMediaType(file.mimetype);

  const uploadOptions = {
    folder: "chat_attachments",
    resource_type: mediaType === "video" ? "video" : "auto",
  };

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(file.buffer);
  });

  const mediaDocument = await Media.create({
    owner: ownerId,
    url: result.secure_url,
    public_id: result.public_id,
    type: mediaType === "document" ? "image" : mediaType,
    size: file.size,
    width: result.width,
    height: result.height,
  });

  return {
    url: result.secure_url,
    cloudinaryId: result.public_id,
    type: mediaType,
    thumbUrl:
      mediaType === "image"
        ? result.secure_url
        : result.thumbnail_url || result.secure_url,
    duration: result.duration || undefined,
    size: file.size,
    mimeType: file.mimetype,
    mediaId: mediaDocument._id,
  };
};

const listChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId)
      .select("following")
      .populate(
        "following.user",
        "username displayName profileImage isActive lastActive"
      );

    const followingUsers =
      currentUser?.following?.map((item) => item.user).filter(Boolean) || [];

    const existingChats = await Chat.find({
      isGroup: false,
      participants: { $all: [currentUserId] },
    })
      .populate("participants", "username displayName profileImage")
      .lean();

    const chatByUser = new Map();
    const seenUsers = new Map();
    const combinedUsers = [];

    followingUsers.forEach((user) => {
      if (!user) return;
      const key = user._id.toString();
      if (seenUsers.has(key)) return;
      seenUsers.set(key, user);
      combinedUsers.push(user);
    });

    existingChats.forEach((chat) => {
      const counterpart = (chat.participants || []).find(
        (participant) => participant._id.toString() !== currentUserId.toString()
      );

      if (!counterpart) return;

      if (
        Array.isArray(chat.hiddenFor) &&
        chat.hiddenFor.some((id) => id?.toString() === currentUserId.toString())
      ) {
        return;
      }

      chatByUser.set(counterpart._id.toString(), chat);

      const key = counterpart._id.toString();
      if (!seenUsers.has(key)) {
        seenUsers.set(key, counterpart);
        combinedUsers.push(counterpart);
      }
    });

    const currentUserIdStr = currentUserId.toString();

    const chatPayload = combinedUsers
      .map((targetUser) => {
        const chat = chatByUser.get(targetUser._id.toString());
        return formatChatResponse(chat || null, targetUser, currentUserId);
      })
      .filter(
        (item) =>
          item &&
          item.targetUser &&
          !(item.hiddenFor || []).includes(currentUserIdStr)
      );

    chatPayload.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    res.json({ chats: chatPayload });
  } catch (error) {
    console.error("List chats error:", error);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const targetUser = await User.findById(targetId).select(
      "_id username displayName profileImage"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const chat = await ensureDirectChat(currentUserId, targetUser._id);

    const currentUserStr = currentUserId.toString();
    let metadataUpdated = false;

    if (Array.isArray(chat.hiddenFor)) {
      const filtered = chat.hiddenFor.filter(
        (id) => id?.toString() !== currentUserStr
      );
      if (filtered.length !== chat.hiddenFor.length) {
        chat.hiddenFor = filtered;
        metadataUpdated = true;
      }
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * parsedLimit;

    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    await Message.updateMany(
      {
        chatId: chat._id,
        receiver: currentUserId,
        status: { $ne: "read" },
      },
      {
        $addToSet: { readBy: currentUserId },
        $set: { status: "read" },
      }
    );

    const unreadCounts = toMap(chat.unreadCounts);
    unreadCounts.set(currentUserId.toString(), 0);
    chat.unreadCounts = unreadCounts;
    if (metadataUpdated) {
      chat.markModified("hiddenFor");
    }
    await chat.save();

    res.json({
      chatId: chat._id,
      targetUser: buildParticipantPayload(targetUser),
      messages: messages.reverse().map(serialiseMessage),
      page: pageNumber,
      limit: parsedLimit,
    });
  } catch (error) {
    console.error("Get conversation messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

const sendDirectMessageHandler = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetId } = req.params;
    const { text = "" } = req.body;

    const trimmedText = text.trim();

    const targetUser = await User.findById(targetId).select(
      "username displayName profileImage"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    if (!trimmedText && !req.file) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const chat = await ensureDirectChat(currentUserId, targetUser._id);

    const blockedBy = new Set(
      Array.isArray(chat.blockedBy)
        ? chat.blockedBy.map((id) => id.toString())
        : []
    );
    const currentUserStr = currentUserId.toString();
    const targetUserStr = targetUser._id.toString();

    if (blockedBy.has(targetUserStr)) {
      return res.status(403).json({
        message: "This user has blocked you. Messages are disabled.",
      });
    }

    if (blockedBy.has(currentUserStr)) {
      return res.status(403).json({
        message: "You have blocked this user. Unblock to send messages.",
      });
    }

    let attachment = null;
    if (req.file) {
      attachment = await uploadAttachment(req.file, currentUserId);
    }

    const messagePayload = {
      chatId: chat._id,
      sender: currentUserId,
      receiver: targetUser._id,
      text: trimmedText || (attachment ? "" : null),
      media: attachment ? [attachment] : [],
      status: "sent",
    };

    const message = await Message.create(messagePayload);

    const summaryText =
      trimmedText ||
      (attachment
        ? `Shared a ${
            attachment.type === "audio" ? "voice note" : attachment.type
          }`
        : "");

    const unreadCounts = toMap(chat.unreadCounts);
    const targetKey = targetUser._id.toString();
    unreadCounts.set(targetKey, (unreadCounts.get(targetKey) || 0) + 1);
    unreadCounts.set(currentUserId.toString(), 0);

    chat.lastMessage = {
      messageId: message._id,
      sender: currentUserId,
      text: summaryText,
      mediaType: attachment?.type || null,
      previewUrl: attachment?.thumbUrl || attachment?.url || null,
      createdAt: message.createdAt,
    };
    chat.lastMessageAt = message.createdAt;
    chat.unreadCounts = unreadCounts;

    let metadataUpdated = false;
    if (Array.isArray(chat.hiddenFor)) {
      const filtered = chat.hiddenFor.filter((id) => {
        const value = id?.toString();
        return value !== currentUserStr && value !== targetUserStr;
      });
      if (filtered.length !== chat.hiddenFor.length) {
        chat.hiddenFor = filtered;
        metadataUpdated = true;
      }
    }

    if (metadataUpdated) {
      chat.markModified("hiddenFor");
    }
    await chat.save();

    const responseMessage = serialiseMessage(message);

    const io = req.app.get("io");
    if (io) {
      const chatRoom = chat._id.toString();
      io.to(chatRoom).emit("receiveMessage", responseMessage);
      io.to(targetUser._id.toString()).emit("receiveMessage", responseMessage);
    }

    res.status(201).json({ message: responseMessage, chatId: chat._id });
  } catch (error) {
    console.error("Send direct message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

const blockUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetId } = req.params;

    if (currentUserId.toString() === targetId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const targetUser = await User.findById(targetId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const chat = await ensureDirectChat(currentUserId, targetUser._id);

    const blockedSet = new Set(
      Array.isArray(chat.blockedBy)
        ? chat.blockedBy.map((id) => id.toString())
        : []
    );
    const currentStr = currentUserId.toString();
    const targetStr = targetUser._id.toString();

    blockedSet.add(currentStr);

    chat.blockedBy = Array.from(blockedSet).map((id) => toObjectId(id));
    chat.markModified("blockedBy");
    await chat.save();

    const payload = {
      chatId: chat._id.toString(),
      participants: chat.participants.map((id) => id.toString()),
      blockedBy: Array.from(blockedSet),
      isBlocked: true,
      isBlockedByTarget: blockedSet.has(targetStr) && targetStr !== currentStr,
    };

    const io = req.app.get("io");
    if (io) {
      payload.participants.forEach((participantId) => {
        io.to(participantId).emit("chat:blockUpdate", payload);
      });
    }

    res.json({ message: "User blocked", ...payload });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ message: "Failed to block user" });
  }
};

const unblockUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetId } = req.params;

    const targetUser = await User.findById(targetId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const chat = await ensureDirectChat(currentUserId, targetUser._id);

    const blockedSet = new Set(
      Array.isArray(chat.blockedBy)
        ? chat.blockedBy.map((id) => id.toString())
        : []
    );
    const currentStr = currentUserId.toString();

    if (blockedSet.has(currentStr)) {
      blockedSet.delete(currentStr);
      chat.blockedBy = Array.from(blockedSet).map((id) => toObjectId(id));
      chat.markModified("blockedBy");
      await chat.save();
    }

    const targetStr = targetUser._id.toString();

    const payload = {
      chatId: chat._id.toString(),
      participants: chat.participants.map((id) => id.toString()),
      blockedBy: Array.from(blockedSet),
      isBlocked: false,
      isBlockedByTarget: blockedSet.has(targetStr) && targetStr !== currentStr,
    };

    const io = req.app.get("io");
    if (io) {
      payload.participants.forEach((participantId) => {
        io.to(participantId).emit("chat:blockUpdate", payload);
      });
    }

    res.json({ message: "User unblocked", ...payload });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({ message: "Failed to unblock user" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetId } = req.params;

    const targetUser = await User.findById(targetId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const chat = await Chat.findOne({
      isGroup: false,
      participants: {
        $all: [toObjectId(currentUserId), toObjectId(targetUser._id)],
      },
    });

    if (!chat) {
      return res.json({
        message: "Conversation removed",
        chatId: null,
        participants: [currentUserId.toString(), targetUser._id.toString()],
      });
    }

    const currentStr = currentUserId.toString();
    const hiddenSet = new Set(
      Array.isArray(chat.hiddenFor)
        ? chat.hiddenFor.map((id) => id.toString())
        : []
    );

    hiddenSet.add(currentStr);
    chat.hiddenFor = Array.from(hiddenSet).map((id) => toObjectId(id));
    chat.markModified("hiddenFor");
    await chat.save();

    const payload = {
      chatId: chat._id.toString(),
      participants: chat.participants.map((id) => id.toString()),
      removedFor: currentStr,
    };

    const io = req.app.get("io");
    if (io) {
      io.to(currentStr).emit("chat:deleted", payload);
    }

    res.json({ message: "Conversation removed", ...payload });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ message: "Failed to remove conversation" });
  }
};

const clearConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetId } = req.params;

    const targetUser = await User.findById(targetId).select("_id");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const participants = [
      toObjectId(currentUserId),
      toObjectId(targetUser._id),
    ];

    const chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: participants },
    });

    if (!chat) {
      return res.json({
        message: "Conversation already empty",
        chatId: null,
        participants: participants.map((id) => id.toString()),
      });
    }

    await Message.deleteMany({ chatId: chat._id });

    const unreadCounts = toMap(chat.unreadCounts);
    participants.forEach((participantId) => {
      unreadCounts.set(participantId.toString(), 0);
    });

    chat.lastMessage = null;
    chat.lastMessageAt = null;
    chat.unreadCounts = unreadCounts;
    await chat.save();

    const responsePayload = {
      message: "Conversation cleared",
      chatId: chat._id,
      participants: participants.map((id) => id.toString()),
      clearedBy: currentUserId.toString(),
    };

    const io = req.app.get("io");
    if (io) {
      const emitPayload = {
        chatId: chat._id.toString(),
        participants: responsePayload.participants,
        clearedBy: responsePayload.clearedBy,
      };

      io.to(chat._id.toString()).emit("chat:cleared", emitPayload);
      responsePayload.participants.forEach((participantId) => {
        io.to(participantId).emit("chat:cleared", emitPayload);
      });
    }

    res.json(responsePayload);
  } catch (error) {
    console.error("Clear conversation error:", error);
    res.status(500).json({ message: "Failed to clear conversation" });
  }
};

module.exports = {
  listChats,
  getConversationMessages,
  sendDirectMessage: [upload.single("attachment"), sendDirectMessageHandler],
  blockUser,
  unblockUser,
  deleteConversation,
  clearConversation,
};
