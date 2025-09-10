const Entry = require("../models/Entry");
const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");

const createEntry = async (req, res) => {
  try {
    const { title, content, tags, visibility, mood } = req.body;

    // Parse tags if they're sent as a string
    let parsedTags = [];
    if (tags) {
      parsedTags =
        typeof tags === "string"
          ? tags.split(",").map((tag) => tag.trim())
          : tags;
    }

    const entryData = {
      author: req.user._id,
      title,
      content,
      tags: parsedTags,
      visibility: visibility || "private",
      mood,
    };

    // Handle image upload if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "diary_entries",
          resource_type: "auto",
        });

        // Create media record
        const media = new Media({
          user: req.user._id,
          url: result.secure_url,
          type: result.resource_type,
          publicId: result.public_id,
          size: req.file.size,
          filename: req.file.originalname,
        });

        const savedMedia = await media.save();
        entryData.media = [savedMedia._id];
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(400).json({ message: "Image upload failed" });
      }
    }

    const entry = new Entry(entryData);
    const createdEntry = await entry.save();

    // Populate media data in response
    const populatedEntry = await Entry.findById(createdEntry._id).populate(
      "media"
    );
    res.status(201).json(populatedEntry);
  } catch (error) {
    console.error("Create entry error:", error);
    res.status(400).json({ message: error.message });
  }
};

const getMyEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ author: req.user._id })
      .populate("media")
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    console.error("Get entries error:", error);
    res.status(400).json({ message: error.message });
  }
};

const getPublicEntries = async (req, res) => {
  const entries = await Entry.find({ visibility: "public" }).populate(
    "author",
    "username avatar"
  );
  res.json(entries);
};

const updateEntry = async (req, res) => {
  try {
    const { title, content, tags, visibility, mood } = req.body;
    const entry = await Entry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    if (entry.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Parse tags if they're sent as a string
    let parsedTags = entry.tags;
    if (tags) {
      parsedTags =
        typeof tags === "string"
          ? tags.split(",").map((tag) => tag.trim())
          : tags;
    }

    // Update entry fields
    entry.title = title || entry.title;
    entry.content = content || entry.content;
    entry.tags = parsedTags;
    entry.visibility = visibility || entry.visibility;
    entry.mood = mood || entry.mood;

    // Handle new image upload if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "diary_entries",
          resource_type: "auto",
        });

        // Create new media record
        const media = new Media({
          user: req.user._id,
          url: result.secure_url,
          type: result.resource_type,
          publicId: result.public_id,
          size: req.file.size,
          filename: req.file.originalname,
        });

        const savedMedia = await media.save();
        entry.media = [savedMedia._id]; // Replace existing media
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(400).json({ message: "Image upload failed" });
      }
    }

    const updatedEntry = await entry.save();
    const populatedEntry = await Entry.findById(updatedEntry._id).populate(
      "media"
    );
    res.json(populatedEntry);
  } catch (error) {
    console.error("Update entry error:", error);
    res.status(400).json({ message: error.message });
  }
};

const deleteEntry = async (req, res) => {
  const entry = await Entry.findById(req.params.id);

  if (entry) {
    if (entry.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }
    await entry.remove();
    res.json({ message: "Entry removed" });
  } else {
    res.status(404).json({ message: "Entry not found" });
  }
};

module.exports = {
  createEntry,
  getMyEntries,
  getPublicEntries,
  updateEntry,
  deleteEntry,
};
