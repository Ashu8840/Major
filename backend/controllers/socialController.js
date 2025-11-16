const mongoose = require("mongoose");
const User = require("../models/User");
const Circle = require("../models/Circle");
const CircleMessage = require("../models/CircleMessage");

const MAX_FAVORITE_FRIENDS = 4;
const MAX_SUGGESTED = 4;
const MAX_VISIBLE_FRIENDS = 4;

const selectUserFields =
  "username displayName profileImage bio isActive lastActive userId";

const normaliseId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return String(value);
};

const serialiseUser = (user, currentUserId, extra = {}) => {
  if (!user) return null;

  const id = normaliseId(user);

  const base = {
    id,
    username: user.username || null,
    displayName: user.displayName || user.username || null,
    bio: user.bio || "",
    profileImage:
      user.profileImage?.url ||
      (typeof user.profileImage === "string" ? user.profileImage : null) ||
      null,
    isActive: Boolean(user.isActive),
    lastActive: user.lastActive || null,
    userId: user.userId || null,
  };

  if (typeof currentUserId !== "string") {
    currentUserId = currentUserId?.toString?.();
  }

  return {
    ...base,
    ...extra,
  };
};

const populateFollowData = async (user) => {
  if (!user) return user;

  await user.populate([
    { path: "followers.user", select: selectUserFields },
    { path: "following.user", select: selectUserFields },
  ]);

  return user;
};

const buildRelationshipMaps = (userDoc) => {
  const followers = (userDoc.followers || [])
    .map((entry) => entry.user)
    .filter(Boolean);
  const following = (userDoc.following || [])
    .map((entry) => entry.user)
    .filter(Boolean);

  const followerMap = new Map();
  followers.forEach((follower) => {
    followerMap.set(follower._id.toString(), follower);
  });

  const followingMap = new Map();
  following.forEach((target) => {
    followingMap.set(target._id.toString(), target);
  });

  const mutualIds = followers
    .filter((follower) => followingMap.has(follower._id.toString()))
    .map((user) => user._id.toString());

  return {
    followers,
    following,
    followerMap,
    followingMap,
    mutualIds,
  };
};

const getSocialOverview = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const currentUser = await populateFollowData(
      await User.findById(currentUserId).select("followers following social")
    );

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { followers, following, followerMap, followingMap, mutualIds } =
      buildRelationshipMaps(currentUser);

    const mutualFriends = mutualIds
      .map((id) => followerMap.get(id) || followingMap.get(id))
      .filter(Boolean);

    const favoriteFriendIds = (currentUser.social?.favoriteFriends || []).map(
      (id) => id.toString()
    );

    const favoriteFriends = mutualFriends
      .filter((friend) => favoriteFriendIds.includes(friend._id.toString()))
      .slice(0, MAX_VISIBLE_FRIENDS);

    const remainingMutuals = mutualFriends.filter(
      (friend) => !favoriteFriendIds.includes(friend._id.toString())
    );

    const filledFavorites = favoriteFriends.slice();
    for (const friend of remainingMutuals) {
      if (filledFavorites.length >= MAX_VISIBLE_FRIENDS) break;
      filledFavorites.push(friend);
    }

    const followersOnly = followers.filter(
      (follower) => !followingMap.has(follower._id.toString())
    );

    const suggestedFriends = followersOnly.slice(0, MAX_SUGGESTED);

    const serializeList = (list, extraFactory) =>
      list.map((item) =>
        serialiseUser(
          item,
          currentUserId,
          extraFactory ? extraFactory(item) : {}
        )
      );

    res.json({
      stats: {
        followers: followers.length,
        following: following.length,
        mutual: mutualFriends.length,
      },
      favoriteFriends: serializeList(filledFavorites, (user) => ({
        isFavorite: favoriteFriendIds.includes(user._id.toString()),
        isMutual: true,
      })),
      mutualFriends: serializeList(mutualFriends, (user) => ({
        isFavorite: favoriteFriendIds.includes(user._id.toString()),
        isMutual: true,
      })),
      suggestedFriends: serializeList(suggestedFriends, (user) => ({
        followsYou: true,
        isFollowing: followingMap.has(user._id.toString()),
      })),
      followers: serializeList(followers, (user) => ({
        followsYou: true,
        isFollowing: followingMap.has(user._id.toString()),
        isMutual: mutualIds.includes(user._id.toString()),
      })),
      following: serializeList(following, (user) => ({
        followsYou: followerMap.has(user._id.toString()),
        isFollowing: true,
        isMutual: mutualIds.includes(user._id.toString()),
      })),
    });
  } catch (error) {
    console.error("Social overview error:", error);
    res.status(500).json({ message: "Failed to load social data" });
  }
};

const searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { q = "" } = req.query;

    if (!q || !q.trim()) {
      return res.json({ results: [] });
    }

    const regex = new RegExp(q.trim(), "i");

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ username: regex }, { displayName: regex }, { userId: regex }],
    })
      .limit(15)
      .select(`${selectUserFields} followers following`)
      .lean();

    const currentUser = await User.findById(currentUserId)
      .select("followers following")
      .lean();

    const followerIds = new Set(
      (currentUser.followers || []).map((entry) => entry.user.toString())
    );
    const followingIds = new Set(
      (currentUser.following || []).map((entry) => entry.user.toString())
    );

    const results = users.map((user) => {
      const id = user._id.toString();
      return serialiseUser(user, currentUserId, {
        followsYou: followerIds.has(id),
        isFollowing: followingIds.has(id),
        isMutual: followerIds.has(id) && followingIds.has(id),
      });
    });

    res.json({ results });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
};

const updateFavoriteFriends = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { friendIds = [] } = req.body;

    if (!Array.isArray(friendIds)) {
      return res.status(400).json({ message: "friendIds must be an array" });
    }

    if (friendIds.length > MAX_FAVORITE_FRIENDS) {
      return res
        .status(400)
        .json({ message: `Select up to ${MAX_FAVORITE_FRIENDS} friends only` });
    }

    const currentUser = await populateFollowData(
      await User.findById(currentUserId).select("followers following social")
    );

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { mutualIds } = buildRelationshipMaps(currentUser);
    const mutualSet = new Set(mutualIds);

    for (const id of friendIds) {
      if (!mutualSet.has(id.toString())) {
        return res
          .status(400)
          .json({ message: "Only mutual friends can be favorited" });
      }
    }

    currentUser.social = currentUser.social || {};
    const sanitizedIds = [...new Set(friendIds.map((id) => normaliseId(id)))];
    currentUser.social.favoriteFriends = sanitizedIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    await currentUser.save();

    res.json({
      message: "Favorite friends updated",
      favoriteFriends: friendIds,
    });
  } catch (error) {
    console.error("Update favorite friends error:", error);
    res.status(500).json({ message: "Failed to update favorites" });
  }
};

const formatMember = (member, populateMap) => {
  const memberId = normaliseId(member.user);
  const userDoc = populateMap.get(memberId);
  return {
    id: memberId,
    role: member.role,
    joinedAt: member.joinedAt,
    user: userDoc
      ? serialiseUser(userDoc, null)
      : { id: memberId, username: null, displayName: null },
  };
};

const serialiseCircle = (
  circle,
  currentUserId,
  populateMap = new Map(),
  options = {}
) => {
  const { includeMembers = false } = options;
  const currentUserIdStr = currentUserId.toString();
  const ownerId = normaliseId(circle.owner);
  const owner = populateMap.get(ownerId) || circle.owner;
  const membership = circle.members.find(
    (member) => normaliseId(member.user) === currentUserIdStr
  );

  return {
    id: normaliseId(circle._id),
    name: circle.name,
    description: circle.description,
    visibility: circle.visibility,
    theme: circle.theme,
    requiresKey: circle.visibility === "private",
    owner: serialiseUser(owner, currentUserId),
    memberCount: circle.memberCount,
    lastActivityAt: circle.lastActivityAt,
    createdAt: circle.createdAt,
    updatedAt: circle.updatedAt,
    isPinned: membership ? Boolean(membership.isPinned) : false,
    membership: membership
      ? {
          role: membership.role,
          joinedAt: membership.joinedAt,
          isPinned: Boolean(membership.isPinned),
        }
      : null,
    membersPreview: circle.members
      .slice(0, 6)
      .map((member) => formatMember(member, populateMap)),
    ...(includeMembers
      ? {
          members: circle.members.map((member) =>
            formatMember(member, populateMap)
          ),
        }
      : {}),
  };
};

const buildPopulateMapForCircle = (circle) => {
  const map = new Map();
  if (circle.owner?._id) {
    map.set(circle.owner._id.toString(), circle.owner);
  }
  circle.members.forEach((member) => {
    if (member.user?._id) {
      map.set(member.user._id.toString(), member.user);
    }
  });
  return map;
};

const createCircle = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const {
      name,
      description = "",
      visibility = "public",
      joinKey,
      theme = "blue",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Circle name is required" });
    }

    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({ message: "Invalid visibility option" });
    }

    if (
      visibility === "private" &&
      (!joinKey || joinKey.toString().length !== 4)
    ) {
      return res
        .status(400)
        .json({ message: "Private circles require a 4-digit key" });
    }

    const circle = new Circle({
      name: name.trim(),
      description: description.trim(),
      owner: currentUserId,
      members: [
        {
          user: currentUserId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      visibility,
      theme,
    });

    if (visibility === "private") {
      await circle.setJoinKey(joinKey.toString());
    }

    await circle.save();

    await circle.populate("owner", selectUserFields);
    await circle.populate("members.user", selectUserFields);

    const populateMap = buildPopulateMapForCircle(circle);

    res.status(201).json({
      message: "Circle created",
      circle: serialiseCircle(circle, currentUserId, populateMap),
    });
  } catch (error) {
    console.error("Create circle error:", error);
    res.status(500).json({ message: "Failed to create circle" });
  }
};

const listCircles = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const circles = await Circle.find({})
      .populate("owner", selectUserFields)
      .populate("members.user", selectUserFields)
      .lean({ getters: true });

    const populateMap = new Map();
    circles.forEach((circle) => {
      if (circle.owner?._id) {
        populateMap.set(circle.owner._id.toString(), circle.owner);
      }
      circle.members.forEach((member) => {
        if (member.user?._id) {
          populateMap.set(member.user._id.toString(), member.user);
        }
      });
    });

    const serialised = circles.map((circle) =>
      serialiseCircle(circle, currentUserId, populateMap)
    );

    // Sort: pinned circles first, then by lastActivityAt
    serialised.sort((a, b) => {
      // Pinned circles come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // If both pinned or both not pinned, sort by lastActivityAt
      const dateA = new Date(a.lastActivityAt || 0).getTime();
      const dateB = new Date(b.lastActivityAt || 0).getTime();
      return dateB - dateA;
    });

    res.json({ circles: serialised });
  } catch (error) {
    console.error("List circles error:", error);
    res.status(500).json({ message: "Failed to load circles" });
  }
};

const ensureCircleMembership = (circle, userId) =>
  circle.members.some(
    (member) => normaliseId(member.user) === userId.toString()
  );

const joinCircle = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;
    const { key } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const circle = await Circle.findById(circleId)
      .select(
        "name description owner members visibility theme lastActivityAt joinKeyHash"
      )
      .populate("owner", selectUserFields)
      .populate("members.user", selectUserFields)
      .lean({ getters: true, virtuals: true })
      .exec();

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isMember = ensureCircleMembership(circle, currentUserId);
    if (isMember) {
      return res.status(200).json({ message: "Already a member" });
    }

    if (circle.visibility === "private") {
      const circleDoc = await Circle.findById(circleId).select(
        "joinKeyHash visibility members lastActivityAt"
      );
      if (!(await circleDoc.verifyJoinKey(key?.toString() || ""))) {
        return res.status(403).json({ message: "Invalid circle key" });
      }
      circleDoc.addMember(currentUserId);
      circleDoc.lastActivityAt = new Date();
      await circleDoc.save();
    } else {
      await Circle.findByIdAndUpdate(circleId, {
        $push: {
          members: {
            user: currentUserId,
            role: "member",
            joinedAt: new Date(),
          },
        },
        $set: { lastActivityAt: new Date() },
      });
    }

    const updatedCircle = await Circle.findById(circleId)
      .populate("owner", selectUserFields)
      .populate("members.user", selectUserFields)
      .lean({ virtuals: true, getters: true });

    const populateMap = buildPopulateMapForCircle(updatedCircle);

    res.json({
      message: "Joined circle",
      circle: serialiseCircle(updatedCircle, currentUserId, populateMap),
    });
  } catch (error) {
    console.error("Join circle error:", error);
    res.status(500).json({ message: "Failed to join circle" });
  }
};

const leaveCircle = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const circle = await Circle.findById(circleId).populate(
      "members.user",
      selectUserFields
    );

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const membership = circle.members.find(
      (member) => member.user._id.toString() === currentUserId.toString()
    );

    if (!membership) {
      return res
        .status(400)
        .json({ message: "You are not a member of this circle" });
    }

    const isOwner = circle.owner.toString() === currentUserId.toString();

    circle.removeMember(currentUserId);

    let transferInfo = null;

    if (isOwner) {
      const admins = circle.members.filter((member) => member.role === "admin");
      const members = circle.members.filter(
        (member) => member.role === "member"
      );
      const nextOwner = admins[0] || members[0];

      if (nextOwner) {
        circle.owner = nextOwner.user;
        circle.updateMemberRole(nextOwner.user, "owner");
        transferInfo = {
          newOwner: serialiseUser(nextOwner.user, currentUserId),
        };
      } else {
        await Circle.findByIdAndDelete(circleId);
        return res.json({ message: "Circle deleted", deleted: true });
      }
    }

    circle.lastActivityAt = new Date();
    await circle.save();

    res.json({ message: "Left circle", transfer: transferInfo });
  } catch (error) {
    console.error("Leave circle error:", error);
    res.status(500).json({ message: "Failed to leave circle" });
  }
};

const transferCircleOwnership = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    const circle = await Circle.findById(circleId).populate(
      "members.user",
      selectUserFields
    );

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.owner.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can transfer ownership" });
    }

    const targetMember = circle.members.find(
      (member) => member.user._id.toString() === memberId.toString()
    );

    if (!targetMember) {
      return res.status(404).json({ message: "Target member not found" });
    }

    circle.updateMemberRole(memberId, "owner");
    circle.updateMemberRole(currentUserId, "admin");
    circle.owner = memberId;
    circle.lastActivityAt = new Date();
    await circle.save();

    res.json({ message: "Ownership transferred" });
  } catch (error) {
    console.error("Transfer circle ownership error:", error);
    res.status(500).json({ message: "Failed to transfer ownership" });
  }
};

const removeCircleMember = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId, memberId } = req.params;

    const circle = await Circle.findById(circleId);

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.owner.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can remove members" });
    }

    if (circle.owner.toString() === memberId.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot remove the circle owner" });
    }

    const memberExists = circle.members.some(
      (member) => member.user.toString() === memberId.toString()
    );

    if (!memberExists) {
      return res.status(404).json({ message: "Member not found" });
    }

    circle.removeMember(memberId);
    circle.lastActivityAt = new Date();
    await circle.save();

    res.json({ message: "Member removed" });
  } catch (error) {
    console.error("Remove circle member error:", error);
    res.status(500).json({ message: "Failed to remove member" });
  }
};

const ensureCircleAccess = async (circleId, userId) => {
  const circle = await Circle.findById(circleId).select("visibility members");
  if (!circle) {
    return { circle: null, allowed: false };
  }

  if (circle.visibility === "public") {
    return { circle, allowed: ensureCircleMembership(circle, userId) };
  }

  const isMember = ensureCircleMembership(circle, userId);
  return { circle, allowed: isMember };
};

const getCircleDetails = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const circle = await Circle.findById(circleId)
      .populate("owner", selectUserFields)
      .populate("members.user", selectUserFields)
      .lean({ getters: true, virtuals: true });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isMember = ensureCircleMembership(circle, currentUserId);

    if (circle.visibility === "private" && !isMember) {
      return res
        .status(403)
        .json({ message: "Join the circle to view details" });
    }

    const populateMap = buildPopulateMapForCircle(circle);

    res.json({
      circle: serialiseCircle(circle, currentUserId, populateMap, {
        includeMembers: true,
      }),
    });
  } catch (error) {
    console.error("Get circle details error:", error);
    res.status(500).json({ message: "Failed to load circle" });
  }
};

const getCircleMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const { circle, allowed } = await ensureCircleAccess(
      circleId,
      currentUserId
    );

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (!allowed) {
      return res
        .status(403)
        .json({ message: "Join the circle to view messages" });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 5), 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * parsedLimit;

    const [messages, total] = await Promise.all([
      CircleMessage.find({ circle: circleId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate("sender", selectUserFields)
        .lean(),
      CircleMessage.countDocuments({ circle: circleId }),
    ]);

    res.json({
      messages: messages
        .slice()
        .reverse()
        .map((message) => ({
          id: message._id.toString(),
          circleId,
          sender: serialiseUser(message.sender, currentUserId),
          text: message.text,
          attachments: message.attachments || [],
          createdAt: message.createdAt,
          system: Boolean(message.system),
        })),
      pagination: {
        total,
        page: pageNumber,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1,
      },
    });
  } catch (error) {
    console.error("Get circle messages error:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

const postCircleMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;
    const { text = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const { circle, allowed } = await ensureCircleAccess(
      circleId,
      currentUserId
    );

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (!allowed) {
      return res
        .status(403)
        .json({ message: "Join the circle to send messages" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const message = await CircleMessage.create({
      circle: circleId,
      sender: currentUserId,
      text: text.trim(),
      attachments: [],
    });

    await Circle.findByIdAndUpdate(circleId, { lastActivityAt: new Date() });

    const populatedMessage = await CircleMessage.findById(message._id)
      .populate("sender", selectUserFields)
      .lean();

    const payload = {
      id: populatedMessage._id.toString(),
      circleId,
      sender: serialiseUser(populatedMessage.sender, currentUserId),
      text: populatedMessage.text,
      attachments: populatedMessage.attachments || [],
      createdAt: populatedMessage.createdAt,
      system: Boolean(populatedMessage.system),
    };

    // Broadcast to all clients in the circle room via Socket.IO
    const io = req.app.get("io");
    if (io) {
      // Broadcast to everyone in the room (including sender)
      io.to(`circle:${circleId}`).emit("circle:message", payload);
      console.log(`Broadcasted message to circle:${circleId}`, payload.id);
    }

    // Return the message to the sender
    res.status(201).json({ message: payload });
  } catch (error) {
    console.error("Post circle message error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

const deleteCircle = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const circle = await Circle.findById(circleId).select("owner");

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.owner.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the owner can delete this circle" });
    }

    await CircleMessage.deleteMany({ circle: circleId });
    await circle.deleteOne();

    res.json({ message: "Circle deleted" });
  } catch (error) {
    console.error("Delete circle error:", error);
    res.status(500).json({ message: "Failed to delete circle" });
  }
};

const togglePinCircle = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { circleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(circleId)) {
      return res.status(400).json({ message: "Invalid circle id" });
    }

    const circle = await Circle.findById(circleId);

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const memberIndex = circle.members.findIndex(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (memberIndex === -1) {
      return res
        .status(403)
        .json({ message: "You are not a member of this circle" });
    }

    // Toggle pin status
    circle.members[memberIndex].isPinned =
      !circle.members[memberIndex].isPinned;
    await circle.save();

    res.json({
      message: circle.members[memberIndex].isPinned
        ? "Circle pinned"
        : "Circle unpinned",
      isPinned: circle.members[memberIndex].isPinned,
    });
  } catch (error) {
    console.error("Toggle pin circle error:", error);
    res.status(500).json({ message: "Failed to toggle pin status" });
  }
};

module.exports = {
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
  togglePinCircle,
};
