import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoStorefront,
  IoCloudUpload,
  IoWallet,
  IoStar,
  IoEye,
  IoDownload,
  IoHeart,
  IoSearch,
  IoAnalytics,
  IoCheckmarkCircle,
  IoDocument,
  IoImage,
  IoLockClosed,
  IoAlertCircle,
  IoTime,
  IoCash,
  IoTrendingUp,
  IoClose,
  IoBookOutline,
  IoChatbubbleEllipsesOutline,
  IoStarOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import {
  API_HOST,
  createMarketplaceBook,
  getMarketplaceBookAccess,
  getMarketplaceBooks,
  getMarketplaceSellerAnalytics,
  getMarketplaceSellerBooks,
  getMarketplaceSellerStatus,
  recordMarketplaceBookDownload,
  recordMarketplaceBookPurchase,
  recordMarketplaceBookView,
  registerMarketplaceSeller,
  addMarketplaceWishlist,
  removeMarketplaceWishlist,
  getReaderBookStatuses,
  updateReaderBook,
  deleteMarketplaceBook,
} from "../utils/api";
import { downloadFileFromUrl, sanitizeFilename } from "../utils/fileDownload";

const genreOptions = [
  { value: "all", label: "All genres" },
  { value: "fiction", label: "Fiction" },
  { value: "non-fiction", label: "Non-fiction" },
  { value: "romance", label: "Romance" },
  { value: "fantasy", label: "Fantasy" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "mystery", label: "Mystery" },
  { value: "thriller", label: "Thriller" },
  { value: "self-help", label: "Self-help" },
  { value: "business", label: "Business" },
];

const priceOptions = [
  { value: "all", label: "All prices" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const sortOptions = [
  { value: "trending", label: "Trending" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "downloads", label: "Most downloaded" },
  { value: "price-low", label: "Price: Low to high" },
  { value: "price-high", label: "Price: High to low" },
];

const sellerTabs = new Set(["my-books", "upload", "analytics"]);

const ACTIVITY_PAGE_SIZE = 5;
const TOP_BOOKS_PAGE_SIZE = 3;
const ANALYTICS_REVIEW_PAGE_SIZE = 4;

const activityLabels = {
  created: "New listing",
  view: "View",
  download: "Download",
  purchase: "Purchase",
  review: "Review",
};

const initialBookForm = {
  title: "",
  description: "",
  genre: "fiction",
  language: "English",
  price: "",
  pages: "",
  tags: "",
  status: "published",
};

const formatCurrencyValue = (value) => {
  const amount = Number(value || 0);
  const fractionDigits = amount % 1 === 0 ? 0 : 2;

  try {
    const formatted = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: fractionDigits,
    }).format(amount);
    return `Rs ${formatted}`;
  } catch (error) {
    return `Rs ${amount.toFixed(fractionDigits)}`;
  }
};

const formatRelativeTime = (input) => {
  if (!input) return "just now";

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  const diff = date.getTime() - Date.now();
  const units = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
    ["second", 1000],
  ];

  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === "second") {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }

  return "just now";
};

const getActivityVisuals = (type) => {
  const map = {
    created: {
      icon: IoCloudUpload,
      bg: "bg-sky-50",
      color: "text-sky-500",
    },
    view: {
      icon: IoEye,
      bg: "bg-blue-50",
      color: "text-blue-500",
    },
    download: {
      icon: IoDownload,
      bg: "bg-purple-50",
      color: "text-purple-500",
    },
    purchase: {
      icon: IoCash,
      bg: "bg-green-50",
      color: "text-green-500",
    },
    review: {
      icon: IoStar,
      bg: "bg-amber-50",
      color: "text-amber-500",
    },
  };

  return map[type] || map.view;
};

const buildAssetUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_HOST}${value.startsWith("/") ? value : `/${value}`}`;
};

const resolveCoverUrl = (coverImage) => {
  const raw = coverImage?.secureUrl || coverImage?.url;
  return raw ? buildAssetUrl(raw) : "";
};

const resolveFileUrl = (file) => {
  const raw = file?.secureUrl || file?.url;
  return raw ? (raw.startsWith("http") ? raw : buildAssetUrl(raw)) : "";
};

const resolveDownloadUrl = (file) => {
  const raw = file?.downloadUrl || file?.secureUrl || file?.url;
  return raw ? (raw.startsWith("http") ? raw : buildAssetUrl(raw)) : "";
};

export default function Marketplace() {
  const { user, userProfile } = useContext(AuthContext);
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();
  const { hasEnough, deduct } = useWallet();

  const requestWalletTopUp = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wallet:open"));
    }
  }, []);

  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState("");

  const [seller, setSeller] = useState(null);
  const [sellerStatus, setSellerStatus] = useState(
    isAuthenticated ? "loading" : "not-registered"
  );
  const [sellerLoading, setSellerLoading] = useState(false);

  const [myBooks, setMyBooks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [accessModal, setAccessModal] = useState(null);
  const [isProcessingAccess, setIsProcessingAccess] = useState(false);
  const [activeActionBookId, setActiveActionBookId] = useState(null);
  const [downloadingBookId, setDownloadingBookId] = useState(null);
  const [activityPage, setActivityPage] = useState(1);
  const [topBooksPage, setTopBooksPage] = useState(1);
  const [analyticsReviewPage, setAnalyticsReviewPage] = useState(1);
  const [readerStatuses, setReaderStatuses] = useState({});
  const [wishlistProcessing, setWishlistProcessing] = useState({});
  const [deletingBookIds, setDeletingBookIds] = useState({});

  const [registrationForm, setRegistrationForm] = useState({
    storeName: userProfile?.displayName || userProfile?.username || "",
    bio: "",
    contactEmail: userProfile?.email || "",
    contactPhone: "",
    website: "",
  });
  const [isRegisteringSeller, setIsRegisteringSeller] = useState(false);

  const [bookForm, setBookForm] = useState(initialBookForm);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [bookFile, setBookFile] = useState(null);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  useEffect(() => {
    setRegistrationForm((prev) => ({
      ...prev,
      storeName:
        prev.storeName ||
        userProfile?.displayName ||
        userProfile?.username ||
        "",
      contactEmail: prev.contactEmail || userProfile?.email || "",
    }));
  }, [userProfile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    setBooksError("");

    try {
      const params = { sort: sortBy };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedGenre !== "all") params.genre = selectedGenre;
      if (priceFilter !== "all") params.price = priceFilter;

      console.log("[Marketplace] Fetching books with params:", params);
      const data = await getMarketplaceBooks(params);
      console.log("[Marketplace] Response data:", data);

      const booksData = data?.books || data || [];
      console.log("[Marketplace] Books count:", booksData.length);
      setBooks(booksData);
    } catch (error) {
      console.error("[Marketplace] Error:", error);
      console.error("[Marketplace] Error response:", error.response?.data);
      const message =
        error.response?.data?.message || "Unable to load marketplace books";
      setBooksError(message);
    } finally {
      setBooksLoading(false);
    }
  }, [searchQuery, selectedGenre, priceFilter, sortBy]);

  const refreshReaderStatuses = useCallback(
    async (ids = [], options = {}) => {
      if (!isAuthenticated) {
        setReaderStatuses({});
        return;
      }

      const targetIds = Array.isArray(ids) ? ids.filter(Boolean) : [];

      if (!targetIds.length) {
        setReaderStatuses({});
        return;
      }

      try {
        const data = await getReaderBookStatuses(targetIds);
        const incoming = data?.statuses || {};
        if (options.merge) {
          setReaderStatuses((prev) => {
            const next = { ...prev };
            targetIds.forEach((id) => {
              if (incoming[id]) {
                next[id] = incoming[id];
              } else {
                delete next[id];
              }
            });
            return next;
          });
        } else {
          setReaderStatuses(incoming);
        }
      } catch (error) {
        setReaderStatuses({});
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    if (!isAuthenticated) {
      setReaderStatuses({});
      return;
    }

    if (!books.length) {
      setReaderStatuses({});
      return;
    }

    refreshReaderStatuses(books.map((item) => item._id));
  }, [books, isAuthenticated, refreshReaderStatuses]);

  const loadSellerContext = useCallback(async () => {
    if (!isAuthenticated) {
      setSeller(null);
      setSellerStatus("not-registered");
      setMyBooks([]);
      setAnalytics(null);
      return;
    }

    setSellerLoading(true);

    try {
      const { seller: sellerData, status } = await getMarketplaceSellerStatus();
      setSeller(sellerData || null);
      setSellerStatus(status || "not-registered");

      if (status === "approved") {
        const [booksResponse, analyticsResponse] = await Promise.all([
          getMarketplaceSellerBooks(),
          getMarketplaceSellerAnalytics(),
        ]);

        setMyBooks(booksResponse?.books || []);
        setAnalytics(analyticsResponse || null);
      } else {
        setMyBooks([]);
        setAnalytics(null);
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to load seller dashboard";
      toast.error(message);
      setSeller(null);
      setSellerStatus("error");
    } finally {
      setSellerLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadSellerContext();
  }, [loadSellerContext]);

  const sellerApproved = sellerStatus === "approved";

  const deleteToastIdRef = useRef(null);

  const handleDeleteBook = useCallback(
    async (book, { refreshBrowse = true, refreshSeller = true } = {}) => {
      if (!book?._id) return;

      const bookId = book._id;
      setDeletingBookIds((prev) => ({ ...prev, [bookId]: true }));

      try {
        await deleteMarketplaceBook(bookId);
        toast.success("Book deleted successfully");

        const tasks = [];
        if (refreshBrowse) {
          tasks.push(fetchBooks());
        }
        if (refreshSeller && sellerApproved) {
          tasks.push(loadSellerContext());
        }

        if (tasks.length) {
          await Promise.allSettled(tasks);
        }
      } catch (error) {
        const message =
          error.response?.data?.message || "Unable to delete this book";
        toast.error(message);
      } finally {
        setDeletingBookIds((prev) => {
          const next = { ...prev };
          delete next[bookId];
          return next;
        });
        if (deleteToastIdRef.current) {
          toast.dismiss(deleteToastIdRef.current);
          deleteToastIdRef.current = null;
        }
      }
    },
    [fetchBooks, loadSellerContext, sellerApproved]
  );

  const promptDeleteBook = useCallback(
    (book, options) => {
      if (!book?._id) return;

      if (deleteToastIdRef.current) {
        toast.dismiss(deleteToastIdRef.current);
      }

      deleteToastIdRef.current = toast.custom(
        (t) => (
          <div className="max-w-sm w-full bg-white border border-rose-100 shadow-lg rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <IoTrashOutline className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-rose-600">
                  Delete this book?
                </h3>
                <p className="text-xs text-rose-500 mt-1">
                  “{book.title}” will be permanently removed from the
                  marketplace.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toast.dismiss(t.id);
                      deleteToastIdRef.current = null;
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Keep book
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.dismiss(t.id);
                      deleteToastIdRef.current = null;
                      handleDeleteBook(book, options);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ),
        {
          duration: 60000,
          id: deleteToastIdRef.current || undefined,
        }
      );
    },
    [handleDeleteBook]
  );

  useEffect(() => {
    if (!analytics) return;
    setActivityPage(1);
    setTopBooksPage(1);
    setAnalyticsReviewPage(1);
  }, [analytics]);
  const sellerCurrency = "Rs";

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }),
    []
  );

  const handleRegistrationChange = (event) => {
    const { name, value } = event.target;
    setRegistrationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();

    if (!registrationForm.storeName.trim()) {
      toast.error("Store name is required");
      return;
    }

    setIsRegisteringSeller(true);

    try {
      await registerMarketplaceSeller({
        ...registrationForm,
        storeName: registrationForm.storeName.trim(),
      });
      toast.success("You're all set! Seller profile approved instantly.");
      await loadSellerContext();
      setActiveTab("upload");
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to register as a seller";
      toast.error(message);
    } finally {
      setIsRegisteringSeller(false);
    }
  };

  const handleBookFormChange = (event) => {
    const { name, value } = event.target;
    setBookForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (field, files) => {
    const file = files?.[0] || null;

    if (field === "cover") {
      setCoverFile(file);
    }

    if (field === "file") {
      setBookFile(file);
    }
  };

  const resetBookForm = () => {
    setBookForm(initialBookForm);
    setCoverFile(null);
    setBookFile(null);
  };

  const handleBookSubmit = async (event) => {
    event.preventDefault();

    if (!bookForm.title.trim() || !bookForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    if (!bookFile) {
      toast.error("Please upload your book file");
      return;
    }

    setIsSubmittingBook(true);

    try {
      const formData = new FormData();
      formData.append("title", bookForm.title.trim());
      formData.append("description", bookForm.description.trim());
      formData.append("genre", bookForm.genre);
      formData.append("language", bookForm.language);
      formData.append("price", bookForm.price || "0");
      formData.append("status", bookForm.status);
      if (bookForm.pages) formData.append("pages", bookForm.pages);
      if (bookForm.tags) formData.append("tags", bookForm.tags);
      if (coverFile) formData.append("cover", coverFile);
      formData.append("file", bookFile);

      await createMarketplaceBook(formData);
      toast.success("Book published successfully");
      resetBookForm();
      await Promise.all([loadSellerContext(), fetchBooks()]);
      setActiveTab("my-books");
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to publish your book";
      toast.error(message);
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleBookAction = async (book) => {
    if (!isAuthenticated) {
      toast.error("Sign in to continue");
      return;
    }

    const price = Number(book?.price || 0);
    if (!book?.isFree && price > 0 && !hasEnough(price)) {
      toast.error(
        "Your wallet balance is too low for this purchase. Top up to continue."
      );
      requestWalletTopUp();
      return;
    }

    setActiveActionBookId(book._id);
    setIsProcessingAccess(true);

    try {
      let response;
      let purchaseAmount = 0;

      if (book.isFree) {
        response = await getMarketplaceBookAccess(book._id);
      } else {
        response = await recordMarketplaceBookPurchase(book._id);
        purchaseAmount = Number(
          response?.transaction?.amount ??
            response?.book?.price ??
            book.price ??
            0
        );
        if (!Number.isFinite(purchaseAmount) || purchaseAmount < 0) {
          purchaseAmount = price > 0 ? price : 0;
        }
      }

      const modalBook = response?.book
        ? { ...book, ...response.book }
        : { ...book };
      if (response?.book?.reviewSummary) {
        modalBook.reviewSummary = response.book.reviewSummary;
      }
      const viewerUrl =
        response?.viewerUrl ||
        response?.downloadUrl ||
        resolveFileUrl(book.file);
      const downloadUrl =
        response?.downloadUrl || resolveDownloadUrl(book.file);
      const userReviewData = response?.userReview || null;

      if (!viewerUrl) {
        toast.error("We couldn't prepare this book. Please try again.");
        return;
      }

      await updateReaderBook(book._id, {
        status: "in-progress",
        progress: 0,
        source: book.isFree ? "view" : "purchase",
      }).catch(() => {});
      await refreshReaderStatuses([book._id], { merge: true });

      setAccessModal({
        book: modalBook,
        viewerUrl,
        downloadUrl,
        userReview: userReviewData,
      });

      if (book.isFree) {
        toast.success("Choose how you'd like to read this title.");
      } else {
        if (purchaseAmount > 0) {
          const deduction = deduct(purchaseAmount);
          if (deduction.success) {
            toast.success(
              `Purchase successful! Remaining wallet balance: ${formatCurrencyValue(
                deduction.remaining
              )}`
            );
          } else {
            toast.success("Purchase successful!");
            toast.error(
              "Wallet balance couldn't be updated. Please refresh to sync your balance."
            );
          }
        } else {
          toast.success("Purchase successful! Choose your next step.");
        }
      }

      await fetchBooks();
      if (sellerApproved) {
        await loadSellerContext();
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to process your request";
      toast.error(message);
    } finally {
      setIsProcessingAccess(false);
      setActiveActionBookId(null);
    }
  };

  const handleWishlistToggle = async (book) => {
    if (!isAuthenticated) {
      toast.error("Sign in to manage your wishlist");
      return;
    }

    const bookId = book._id;
    if (!bookId) return;

    setWishlistProcessing((prev) => ({ ...prev, [bookId]: true }));
    const currentStatus = readerStatuses[bookId]?.status;
    const isWishlisted = currentStatus === "wishlist";

    try {
      if (isWishlisted) {
        await removeMarketplaceWishlist(bookId);
        toast.success("Removed from wishlist");
      } else {
        await addMarketplaceWishlist(bookId);
        toast.success("Added to wishlist");
      }

      await refreshReaderStatuses([bookId], { merge: true });
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to update wishlist";
      toast.error(message);
    } finally {
      setWishlistProcessing((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const openBookFile = async (book) => {
    try {
      setIsProcessingAccess(true);
      const data = await getMarketplaceBookAccess(book._id);
      const viewerUrl = data?.viewerUrl || resolveFileUrl(book.file);
      const downloadUrl = data?.downloadUrl || resolveDownloadUrl(book.file);
      const bookPayload = data?.book ? { ...book, ...data.book } : { ...book };
      if (data?.book?.reviewSummary) {
        bookPayload.reviewSummary = data.book.reviewSummary;
      }

      if (!viewerUrl) {
        toast.error("File not available yet. Try again soon.");
        return;
      }

      navigate(`/marketplace/books/${book._id}/read`, {
        state: {
          book: bookPayload,
          viewerUrl,
          downloadUrl,
          userReview: data?.userReview || null,
        },
      });
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to open the reader";
      toast.error(message);
    } finally {
      setIsProcessingAccess(false);
    }
  };

  const closeAccessModal = () => setAccessModal(null);

  const handleAccessRead = async () => {
    if (!accessModal) return;

    if (!accessModal.viewerUrl) {
      toast.error("Viewer unavailable right now. Try downloading instead.");
      return;
    }

    closeAccessModal();
    recordMarketplaceBookView(accessModal.book._id).catch(() => {});

    navigate(`/marketplace/books/${accessModal.book._id}/read`, {
      state: {
        book: accessModal.book,
        viewerUrl: accessModal.viewerUrl,
        downloadUrl: accessModal.downloadUrl,
        userReview: accessModal.userReview || null,
      },
    });
  };

  const handleAccessDownload = async () => {
    if (!accessModal) return;

    setDownloadingBookId(accessModal.book._id);

    try {
      const data = await recordMarketplaceBookDownload(accessModal.book._id);
      const url =
        data?.downloadUrl ||
        accessModal.downloadUrl ||
        resolveDownloadUrl(accessModal.book?.file);

      if (!url) {
        throw new Error("Download link unavailable");
      }

      await downloadFileFromUrl(
        url,
        `${sanitizeFilename(accessModal.book.title || "book")}.pdf`
      );

      toast.success("Download started");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to download file";
      toast.error(message);
    } finally {
      setDownloadingBookId(null);
    }
  };

  const handleSellerDownload = async (book) => {
    setDownloadingBookId(book._id);

    try {
      let url = resolveDownloadUrl(book.file);

      if (!url) {
        const data = await getMarketplaceBookAccess(book._id);
        url = data?.downloadUrl || url;
      }

      if (!url) {
        throw new Error("Download link not ready yet. Try again soon.");
      }

      await downloadFileFromUrl(
        url,
        `${sanitizeFilename(book.title || "book")}.pdf`
      );
      toast.success("Download started");
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to download file";
      toast.error(message);
    } finally {
      setDownloadingBookId(null);
    }
  };

  const renderSellerGate = () => {
    if (!isAuthenticated) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <IoLockClosed className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Seller tools are available after signing in
              </h3>
              <p className="text-blue-600 mb-4">
                Create an account or log in to manage your marketplace listings.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Create an Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (sellerLoading || sellerStatus === "loading") {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm text-blue-600">
          Checking your seller profile...
        </div>
      );
    }

    if (sellerStatus === "error") {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <IoAlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Something went wrong
              </h3>
              <p className="text-blue-600 mb-4">
                We couldn’t load your seller profile. Please try again.
              </p>
              <button
                onClick={loadSellerContext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (sellerStatus === "pending") {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <IoTime className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Application received
              </h3>
              <p className="text-blue-600">
                We’re fast-tracking approvals. You’ll get access automatically
                once reviewed.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <IoStorefront className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-blue-900">
                  Launch your bookstore in minutes
                </h3>
              </div>
              <p className="text-blue-600">
                Earn revenue, reach new readers, and get detailed analytics on
                every title you publish.
              </p>
            </div>
            <ul className="text-sm text-blue-600 space-y-2">
              <li>• Keep 85% of every sale</li>
              <li>• Offer free or paid downloads</li>
              <li>• Track performance with live analytics</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleRegistrationSubmit}
          className="bg-white rounded-xl p-6 shadow-sm space-y-6"
        >
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-1">
              Seller registration
            </h4>
            <p className="text-sm text-blue-600">
              Tell us a little about your bookstore. Approval is instant for
              now.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Store name *
              </label>
              <input
                name="storeName"
                value={registrationForm.storeName}
                onChange={handleRegistrationChange}
                placeholder="e.g. Luna’s Library"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Contact email
              </label>
              <input
                name="contactEmail"
                type="email"
                value={registrationForm.contactEmail}
                onChange={handleRegistrationChange}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Contact phone
              </label>
              <input
                name="contactPhone"
                value={registrationForm.contactPhone}
                onChange={handleRegistrationChange}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900">
                Website or portfolio
              </label>
              <input
                name="website"
                value={registrationForm.website}
                onChange={handleRegistrationChange}
                placeholder="https://"
                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">
              About your store
            </label>
            <textarea
              name="bio"
              value={registrationForm.bio}
              onChange={handleRegistrationChange}
              placeholder="Share your story, genres you specialise in, or publishing goals"
              className="w-full h-24 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isRegisteringSeller}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              <IoCheckmarkCircle className="w-5 h-5" />
              <span>
                {isRegisteringSeller
                  ? "Submitting..."
                  : "Create my seller profile"}
              </span>
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderBookCard = (book) => {
    const rating = Number(book?.stats?.averageRating || 0).toFixed(1);
    const reviews = book?.stats?.ratingsCount || 0;
    const downloads = book?.stats?.downloads || 0;
    const priceLabel = book.isFree ? "Free" : formatCurrencyValue(book.price);
    const sellerName =
      book?.seller?.storeName ||
      book?.author?.displayName ||
      book?.author?.username ||
      "Marketplace Author";
    const isProcessing = isProcessingAccess && activeActionBookId === book._id;
    const bookStatus = readerStatuses[book._id] || {};
    const isWishlisted = bookStatus.status === "wishlist";
    const isWishlistBusy = Boolean(wishlistProcessing[book._id]);

    return (
      <div
        key={book._id}
        className="group relative bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-blue-100"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100">
            {resolveCoverUrl(book.coverImage) ? (
              <img
                src={resolveCoverUrl(book.coverImage)}
                alt={book.title}
                className="w-full h-full object-contain bg-white"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-blue-600 font-semibold">
                {book.title?.charAt(0) || "B"}
              </div>
            )}
            {book.featured && (
              <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                Featured
              </span>
            )}
          </div>

          <div className="flex-1">
            <h4 className="text-lg font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">
              {book.title}
            </h4>
            <p className="text-sm text-blue-600 mb-2">by {sellerName}</p>
            <p className="text-sm text-blue-600 line-clamp-2 mb-3">
              {book.description || "No description provided."}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-blue-600">
              <span className="inline-flex items-center space-x-1">
                <IoStar className="w-4 h-4 text-yellow-500" />
                <span>
                  {rating} ({reviews} reviews)
                </span>
              </span>
              <span className="inline-flex items-center space-x-1">
                <IoDownload className="w-4 h-4" />
                <span>{numberFormatter.format(downloads)} downloads</span>
              </span>
              {book.genre && <span className="capitalize">#{book.genre}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-blue-900">
            {priceLabel}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleWishlistToggle(book)}
              disabled={isWishlistBusy}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isWishlisted
                  ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                  : "text-blue-500 hover:bg-blue-100"
              } ${isWishlistBusy ? "opacity-60 cursor-not-allowed" : ""}`}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <IoHeart
                className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => handleBookAction(book)}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isProcessing
                  ? "bg-blue-200 text-blue-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isProcessing ? "Please wait..." : book.isFree ? "Read" : "Buy"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleActivityPageChange = (page) => {
    if (!analytics?.recentActivity?.length) return;
    const totalPages = Math.max(
      1,
      Math.ceil(analytics.recentActivity.length / ACTIVITY_PAGE_SIZE)
    );
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setActivityPage(nextPage);
  };

  const handleTopBooksPageChange = (page) => {
    if (!analytics?.topBooks?.length) return;
    const totalPages = Math.max(
      1,
      Math.ceil(analytics.topBooks.length / TOP_BOOKS_PAGE_SIZE)
    );
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setTopBooksPage(nextPage);
  };

  const handleAnalyticsReviewPageChange = (page) => {
    if (!analytics?.recentReviews?.length) return;
    const totalPages = Math.max(
      1,
      Math.ceil(analytics.recentReviews.length / ANALYTICS_REVIEW_PAGE_SIZE)
    );
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setAnalyticsReviewPage(nextPage);
  };

  const renderMyBooks = () => {
    if (sellerLoading) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm text-blue-600">
          Loading your titles...
        </div>
      );
    }

    if (!myBooks.length) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-4">
          <h3 className="text-xl font-semibold text-blue-900">
            You haven’t published any books yet
          </h3>
          <p className="text-blue-600">
            Upload your first title to start selling and track performance.
          </p>
          <button
            onClick={() => setActiveTab("upload")}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IoCloudUpload className="w-5 h-5" />
            <span>Upload a book</span>
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {myBooks.map((book) => {
          const coverUrl = resolveCoverUrl(book.coverImage);
          const viewerUrl = resolveFileUrl(book.file);
          const downloadUrl = resolveDownloadUrl(book.file);
          const hasFile = Boolean(viewerUrl || downloadUrl);
          const isDeleting = Boolean(deletingBookIds[book._id]);

          return (
            <div
              key={book._id}
              className="relative flex h-full flex-col bg-white rounded-xl p-6 pt-12 shadow-sm border border-blue-100"
            >
              <button
                type="button"
                onClick={() => promptDeleteBook(book)}
                disabled={isDeleting}
                className={`absolute top-4 right-4 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                  isDeleting
                    ? "bg-rose-50 text-rose-300 cursor-not-allowed"
                    : "text-rose-500 hover:bg-rose-50"
                }`}
                aria-label="Delete book"
              >
                <IoTrashOutline className="w-4 h-4" />
              </button>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        className="w-full h-full object-contain bg-white"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl text-blue-600 font-semibold">
                        {book.title?.charAt(0) || "B"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-blue-900">
                      {book.title}
                    </h4>
                    <p className="text-sm text-blue-600 mb-2">
                      Published {formatRelativeTime(book.createdAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-blue-600">
                      <span>Price: {formatCurrencyValue(book.price)}</span>
                      <span>
                        Sales:{" "}
                        {numberFormatter.format(book?.stats?.purchases || 0)}
                      </span>
                      <span>
                        Downloads:{" "}
                        {numberFormatter.format(book?.stats?.downloads || 0)}
                      </span>
                      <span>
                        Views: {numberFormatter.format(book?.stats?.views || 0)}
                      </span>
                    </div>
                    {book.description && (
                      <p className="mt-3 text-sm text-blue-700 line-clamp-2">
                        {book.description}
                      </p>
                    )}
                    {book.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-600">
                        {book.tags.slice(0, 6).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openBookFile(book)}
                        disabled={!hasFile || isProcessingAccess}
                        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          hasFile && !isProcessingAccess
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-100 text-blue-400 cursor-not-allowed"
                        }`}
                      >
                        <IoDocument className="w-4 h-4" />
                        <span className="hidden sm:inline">Open PDF</span>
                      </button>
                      {hasFile && (
                        <button
                          type="button"
                          onClick={() => handleSellerDownload(book)}
                          disabled={downloadingBookId === book._id}
                          className={`inline-flex items-center space-x-2 px-3 py-2 border border-blue-200 rounded-lg transition-colors ${
                            downloadingBookId === book._id
                              ? "bg-blue-50 text-blue-300 cursor-wait"
                              : "text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          <IoDownload className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            Download file
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 text-left space-y-2">
                  <div className="text-2xl font-semibold text-green-600">
                    {formatCurrencyValue(book?.stats?.revenue || 0)}
                  </div>
                  <div className="text-sm text-blue-600">Lifetime earnings</div>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs uppercase tracking-wide ${
                      book.status === "published"
                        ? "bg-green-100 text-green-700"
                        : book.status === "draft"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {book.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const overviewCards = analytics
    ? [
        {
          label: "Total earnings",
          value: formatCurrencyValue(analytics.overview.totalEarnings),
          icon: IoWallet,
          accent: "text-green-500",
        },
        {
          label: "Total sales",
          value: numberFormatter.format(analytics.overview.totalSales),
          icon: IoCash,
          accent: "text-blue-500",
        },
        {
          label: "Total downloads",
          value: numberFormatter.format(analytics.overview.totalDownloads),
          icon: IoDownload,
          accent: "text-purple-500",
        },
        {
          label: "Total views",
          value: numberFormatter.format(analytics.overview.totalViews),
          icon: IoEye,
          accent: "text-sky-500",
        },
        {
          label: "Average rating",
          value: `${analytics.overview.averageRating.toFixed(1)} ★`,
          icon: IoStar,
          accent: "text-yellow-500",
        },
        {
          label: "Total reviews",
          value: numberFormatter.format(analytics.overview.totalReviews || 0),
          icon: IoChatbubbleEllipsesOutline,
          accent: "text-amber-500",
        },
        {
          label: "Published titles",
          value: numberFormatter.format(analytics.overview.booksPublished),
          icon: IoDocument,
          accent: "text-indigo-500",
        },
      ]
    : [];

  const renderAnalytics = () => {
    if (!analytics) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-3">
          <h3 className="text-xl font-semibold text-blue-900">
            Analytics will appear once you publish a book
          </h3>
          <p className="text-blue-600">
            Upload your first title and we’ll start tracking performance
            instantly.
          </p>
          <button
            onClick={() => setActiveTab("upload")}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IoCloudUpload className="w-5 h-5" />
            <span>Publish now</span>
          </button>
        </div>
      );
    }

    const topBooks = analytics.topBooks || [];
    const recentActivity = analytics.recentActivity || [];
    const recentReviews = analytics.recentReviews || [];

    const topBooksTotalPages = Math.max(
      1,
      Math.ceil(topBooks.length / TOP_BOOKS_PAGE_SIZE)
    );
    const currentTopBooksPage = Math.min(topBooksPage, topBooksTotalPages);
    const paginatedTopBooks = topBooks.slice(
      (currentTopBooksPage - 1) * TOP_BOOKS_PAGE_SIZE,
      currentTopBooksPage * TOP_BOOKS_PAGE_SIZE
    );

    const activityTotalPages = Math.max(
      1,
      Math.ceil(recentActivity.length / ACTIVITY_PAGE_SIZE)
    );
    const currentActivityPage = Math.min(activityPage, activityTotalPages);
    const paginatedActivity = recentActivity.slice(
      (currentActivityPage - 1) * ACTIVITY_PAGE_SIZE,
      currentActivityPage * ACTIVITY_PAGE_SIZE
    );

    const reviewTotalPages = Math.max(
      1,
      Math.ceil(recentReviews.length / ANALYTICS_REVIEW_PAGE_SIZE)
    );
    const currentReviewPage = Math.min(analyticsReviewPage, reviewTotalPages);
    const paginatedReviews = recentReviews.slice(
      (currentReviewPage - 1) * ANALYTICS_REVIEW_PAGE_SIZE,
      currentReviewPage * ANALYTICS_REVIEW_PAGE_SIZE
    );

    const renderPager = (page, totalPages, onChange) => {
      if (!totalPages || totalPages <= 1) return null;
      const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

      return (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm mt-4">
          <div className="text-blue-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(page - 1)}
              disabled={page <= 1}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                page <= 1
                  ? "border-blue-100 text-blue-200 cursor-not-allowed"
                  : "border-blue-200 text-blue-700 hover:bg-blue-50"
              }`}
            >
              Prev
            </button>
            {pages.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  value === page
                    ? "bg-blue-600 text-white"
                    : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange(page + 1)}
              disabled={page >= totalPages}
              className={`px-3 py-1 rounded-lg border transition-colors ${
                page >= totalPages
                  ? "border-blue-100 text-blue-200 cursor-not-allowed"
                  : "border-blue-200 text-blue-700 hover:bg-blue-50"
              }`}
            >
              Next
            </button>
          </div>
        </nav>
      );
    };

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-xl p-6 shadow-sm border border-blue-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-7 h-7 ${card.accent}`} />
                </div>
                <div className="text-2xl font-semibold text-blue-900">
                  {card.value}
                </div>
                <div className="text-sm text-blue-600">{card.label}</div>
              </div>
            );
          })}
        </div>

        {topBooks.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-900">
                <IoTrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Top-performing titles</h3>
              </div>
              <p className="text-sm text-blue-600">
                Ranked by revenue, includes sales, downloads, and ratings.
              </p>
            </div>

            <div className="grid gap-3">
              {paginatedTopBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 bg-blue-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-blue-900">
                      {book.title}
                    </div>
                    <div className="text-sm text-blue-600 space-x-2">
                      <span>{numberFormatter.format(book.sales)} sales</span>
                      <span>•</span>
                      <span>
                        {numberFormatter.format(book.downloads)} downloads
                      </span>
                      <span>•</span>
                      <span>{book.averageRating?.toFixed?.(1) || "0.0"} ★</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-500 uppercase tracking-wide">
                      Earnings
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrencyValue(book.earnings)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {renderPager(
              currentTopBooksPage,
              topBooksTotalPages,
              handleTopBooksPageChange
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Recent activity
            </h3>
            {recentActivity.length === 0 ? (
              <p className="text-blue-600">
                No activity yet. Share your books to start generating insights.
              </p>
            ) : (
              <div className="space-y-3">
                {paginatedActivity.map((activity, index) => {
                  const visuals = getActivityVisuals(activity.type);
                  const Icon = visuals.icon;
                  return (
                    <div
                      key={`${activity.bookId}-${activity.createdAt}-${index}`}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-lg ${visuals.bg}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center bg-white ${visuals.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </span>
                        <div>
                          <p className="font-medium text-blue-900">
                            {activityLabels[activity.type] || "Activity"} ·{" "}
                            {activity.bookTitle}
                          </p>
                          <p className="text-xs text-blue-600">
                            {formatRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                      {typeof activity.amount === "number" &&
                        activity.amount > 0 && (
                          <div className="text-sm font-semibold text-green-600">
                            +{formatCurrencyValue(activity.amount)}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}

            {renderPager(
              currentActivityPage,
              activityTotalPages,
              handleActivityPageChange
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">
                Recent reviews
              </h3>
              <div className="flex items-center gap-1 text-blue-500 text-sm">
                <IoChatbubbleEllipsesOutline className="w-4 h-4" />
                <span>
                  {numberFormatter.format(recentReviews.length)} total
                </span>
              </div>
            </div>

            {recentReviews.length === 0 ? (
              <p className="text-blue-600">
                Reviews will appear here once readers start sharing feedback.
              </p>
            ) : (
              <div className="space-y-3">
                {paginatedReviews.map((review) => (
                  <article
                    key={review.reviewId}
                    className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          {review.bookTitle}
                        </p>
                        <p className="text-xs text-blue-500">
                          {formatRelativeTime(review.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        {[1, 2, 3, 4, 5].map((value) =>
                          value <= review.rating ? (
                            <IoStar key={value} className="w-4 h-4" />
                          ) : (
                            <IoStarOutline key={value} className="w-4 h-4" />
                          )
                        )}
                      </div>
                    </header>
                    {review.title && (
                      <h4 className="text-sm font-semibold text-blue-900">
                        {review.title}
                      </h4>
                    )}
                    {review.comment && (
                      <p className="text-sm text-blue-700 leading-relaxed max-h-24 overflow-hidden">
                        {review.comment}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {renderPager(
              currentReviewPage,
              reviewTotalPages,
              handleAnalyticsReviewPageChange
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-blue-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-2">
              <IoStorefront className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-blue-900">Marketplace</h1>
            </div>
            <p className="text-blue-600">
              Discover new reads, support indie authors, and grow your own
              bookstore.
            </p>
          </div>

          <div className="bg-white rounded-xl p-2 shadow-sm">
            <div className="flex space-x-1 overflow-x-auto">
              {["browse", "my-books", "upload", "analytics"].map((tab) => {
                const tabConfig = {
                  browse: {
                    label: "Browse Books",
                    icon: <IoSearch className="w-5 h-5" />,
                  },
                  "my-books": {
                    label: "My Books",
                    icon: <IoDocument className="w-5 h-5" />,
                    requiresSeller: true,
                  },
                  upload: {
                    label: "Upload Book",
                    icon: <IoCloudUpload className="w-5 h-5" />,
                    requiresSeller: true,
                  },
                  analytics: {
                    label: "Analytics",
                    icon: <IoAnalytics className="w-5 h-5" />,
                    requiresSeller: true,
                  },
                }[tab];

                const isActive = activeTab === tab;
                const isLocked = tabConfig.requiresSeller && !sellerApproved;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {tabConfig.icon}
                    <span>{tabConfig.label}</span>
                    {isLocked && (
                      <IoLockClosed
                        className="w-4 h-4"
                        title="Seller access required"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "browse" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Search
                    </label>
                    <div className="relative">
                      <IoSearch className="w-5 h-5 text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search books or authors"
                        className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Genre
                    </label>
                    <select
                      value={selectedGenre}
                      onChange={(event) => setSelectedGenre(event.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {genreOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Price
                    </label>
                    <select
                      value={priceFilter}
                      onChange={(event) => setPriceFilter(event.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {priceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {booksLoading ? (
                <div className="bg-white rounded-xl p-6 shadow-sm text-blue-600">
                  Loading books...
                </div>
              ) : booksError ? (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <IoAlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">
                        Could not load books
                      </h3>
                      <p className="text-blue-600 mb-4">{booksError}</p>
                      <button
                        onClick={fetchBooks}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              ) : books.length === 0 ? (
                <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-3">
                  <h3 className="text-xl font-semibold text-blue-900">
                    No books found
                  </h3>
                  <p className="text-blue-600">
                    Adjust your filters or check back soon for new releases.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {books.map((book) => renderBookCard(book))}
                </div>
              )}
            </div>
          )}

          {sellerTabs.has(activeTab) && !sellerApproved && renderSellerGate()}

          {activeTab === "my-books" && sellerApproved && renderMyBooks()}

          {activeTab === "upload" && sellerApproved && (
            <form
              onSubmit={handleBookSubmit}
              className="bg-white rounded-xl p-6 shadow-sm space-y-6"
            >
              <h3 className="text-xl font-semibold text-blue-900">
                Upload a new book
              </h3>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">
                      Title *
                    </label>
                    <input
                      name="title"
                      value={bookForm.title}
                      onChange={handleBookFormChange}
                      placeholder="Enter your book title"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={bookForm.description}
                      onChange={handleBookFormChange}
                      placeholder="Describe your book to entice readers"
                      className="w-full h-32 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">
                        Genre
                      </label>
                      <select
                        name="genre"
                        value={bookForm.genre}
                        onChange={handleBookFormChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {genreOptions
                          .filter((option) => option.value !== "all")
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">
                        Language
                      </label>
                      <input
                        name="language"
                        value={bookForm.language}
                        onChange={handleBookFormChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">
                        Price (in {sellerCurrency})
                      </label>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.5"
                        value={bookForm.price}
                        onChange={handleBookFormChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-blue-500">
                        Set to 0 to offer it for free.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">
                        Pages (optional)
                      </label>
                      <input
                        name="pages"
                        type="number"
                        min="1"
                        value={bookForm.pages}
                        onChange={handleBookFormChange}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">
                      Tags (comma separated)
                    </label>
                    <input
                      name="tags"
                      value={bookForm.tags}
                      onChange={handleBookFormChange}
                      placeholder="#space, #romance"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">
                      Cover image
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer min-h-40">
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <IoImage className="w-12 h-12 text-blue-400 mb-3" />
                          <p className="text-blue-600 font-medium">
                            Click to upload cover image
                          </p>
                          <p className="text-xs text-blue-500">
                            JPG, PNG or WebP up to 5MB
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          handleFileChange("cover", event.target.files)
                        }
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">
                      Book file *
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                      <IoDocument className="w-12 h-12 text-blue-400 mb-3" />
                      <p className="text-blue-600 font-medium">
                        {bookFile?.name || "Click to upload PDF or EPUB"}
                      </p>
                      <p className="text-xs text-blue-500">Up to 50MB</p>
                      <input
                        type="file"
                        accept=".pdf,.epub,.doc,.docx,.txt,application/pdf"
                        className="hidden"
                        onChange={(event) =>
                          handleFileChange("file", event.target.files)
                        }
                      />
                    </label>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Revenue sharing
                    </h4>
                    <p className="text-sm text-blue-700">
                      You keep 85% of every sale. The remaining 15% helps us run
                      the platform and promote your work.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBook}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
                  >
                    <IoCloudUpload className="w-5 h-5" />
                    <span>
                      {isSubmittingBook ? "Publishing..." : "Publish book"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === "analytics" && sellerApproved && renderAnalytics()}
        </div>
      </div>

      {accessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <button
              type="button"
              onClick={closeAccessModal}
              className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 transition-colors"
            >
              <IoClose className="w-6 h-6" />
              <span className="sr-only">Close</span>
            </button>

            <div className="grid gap-6 md:grid-cols-[160px_1fr] p-6">
              <div className="hidden md:flex items-center justify-center">
                <div className="w-36 h-52 rounded-xl overflow-hidden border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
                  {accessModal.book.coverImage?.secureUrl ? (
                    <img
                      src={resolveCoverUrl(accessModal.book.coverImage)}
                      alt={accessModal.book.title}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <span className="text-3xl font-semibold text-blue-600">
                      {accessModal.book.title?.charAt(0) || "B"}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-sm uppercase tracking-wide text-blue-500 mb-1">
                    Ready to dive in?
                  </p>
                  <h3 className="text-2xl font-semibold text-blue-900 mb-2">
                    {accessModal.book.title}
                  </h3>
                  <p className="text-blue-600 line-clamp-3">
                    {accessModal.book.description ||
                      "Choose an option below to start reading or save the file for later."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleAccessRead}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 font-medium shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <IoBookOutline className="w-5 h-5" />
                    <span className="sm:inline">Read in browser</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAccessDownload}
                    disabled={downloadingBookId === accessModal.book._id}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition-colors ${
                      downloadingBookId === accessModal.book._id
                        ? "border-blue-100 bg-blue-50 text-blue-300 cursor-wait"
                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    <IoDownload className="w-5 h-5" />
                    <span className="sm:inline">Download PDF</span>
                  </button>
                </div>

                <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                  Tip: Reading keeps your place synced, while downloading lets
                  you save the file offline.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
