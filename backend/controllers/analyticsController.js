const Entry = require("../models/Entry");

const getMoodAnalytics = async (req, res) => {
  const { period } = req.query; // 'weekly' or 'monthly'
  const date = new Date();
  let startDate;

  if (period === "weekly") {
    startDate = new Date(date.setDate(date.getDate() - 7));
  } else if (period === "monthly") {
    startDate = new Date(date.setMonth(date.getMonth() - 1));
  } else {
    return res.status(400).json({ message: "Invalid period" });
  }

  try {
    const moodData = await Entry.aggregate([
      {
        $match: {
          author: req.user._id,
          createdAt: { $gte: startDate },
          mood: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$mood",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          mood: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);
    res.json(moodData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching mood analytics" });
  }
};

const getActivityAnalytics = async (req, res) => {
  try {
    const activityData = await Entry.aggregate([
      {
        $match: {
          author: req.user._id,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);
    res.json(activityData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching activity analytics" });
  }
};

module.exports = { getMoodAnalytics, getActivityAnalytics };
