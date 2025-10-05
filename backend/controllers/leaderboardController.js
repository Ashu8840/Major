const mongoose = require("mongoose");
const Entry = require("../models/Entry");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");

const XP_RULES = {
  diaryEntry: 50,
  communityPost: 50,
  likeReceived: 10,
  commentReceived: 14,
  streakDay: 25,
};

const LEVEL_STEP = 1000;

const clampNumber = (value, min, max) => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const createDateCondition = (variableRef, { startDate, endDate }) => {
  const conditions = [];
  if (startDate) {
    conditions.push({ $gte: [variableRef, startDate] });
  }
  if (endDate) {
    conditions.push({ $lte: [variableRef, endDate] });
  }

  if (conditions.length === 0) {
    return { $literal: true };
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return { $and: conditions };
};

const resolvePeriodRange = (period) => {
  const now = new Date();
  switch (period) {
    case "this-week": {
      const start = new Date(now);
      const day = start.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() + diff);
      return {
        period,
        startDate: start,
        endDate: now,
        label: "This Week",
      };
    }
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        period,
        startDate: start,
        endDate: now,
        label: "This Month",
      };
    }
    case "this-year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        period,
        startDate: start,
        endDate: now,
        label: `${now.getFullYear()}`,
      };
    }
    case "all-time":
    default:
      return {
        period: "all-time",
        startDate: null,
        endDate: null,
        label: "All Time",
      };
  }
};

const formatTimeLeft = (endDate) => {
  if (!endDate) return "";
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "Ends soon";
  }
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) {
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return `${diffHours}h left`;
  }
  return `${diffDays} days left`;
};

const ensureContribution = (map, key) => {
  if (!map.has(key)) {
    map.set(key, {
      diaryEntries: 0,
      communityPosts: 0,
      likesReceived: 0,
      commentsReceived: 0,
    });
  }
  return map.get(key);
};

const toObjectIdArray = (ids) =>
  ids.map((id) => new mongoose.Types.ObjectId(id));

const buildLeaderboardPayload = ({
  users,
  contributions,
  currentUserId,
  limit,
  periodMeta,
}) => {
  const userIndex = new Map();
  users.forEach((user) => {
    userIndex.set(user._id.toString(), user);
  });

  const rows = [];
  contributions.forEach((contrib, id) => {
    const userDoc = userIndex.get(id);
    if (!userDoc) return;

    const streakDays = userDoc?.stats?.dayStreak?.current || 0;
    const xpFromDiary = contrib.diaryEntries * XP_RULES.diaryEntry;
    const xpFromPosts = contrib.communityPosts * XP_RULES.communityPost;
    const xpFromLikes = contrib.likesReceived * XP_RULES.likeReceived;
    const xpFromComments = contrib.commentsReceived * XP_RULES.commentReceived;
    const xpFromStreak = streakDays * XP_RULES.streakDay;
    const totalXp =
      xpFromDiary + xpFromPosts + xpFromLikes + xpFromComments + xpFromStreak;

    const level = Math.max(1, Math.floor(totalXp / LEVEL_STEP) + 1);
    const levelFloor = (level - 1) * LEVEL_STEP;
    const xpIntoLevel = totalXp - levelFloor;
    const xpToNextLevel = Math.max(0, level * LEVEL_STEP - totalXp);
    const progressToNextLevel = clampNumber(
      Math.round((xpIntoLevel / LEVEL_STEP) * 100),
      0,
      100
    );

    rows.push({
      userId: id,
      username: userDoc.username,
      displayName: userDoc.displayName || userDoc.username,
      profileImage: userDoc.profileImage?.url || null,
      initials: (userDoc.displayName || userDoc.username || "")
        .charAt(0)
        .toUpperCase(),
      xp: totalXp,
      level,
      xpToNextLevel,
      progressToNextLevel,
      breakdown: {
        diaryEntries: contrib.diaryEntries,
        communityPosts: contrib.communityPosts,
        likesReceived: contrib.likesReceived,
        commentsReceived: contrib.commentsReceived,
        streak: streakDays,
        xp: {
          diaryEntries: xpFromDiary,
          communityPosts: xpFromPosts,
          likesReceived: xpFromLikes,
          commentsReceived: xpFromComments,
          streak: xpFromStreak,
        },
      },
    });
  });

  rows.sort(
    (a, b) => b.xp - a.xp || a.displayName.localeCompare(b.displayName)
  );

  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  const totalUsers = rows.length;
  const averageXp = totalUsers
    ? Math.round(rows.reduce((sum, row) => sum + row.xp, 0) / totalUsers)
    : 0;

  const rankings = rows.slice(0, limit);
  const currentUser = currentUserId
    ? rows.find((row) => row.userId === currentUserId.toString()) || null
    : null;

  if (currentUser) {
    currentUser.percentile = totalUsers
      ? clampNumber(
          100 - Math.round(((currentUser.rank - 1) / totalUsers) * 100),
          1,
          100
        )
      : 100;
  }

  return {
    period: periodMeta.period,
    label: periodMeta.label,
    generatedAt: new Date(),
    rankings,
    totals: {
      totalUsers,
      averageXp,
    },
    currentUser,
  };
};

const aggregateLeaderboard = async ({
  periodMeta,
  currentUserId,
  limit = 50,
}) => {
  const { startDate, endDate } = periodMeta;

  const entryMatch = {
    isDraft: { $ne: true },
  };
  if (startDate || endDate) {
    entryMatch.createdAt = {};
    if (startDate) {
      entryMatch.createdAt.$gte = startDate;
    }
    if (endDate) {
      entryMatch.createdAt.$lte = endDate;
    }
  }

  const postMatch = {};
  if (startDate || endDate) {
    postMatch.createdAt = {};
    if (startDate) {
      postMatch.createdAt.$gte = startDate;
    }
    if (endDate) {
      postMatch.createdAt.$lte = endDate;
    }
  }

  const commentMatch = {};
  if (startDate || endDate) {
    commentMatch.createdAt = {};
    if (startDate) {
      commentMatch.createdAt.$gte = startDate;
    }
    if (endDate) {
      commentMatch.createdAt.$lte = endDate;
    }
  }

  const postPipeline = [{ $match: postMatch }];
  const needsLikeFiltering = Boolean(startDate || endDate);
  if (needsLikeFiltering) {
    postPipeline.push({
      $addFields: {
        likesInRange: {
          $filter: {
            input: "$likes",
            as: "like",
            cond: createDateCondition("$$like.createdAt", {
              startDate,
              endDate,
            }),
          },
        },
      },
    });
  }
  postPipeline.push({
    $group: {
      _id: "$author",
      communityPosts: { $sum: 1 },
      likesReceived: {
        $sum: {
          $size: needsLikeFiltering ? "$likesInRange" : "$likes",
        },
      },
    },
  });

  const [entryAgg, postAgg, commentAgg] = await Promise.all([
    Entry.aggregate([
      { $match: entryMatch },
      {
        $group: {
          _id: "$author",
          diaryEntries: { $sum: 1 },
        },
      },
    ]),
    Post.aggregate(postPipeline),
    Comment.aggregate([
      { $match: commentMatch },
      {
        $lookup: {
          from: "posts",
          localField: "post",
          foreignField: "_id",
          as: "postDoc",
        },
      },
      { $unwind: "$postDoc" },
      {
        $group: {
          _id: "$postDoc.author",
          commentsReceived: { $sum: 1 },
        },
      },
    ]),
  ]);

  const contributions = new Map();

  entryAgg.forEach((item) => {
    if (!item?._id) return;
    const key = item._id.toString();
    const entry = ensureContribution(contributions, key);
    entry.diaryEntries += item.diaryEntries || 0;
  });

  postAgg.forEach((item) => {
    if (!item?._id) return;
    const key = item._id.toString();
    const entry = ensureContribution(contributions, key);
    entry.communityPosts += item.communityPosts || 0;
    entry.likesReceived += item.likesReceived || 0;
  });

  commentAgg.forEach((item) => {
    if (!item?._id) return;
    const key = item._id.toString();
    const entry = ensureContribution(contributions, key);
    entry.commentsReceived += item.commentsReceived || 0;
  });

  if (currentUserId) {
    ensureContribution(contributions, currentUserId.toString());
  }

  const userIds = Array.from(contributions.keys());

  if (userIds.length === 0) {
    return {
      period: periodMeta.period,
      label: periodMeta.label,
      generatedAt: new Date(),
      rankings: [],
      totals: { totalUsers: 0, averageXp: 0 },
      currentUser: null,
    };
  }

  const users = await User.find({ _id: { $in: toObjectIdArray(userIds) } })
    .select("username displayName profileImage stats.dayStreak")
    .lean();

  return buildLeaderboardPayload({
    users,
    contributions,
    currentUserId,
    limit,
    periodMeta,
  });
};

const getLeaderboard = async (req, res) => {
  try {
    const { period = "all-time" } = req.query;
    const periodMeta = resolvePeriodRange(period);
    const payload = await aggregateLeaderboard({
      periodMeta,
      currentUserId: req.user?._id,
      limit: 100,
    });
    return res.json(payload);
  } catch (error) {
    console.error("Failed to build leaderboard:", error);
    return res.status(500).json({ message: "Unable to load leaderboard" });
  }
};

const getSeasonalLeaderboard = async (req, res) => {
  try {
    const now = new Date();
    const monthMeta = resolvePeriodRange("this-month");
    const weekMeta = resolvePeriodRange("this-week");
    const yearMeta = resolvePeriodRange("this-year");

    const [monthly, weekly, yearly] = await Promise.all([
      aggregateLeaderboard({
        periodMeta: monthMeta,
        currentUserId: null,
        limit: 15,
      }),
      aggregateLeaderboard({
        periodMeta: weekMeta,
        currentUserId: null,
        limit: 15,
      }),
      aggregateLeaderboard({
        periodMeta: yearMeta,
        currentUserId: null,
        limit: 15,
      }),
    ]);

    const applyContestBonus = (items) =>
      items.map((item) => {
        const bonus =
          Math.round(item.xp * 0.08) + Math.max(0, (4 - item.rank) * 25);
        return {
          ...item,
          bonusXp: bonus,
          totalContestXp: item.xp + bonus,
        };
      });

    const seasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return res.json({
      contest: {
        title: `${now.toLocaleString("default", {
          month: "long",
        })} Inspiration Sprint`,
        description:
          "Earn bonus XP by sharing diary entries and community posts this season.",
        prize: "Top 3 earn a limited-edition badge and feature spotlight",
        timeLeft: formatTimeLeft(seasonEnd),
        endsAt: seasonEnd,
      },
      leaderboards: {
        monthly: applyContestBonus(monthly.rankings),
        weekly: applyContestBonus(weekly.rankings),
        yearly: applyContestBonus(yearly.rankings),
      },
    });
  } catch (error) {
    console.error("Failed to build seasonal leaderboard:", error);
    return res.status(500).json({ message: "Unable to load seasonal contest" });
  }
};

module.exports = {
  getLeaderboard,
  getSeasonalLeaderboard,
};
