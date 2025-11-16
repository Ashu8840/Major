const Entry = require("../models/Entry");
const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");

const createEntry = async (req, res) => {
  try {
    console.log("=== CREATE ENTRY DEBUG ===");
    console.log("Request body:", req.body);
    console.log(
      "File info:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
          }
        : "No file"
    );
    console.log("========================");

    const { title, content, tags, visibility, mood, isDraft } = req.body;

    // Convert isDraft to boolean properly
    const isDraftBoolean = isDraft === true || isDraft === "true";
    console.log("isDraft value:", isDraft, "converted to:", isDraftBoolean);

    // Validate required fields for published entries
    if (!isDraftBoolean && (!title?.trim() || !content?.trim())) {
      console.log(
        "Validation failed: missing title or content for published entry"
      );
      return res.status(400).json({
        message: "Title and content are required for published entries",
      });
    }

    // Parse tags if they're sent as a string
    let parsedTags = [];
    if (tags) {
      parsedTags =
        typeof tags === "string"
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : tags;
    }

    const entryData = {
      author: req.user._id,
      title: title || "Untitled Entry",
      content: content || "",
      tags: parsedTags,
      visibility: visibility || "private",
      mood: mood || "",
      isDraft: isDraftBoolean,
    };

    console.log("Entry data to save:", entryData);

    // Handle image upload if provided
    if (req.file) {
      try {
        console.log("Uploading image to Cloudinary:", req.file.path);
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "diary_entries",
          resource_type: "auto",
        });
        console.log("Cloudinary upload successful:", result.secure_url);

        // Create media record
        const media = new Media({
          owner: req.user._id,
          url: result.secure_url,
          type: result.resource_type,
          public_id: result.public_id,
          size: req.file.size,
        });

        const savedMedia = await media.save();
        console.log("Media record saved:", savedMedia._id);
        entryData.media = [savedMedia._id];
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(400).json({
          message: "Image upload failed",
          error: uploadError.message,
        });
      }
    } else {
      console.log("No image file in request");
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
  try {
    const entry = await Entry.findById(req.params.id).populate("media");

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    if (entry.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (Array.isArray(entry.media) && entry.media.length > 0) {
      await Promise.all(
        entry.media.map(async (mediaDoc) => {
          try {
            if (mediaDoc?.public_id) {
              await cloudinary.uploader.destroy(mediaDoc.public_id);
            }
          } catch (error) {
            console.warn("Failed to remove media from Cloudinary", error);
          }

          try {
            await Media.findByIdAndDelete(mediaDoc._id);
          } catch (error) {
            console.warn("Failed to delete media record", error);
          }
        })
      );
    }

    await Entry.deleteOne({ _id: entry._id });

    res.json({ message: "Entry removed" });
  } catch (error) {
    console.error("Delete entry error:", error);
    res.status(500).json({ message: "Failed to delete entry" });
  }
};

const getDraftEntries = async (req, res) => {
  try {
    const draftEntries = await Entry.find({
      author: req.user._id,
      isDraft: true,
    })
      .populate("media")
      .sort({ updatedAt: -1 });
    res.json(draftEntries);
  } catch (error) {
    console.error("Get draft entries error:", error);
    res.status(400).json({ message: error.message });
  }
};

const publishEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    if (entry.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Validate required fields before publishing
    if (!entry.title?.trim() || !entry.content?.trim()) {
      return res.status(400).json({
        message: "Title and content are required to publish entry",
      });
    }

    entry.isDraft = false;
    const publishedEntry = await entry.save();
    const populatedEntry = await Entry.findById(publishedEntry._id).populate(
      "media"
    );

    res.json(populatedEntry);
  } catch (error) {
    console.error("Publish entry error:", error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createEntry,
  getMyEntries,
  getPublicEntries,
  getDraftEntries,
  publishEntry,
  updateEntry,
  deleteEntry,
};
