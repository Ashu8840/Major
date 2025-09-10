const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");
const Entry = require("../models/Entry");
const Post = require("../models/Post");

const uploadMedia = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "dairy_app",
      transformation: [
        { width: 500, height: 500, crop: "limit" },
        { quality: "auto" },
      ],
    });

    const thumbResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "dairy_app_thumbs",
      transformation: [{ width: 150, height: 150, crop: "thumb" }],
    });

    const media = new Media({
      owner: req.user._id,
      url: result.secure_url,
      public_id: result.public_id,
      thumbUrl: thumbResult.secure_url,
      type: result.resource_type,
      size: result.bytes,
      width: result.width,
      height: result.height,
    });

    const savedMedia = await media.save();
    res.status(201).json(savedMedia);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error uploading file" });
  }
};

const getMyMedia = async (req, res) => {
  const media = await Media.find({ owner: req.user._id });
  res.json(media);
};

const deleteMedia = async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (media) {
    if (
      media.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Also remove from entries and posts
    await Entry.updateMany(
      { media: media._id },
      { $pull: { media: media._id } }
    );
    await Post.updateMany(
      { media: media._id },
      { $pull: { media: media._id } }
    );

    await cloudinary.uploader.destroy(media.public_id);
    await media.remove();
    res.json({ message: "Media removed" });
  } else {
    res.status(404).json({ message: "Media not found" });
  }
};

module.exports = { uploadMedia, getMyMedia, deleteMedia };
