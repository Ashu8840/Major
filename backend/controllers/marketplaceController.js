const path = require("path");
const MarketplaceSeller = require("../models/MarketplaceSeller");
const MarketplaceBook = require("../models/MarketplaceBook");
const cloudinary = require("../services/cloudinary");
const mongoose = require("mongoose");

const buildRegex = (value) => ({ $regex: value, $options: "i" });

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag).trim()).filter(Boolean);
      }
    } catch (err) {
      // ignore JSON parse errors, fallback to comma separated string
    }

    return value
      .split(/[,#]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const uploadToCloudinary = async (file, options = {}) => {
  if (!file) return null;

  const base64 = file.buffer.toString("base64");
  const dataUri = `data:${file.mimetype};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, options);

  return {
    url: result.secure_url || result.url,
    secureUrl: result.secure_url || result.url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    filename: result.public_id,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
};

const normalizeFileField = (file) => {
  if (!file) return file;
  return {
    ...file,
    url: file.secureUrl || file.url,
    secureUrl: file.secureUrl || file.url,
  };
};
const buildDownloadUrl = (file) => {
  if (!file) return "";

  if (file.publicId) {
    try {
      const attachmentName =
        file.originalName ||
        `${file.filename || path.basename(file.publicId)}${
          file.format ? `.${file.format}` : ""
        }`;
      const downloadOptions = {
        resource_type: file.resourceType || "raw",
        attachment: attachmentName,
        format: file.format,
        secure: true,
        type: "upload",
        flags: "attachment",
      };

      if (typeof cloudinary?.utils?.download_url === "function") {
        return cloudinary.utils.download_url(file.publicId, downloadOptions);
      }

      if (typeof cloudinary?.utils?.url === "function") {
        const rawUrl = cloudinary.utils.url(file.publicId, downloadOptions);
        if (rawUrl) return rawUrl;
      }

      if (typeof cloudinary?.url === "function") {
        const rawUrl = cloudinary.url(file.publicId, downloadOptions);
        if (rawUrl) return rawUrl;
      }
    } catch (error) {
      console.error("Failed to build Cloudinary download URL", error);
    }
  }

  const directUrl = file.secureUrl || file.url;
  if (!directUrl) return "";

  try {
    const url = new URL(directUrl);
    if (!url.searchParams.has("download")) {
      url.searchParams.set("download", "1");
    }
    return url.toString();
  } catch (error) {
    return directUrl;
  }
};

const ensureSeller = async (userId, { allowPending = false } = {}) => {
  const seller = await MarketplaceSeller.findOne({ user: userId });

  if (!seller) {
    const error = new Error("Seller profile not found");
    error.statusCode = 404;
    error.code = "SELLER_NOT_FOUND";
    throw error;
  }

  if (!allowPending && seller.status !== "approved") {
    const error = new Error("Seller profile is not approved yet");
    error.statusCode = 403;
    error.code = "SELLER_NOT_APPROVED";
    throw error;
  }

  return seller;
};

const formatBookResponse = (bookDoc, options = {}) => {
  if (!bookDoc) return null;

  const includeFile = options.includeFile !== false;
  const includeReviews = options.includeReviews === true;

  const source =
    typeof bookDoc.toObject === "function"
      ? bookDoc.toObject({ virtuals: true })
      : { ...bookDoc };

  const coverImage = normalizeFileField(source.coverImage);
  const file = includeFile ? normalizeFileField(source.file) : undefined;
  const reviews = Array.isArray(source.reviews) ? source.reviews : [];

  const result = {
    ...source,
    coverImage,
    currency: source.currency || "INR",
    isFree: (source.price || 0) <= 0,
  };

  const stats = result.stats || {};
  const ratingsCount = Number(stats.ratingsCount || 0);
  const averageRatingValue = Number(stats.averageRating || 0);
  result.reviewSummary = {
    averageRating: Number.isFinite(averageRatingValue)
      ? Math.round(averageRatingValue * 10) / 10
      : 0,
    ratingsCount,
  };

  if (includeReviews) {
    result.reviews = reviews.map((review) => ({
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user,
      userSnapshot: review.userSnapshot,
    }));
  } else {
    delete result.reviews;
  }

  if (includeFile) {
    result.file = file;
    if (result.file) {
      result.file.downloadUrl = buildDownloadUrl(result.file);
    }
  } else {
    delete result.file;
  }

  return result;
};

const recalculateBookRating = (book) => {
  if (!book) return;

  const reviews = Array.isArray(book.reviews) ? book.reviews : [];
  const stats = book.stats || {};

  if (!reviews.length) {
    stats.averageRating = 0;
    stats.ratingsCount = 0;
  } else {
    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    );
    const average = total / reviews.length;
    stats.averageRating = Number.isFinite(average)
      ? Number(average.toFixed(2))
      : 0;
    stats.ratingsCount = reviews.length;
  }

  book.stats = stats;
};

const toReviewPayload = (review) => ({
  id: review._id,
  rating: review.rating,
  title: review.title,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  user: review.user,
  userSnapshot: review.userSnapshot,
});

const getSortOption = (sort) => {
  switch (sort) {
    case "rating":
      return { "stats.averageRating": -1, createdAt: -1 };
    case "newest":
      return { createdAt: -1 };
    case "price-low":
      return { price: 1 };
    case "price-high":
      return { price: -1 };
    case "downloads":
      return { "stats.downloads": -1, createdAt: -1 };
    case "trending":
    default:
      return { "stats.views": -1, trendingScore: -1, createdAt: -1 };
  }
};

const handleControllerError = (res, error, fallbackMessage) => {
  const status = error.statusCode || 500;
  const message = error.message || fallbackMessage;

  console.error(fallbackMessage, error);
  return res.status(status).json({
    message,
    code: error.code,
  });
};

exports.getPublicBooks = async (req, res) => {
  try {
    const { search, genre, price, sort = "trending", limit = 60 } = req.query;

    const filter = { status: "published" };

    if (genre && genre !== "all") {
      filter.genre = genre;
    }

    if (price === "free") {
      filter.price = 0;
    } else if (price === "paid") {
      filter.price = { $gt: 0 };
    }

    if (search) {
      filter.$or = [
        { title: buildRegex(search) },
        { description: buildRegex(search) },
        { tags: buildRegex(search) },
      ];
    }

    const books = await MarketplaceBook.find(filter)
      .populate("seller", "storeName status")
      .populate("author", "username displayName profileImage")
      .sort(getSortOption(sort))
      .limit(Math.min(Number(limit) || 60, 120))
      .lean({ virtuals: true });

    const formattedBooks = books.map((book) =>
      formatBookResponse(book, { includeFile: false })
    );

    res.json({
      books: formattedBooks,
      meta: {
        count: books.length,
      },
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch marketplace books"
    );
  }
};

exports.getBookAccess = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await MarketplaceBook.findById(id)
      .populate("seller", "storeName status user")
      .populate("author", "username displayName profileImage");

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const isSellerUser =
      String(book.author?._id || book.author) === String(req.user._id) ||
      String(book.seller?.user || book.seller) === String(req.user._id);

    if (!isSellerUser && book.status !== "published") {
      return res.status(403).json({ message: "Book is not available" });
    }

    const formatted = formatBookResponse(book, { includeReviews: true });
    const viewerUrl = formatted.file?.secureUrl || formatted.file?.url || "";
    const downloadUrl =
      formatted.file?.downloadUrl || buildDownloadUrl(formatted.file);

    const { file, reviews, ...bookPayload } = formatted;

    const userReview = Array.isArray(reviews)
      ? reviews.find(
          (review) =>
            review.user && String(review.user) === String(req.user._id)
        )
      : null;

    res.json({
      book: bookPayload,
      viewerUrl,
      downloadUrl,
      userReview,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch book access details"
    );
  }
};

exports.getBookReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 25);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await MarketplaceBook.findById(id).lean({ virtuals: true });

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.status !== "published") {
      return res.status(403).json({ message: "Book is not available" });
    }

    const total = Array.isArray(book.reviews) ? book.reviews.length : 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const startIndex = (safePage - 1) * limit;

    const sorted = Array.isArray(book.reviews)
      ? [...book.reviews].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        )
      : [];

    const paginated = sorted.slice(startIndex, startIndex + limit);

    const reviews = paginated.map((review) => toReviewPayload(review));

    res.json({
      reviews,
      summary: {
        averageRating: Number(book.stats?.averageRating || 0),
        ratingsCount: Number(book.stats?.ratingsCount || 0),
      },
      meta: {
        total,
        page: safePage,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch book reviews");
  }
};

exports.submitBookReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const book = await MarketplaceBook.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const isSellerUser =
      String(book.author?._id || book.author) === String(req.user._id) ||
      String(book.seller?.user || book.seller) === String(req.user._id);

    if (!isSellerUser && book.status !== "published") {
      return res.status(403).json({ message: "Book is not available" });
    }

    const snapshot = {
      displayName: req.user.displayName || req.user.username,
      username: req.user.username,
      avatar: req.user.profileImage?.url || "",
    };

    const reviewsArray = Array.isArray(book.reviews) ? book.reviews : [];
    book.reviews = reviewsArray;

    const existingReview = reviewsArray.find(
      (item) => String(item.user) === String(req.user._id)
    );

    let reviewDoc;
    let isNewReview = false;

    if (existingReview) {
      existingReview.rating = numericRating;
      existingReview.title = title?.trim() || "";
      existingReview.comment = comment?.trim() || "";
      existingReview.updatedAt = new Date();
      existingReview.userSnapshot = snapshot;
      reviewDoc = existingReview;
    } else {
      const newReview = {
        user: req.user._id,
        rating: numericRating,
        title: title?.trim() || "",
        comment: comment?.trim() || "",
        userSnapshot: snapshot,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reviewsArray.push(newReview);
      reviewDoc = reviewsArray[reviewsArray.length - 1];
      isNewReview = true;
      book.appendActivity({
        type: "review",
        user: req.user._id,
        note: "New review submitted",
      });
    }

    book.markModified("reviews");
    recalculateBookRating(book);
    await book.save();

    const responseReview = toReviewPayload(reviewDoc);

    res.status(isNewReview ? 201 : 200).json({
      review: responseReview,
      summary: {
        averageRating: book.stats.averageRating,
        ratingsCount: book.stats.ratingsCount,
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to submit review");
  }
};

exports.getSellerStatus = async (req, res) => {
  try {
    const seller = await MarketplaceSeller.findOne({
      user: req.user._id,
    }).lean({ virtuals: true });

    res.json({
      status: seller?.status || "not-registered",
      seller,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch seller status");
  }
};

exports.registerSeller = async (req, res) => {
  try {
    const {
      storeName,
      bio,
      contactEmail,
      contactPhone,
      website,
      socialLinks = {},
    } = req.body;

    if (!storeName) {
      return res.status(400).json({ message: "Store name is required" });
    }

    const payload = {
      storeName: storeName.trim(),
      bio,
      contactEmail,
      contactPhone,
      website,
      socialLinks,
      status: "approved",
      autoApproved: true,
      approvedAt: new Date(),
      approvalNotes: "Automatically approved until admin review is available",
    };

    const existing = await MarketplaceSeller.findOne({ user: req.user._id });

    if (existing) {
      Object.assign(existing, payload);
      const updated = await existing.save();
      return res.status(200).json({
        seller: updated.toObject({ virtuals: true }),
        status: updated.status,
      });
    }

    const seller = await MarketplaceSeller.create({
      user: req.user._id,
      ...payload,
    });

    res.status(201).json({
      seller: seller.toObject({ virtuals: true }),
      status: seller.status,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to register seller");
  }
};

exports.getSellerBooks = async (req, res) => {
  try {
    const seller = await ensureSeller(req.user._id, { allowPending: true });

    const books = await MarketplaceBook.find({ seller: seller._id })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    res.json({
      books: books.map(formatBookResponse),
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch seller books");
  }
};

exports.createBook = async (req, res) => {
  try {
    const seller = await ensureSeller(req.user._id);

    const {
      title,
      description,
      genre,
      language,
      price,
      tags,
      status = "published",
      pages,
      featured,
    } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    if (!req.files || !req.files.file || !req.files.file[0]) {
      return res.status(400).json({ message: "Book file is required" });
    }

    const coverFile = req.files?.cover?.[0];
    const bookFile = req.files.file[0];

    if (coverFile && coverFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Cover image must be under 5MB" });
    }

    if (bookFile.size > 50 * 1024 * 1024) {
      return res.status(400).json({ message: "Book file must be under 50MB" });
    }

    const [coverUpload, bookUpload] = await Promise.all([
      coverFile
        ? uploadToCloudinary(coverFile, {
            folder: "marketplace/covers",
            resource_type: "image",
            transformation: [
              { width: 600, height: 900, crop: "fill", gravity: "auto" },
            ],
            overwrite: false,
          })
        : null,
      uploadToCloudinary(bookFile, {
        folder: "marketplace/books",
        resource_type: bookFile.mimetype === "application/pdf" ? "raw" : "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      }),
    ]);

    if (!bookUpload) {
      return res.status(500).json({ message: "Failed to process book file" });
    }

    const book = new MarketplaceBook({
      seller: seller._id,
      author: req.user._id,
      title: title.trim(),
      description: description.trim(),
      genre: genre || "other",
      language: language || "English",
      price: Number(price) >= 0 ? Number(price) : 0,
      tags: parseTags(tags),
      currency: req.body.currency || seller.preferences?.currency || "USD",
      status,
      pages: pages ? Number(pages) : undefined,
      featured: featured === "true" || featured === true,
      coverImage: coverUpload || undefined,
      file: bookUpload,
    });

    book.appendActivity({
      type: "created",
      user: req.user._id,
      note: "Listing created",
    });

    await book.save();

    const populated = await MarketplaceBook.findById(book._id)
      .populate("seller", "storeName status")
      .populate("author", "username displayName profileImage")
      .lean({ virtuals: true });

    res.status(201).json({
      book: formatBookResponse(populated),
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create marketplace book"
    );
  }
};

exports.getSellerAnalytics = async (req, res) => {
  try {
    const seller = await ensureSeller(req.user._id, { allowPending: true });

    const books = await MarketplaceBook.find({ seller: seller._id }).lean({
      virtuals: true,
    });

    const totals = books.reduce(
      (acc, book) => {
        const stats = book.stats || {};
        acc.totalEarnings += stats.revenue || 0;
        acc.totalSales += stats.purchases || 0;
        acc.totalViews += stats.views || 0;
        acc.totalDownloads += stats.downloads || 0;
        acc.totalFavorites += stats.favorites || 0;
        acc.ratingSum += (stats.averageRating || 0) * (stats.ratingsCount || 0);
        acc.ratingCount += stats.ratingsCount || 0;
        acc.totalReviews += stats.ratingsCount || 0;
        return acc;
      },
      {
        totalEarnings: 0,
        totalSales: 0,
        totalViews: 0,
        totalDownloads: 0,
        totalFavorites: 0,
        ratingSum: 0,
        ratingCount: 0,
        totalReviews: 0,
      }
    );

    const averageRating =
      totals.ratingCount > 0 ? totals.ratingSum / totals.ratingCount : 0;

    const topBooks = books
      .map((book) => ({
        id: book._id,
        title: book.title,
        earnings: book.stats?.revenue || 0,
        sales: book.stats?.purchases || 0,
        views: book.stats?.views || 0,
        downloads: book.stats?.downloads || 0,
        averageRating: book.stats?.averageRating || 0,
        coverImage: book.coverImage,
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 6);

    const recentActivity = books
      .flatMap((book) =>
        (book.activity || []).map((activity) => ({
          ...activity,
          bookId: book._id,
          bookTitle: book.title,
        }))
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15);

    const recentReviews = books
      .flatMap((book) =>
        (book.reviews || []).map((review) => ({
          reviewId: review._id,
          bookId: book._id,
          bookTitle: book.title,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          createdAt: review.createdAt,
          userSnapshot: review.userSnapshot,
        }))
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 20);

    res.json({
      overview: {
        totalEarnings: Number(totals.totalEarnings.toFixed(2)),
        totalSales: totals.totalSales,
        totalViews: totals.totalViews,
        totalDownloads: totals.totalDownloads,
        totalFavorites: totals.totalFavorites,
        averageRating: Number(averageRating.toFixed(2)),
        booksPublished: books.filter((book) => book.status === "published")
          .length,
        totalReviews: totals.totalReviews,
      },
      topBooks,
      recentActivity,
      recentReviews,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to fetch analytics");
  }
};

exports.recordBookView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await MarketplaceBook.findById(id);

    if (!book || book.status !== "published") {
      return res.status(404).json({ message: "Book not found" });
    }

    book.stats.views = (book.stats.views || 0) + 1;
    book.stats.lastViewAt = new Date();
    book.trendingScore = (book.trendingScore || 0) + 1;

    book.appendActivity({
      type: "view",
      user: req.user?._id,
    });

    await book.save();

    res.json({
      stats: book.stats,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to record view");
  }
};

exports.recordBookDownload = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await MarketplaceBook.findById(id);

    if (!book || book.status !== "published") {
      return res.status(404).json({ message: "Book not found" });
    }

    book.stats.downloads = (book.stats.downloads || 0) + 1;
    book.stats.lastDownloadAt = new Date();

    book.appendActivity({
      type: "download",
      user: req.user?._id,
    });

    await book.save();

    const normalizedFile = normalizeFileField(book.file);

    res.json({
      stats: book.stats,
      downloadUrl: buildDownloadUrl(normalizedFile),
      viewerUrl: normalizedFile?.secureUrl || normalizedFile?.url,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to record download");
  }
};

exports.recordBookPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const book = await MarketplaceBook.findById(id);

    if (!book || book.status !== "published") {
      return res.status(404).json({ message: "Book not found" });
    }

    const price = book.price || 0;
    if (price <= 0) {
      return res.status(400).json({ message: "Book is free" });
    }

    book.stats.purchases = (book.stats.purchases || 0) + 1;
    book.stats.revenue = Number((book.stats.revenue || 0) + price);
    book.stats.lastPurchaseAt = new Date();

    book.appendActivity({
      type: "purchase",
      amount: price,
      user: req.user?._id,
    });

    await book.save();

    const normalizedFile = normalizeFileField(book.file);

    res.json({
      stats: book.stats,
      downloadUrl: buildDownloadUrl(normalizedFile),
      viewerUrl: normalizedFile?.secureUrl || normalizedFile?.url,
    });
  } catch (error) {
    return handleControllerError(res, error, "Failed to record purchase");
  }
};
