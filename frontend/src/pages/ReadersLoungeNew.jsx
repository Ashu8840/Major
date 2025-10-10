import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import {
  IoLibrary,
  IoBook,
  IoHeart,
  IoSearch,
  IoStar,
  IoDownload,
  IoTime,
  IoTrashOutline,
  IoArrowBack,
  IoArrowForward,
  IoEye,
  IoCashOutline,
  IoGiftOutline,
} from "react-icons/io5";
import {
  addMarketplaceWishlist,
  getMarketplaceBookAccess,
  getMarketplaceBooks,
  getReaderBookStatuses,
  getReaderBooks,
  recordMarketplaceBookView,
  removeMarketplaceWishlist,
  removeReaderBook,
  updateReaderBook,
  rentMarketplaceBook,
  tipMarketplaceBook,
} from "../utils/api";

const DISCOVER_PAGE_SIZE = 8;
const COLLECTION_PAGE_SIZE = 6;

const genres = [
  { value: "all", name: "All genres" },
  { value: "fiction", name: "Fiction" },
  { value: "non-fiction", name: "Non-fiction" },
  { value: "romance", name: "Romance" },
  { value: "fantasy", name: "Fantasy" },
  { value: "sci-fi", name: "Sci-Fi" },
  { value: "mystery", name: "Mystery" },
  { value: "thriller", name: "Thriller" },
  { value: "self-help", name: "Self-help" },
  { value: "business", name: "Business" },
];

const tabs = [
  { id: "discover", name: "Discover", icon: IoSearch },
  { id: "library", name: "My Library", icon: IoLibrary },
  { id: "reading", name: "Currently Reading", icon: IoBook },
  { id: "wishlist", name: "Wishlist", icon: IoHeart },
];

const formatCurrencyINR = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Free";
  }

  const hasFraction = !Number.isInteger(amount);
  const fractionDigits = hasFraction ? 2 : 0;

  try {
    const formatted = amount.toLocaleString("en-IN", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `Rs ${formatted}`;
  } catch (error) {
    return `Rs ${amount.toFixed(fractionDigits)}`;
  }
};

const getSuggestedRentAmount = (book) => {
  const price = Number(book?.price || 0);
  if (!Number.isFinite(price) || price <= 0) {
    return 0;
  }
  const base = Math.max(price * 0.25, 10);
  return Math.round(base);
};

const resolveCoverUrl = (book) =>
  book?.coverImage?.secureUrl || book?.coverImage?.url || "";

const resolveAuthorName = (book) =>
  book?.author?.displayName ||
  book?.author?.username ||
  book?.seller?.storeName ||
  "Unknown author";

const formatRelativeTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

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

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === "second") {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return "Just now";
};

const createCollectionState = () => ({
  items: [],
  meta: { total: 0, totalPages: 0, page: 1, limit: COLLECTION_PAGE_SIZE },
  loading: false,
  error: "",
  initialized: false,
});

export default function ReadersLoungeNew() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user);

  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  const [discoverBooks, setDiscoverBooks] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverPage, setDiscoverPage] = useState(1);

  const [bookStatuses, setBookStatuses] = useState({});
  const [wishlistProcessing, setWishlistProcessing] = useState({});
  const [rentProcessing, setRentProcessing] = useState({});
  const [tipProcessing, setTipProcessing] = useState({});

  const [libraryState, setLibraryState] = useState(createCollectionState);
  const [readingState, setReadingState] = useState(createCollectionState);
  const [wishlistState, setWishlistState] = useState(createCollectionState);

  const [rentModal, setRentModal] = useState(null);
  const [tipModal, setTipModal] = useState(null);

  const discoverAbortRef = useRef(null);
  const collectionAbortRefs = useRef({
    library: null,
    reading: null,
    wishlist: null,
  });
  const collectionRequestIdsRef = useRef({
    library: 0,
    reading: 0,
    wishlist: 0,
  });
  const statusAbortRef = useRef(null);
  const statusRequestIdRef = useRef(0);

  const libraryInitialized = libraryState.initialized;
  const readingInitialized = readingState.initialized;
  const wishlistInitialized = wishlistState.initialized;
  const libraryPage = libraryState.meta?.page || 1;
  const readingPage = readingState.meta?.page || 1;
  const wishlistPage = wishlistState.meta?.page || 1;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const refreshBookStatuses = useCallback(
    async (ids = [], options = {}) => {
      if (!isAuthenticated) {
        if (!options.merge) {
          setBookStatuses({});
        }
        return;
      }

      const targetIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
      if (!targetIds.length) {
        if (!options.merge) {
          setBookStatuses({});
        }
        return;
      }

      if (statusAbortRef.current) {
        statusAbortRef.current.abort();
      }

      const controller = new AbortController();
      statusAbortRef.current = controller;
      const requestId = statusRequestIdRef.current + 1;
      statusRequestIdRef.current = requestId;

      try {
        const data = await getReaderBookStatuses(targetIds, {
          signal: controller.signal,
        });

        if (statusRequestIdRef.current !== requestId) {
          return;
        }

        const incoming = data?.statuses || {};
        if (options.merge) {
          setBookStatuses((prev) => {
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
          setBookStatuses(incoming);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
          return;
        }

        if (!options.merge) {
          setBookStatuses({});
        }
      } finally {
        if (statusAbortRef.current === controller) {
          statusAbortRef.current = null;
        }
      }
    },
    [isAuthenticated]
  );

  const fetchDiscover = useCallback(async () => {
    if (discoverAbortRef.current) {
      discoverAbortRef.current.abort();
    }

    const controller = new AbortController();
    discoverAbortRef.current = controller;

    setDiscoverLoading(true);
    setDiscoverError("");

    try {
      const params = { sort: sortBy, limit: 60 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedGenre !== "all") params.genre = selectedGenre;

      const data = await getMarketplaceBooks(params, {
        signal: controller.signal,
      });
      const books = data?.books || [];
      if (discoverAbortRef.current !== controller) {
        return;
      }
      setDiscoverBooks(books);
      setDiscoverPage(1);

      if (books.length) {
        await refreshBookStatuses(
          books.map((book) => book._id),
          { merge: false }
        );
      } else {
        setBookStatuses({});
      }
    } catch (error) {
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
        return;
      }
      const message =
        error?.response?.data?.message ||
        "Unable to load marketplace titles right now.";
      setDiscoverError(message);
      setDiscoverBooks([]);
      setBookStatuses({});
    } finally {
      if (discoverAbortRef.current === controller) {
        setDiscoverLoading(false);
        discoverAbortRef.current = null;
      }
    }
  }, [debouncedSearch, selectedGenre, sortBy, refreshBookStatuses]);

  useEffect(() => {
    fetchDiscover();
  }, [fetchDiscover]);

  useEffect(() => {
    return () => {
      if (discoverAbortRef.current) {
        discoverAbortRef.current.abort();
      }
      Object.values(collectionAbortRefs.current).forEach((controller) => {
        if (controller) {
          controller.abort();
        }
      });
      if (statusAbortRef.current) {
        statusAbortRef.current.abort();
      }
    };
  }, []);

  const getCollectionSetter = (category) => {
    switch (category) {
      case "library":
        return setLibraryState;
      case "reading":
        return setReadingState;
      case "wishlist":
        return setWishlistState;
      default:
        return null;
    }
  };

  const loadCollection = useCallback(
    async (category, page = 1) => {
      const setter = getCollectionSetter(category);
      if (!setter) return;

      const nextRequestId =
        (collectionRequestIdsRef.current[category] || 0) + 1;
      collectionRequestIdsRef.current[category] = nextRequestId;

      if (collectionAbortRefs.current[category]) {
        collectionAbortRefs.current[category].abort();
      }

      const controller = new AbortController();
      collectionAbortRefs.current[category] = controller;

      setter((prev) => ({
        ...prev,
        loading: true,
        error: "",
      }));

      try {
        const data = await getReaderBooks(
          {
            category,
            page,
            limit: COLLECTION_PAGE_SIZE,
          },
          { signal: controller.signal }
        );

        if (collectionRequestIdsRef.current[category] !== nextRequestId) {
          return;
        }

        const items = (data?.items || []).filter((item) => item?.book);

        setter({
          items,
          meta: {
            total: data?.meta?.total || items.length,
            totalPages: data?.meta?.totalPages || 0,
            page: data?.meta?.page || page,
            limit: data?.meta?.limit || COLLECTION_PAGE_SIZE,
            category,
          },
          loading: false,
          error: "",
          initialized: true,
        });

        if (items.length) {
          await refreshBookStatuses(
            items.map((entry) => entry.book?._id).filter(Boolean),
            { merge: true }
          );
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
          return;
        }
        const message =
          error?.response?.data?.message || "Unable to load your books.";
        setter((prev) => ({
          ...prev,
          loading: false,
          error: message,
          initialized: true,
        }));
      } finally {
        if (collectionAbortRefs.current[category] === controller) {
          collectionAbortRefs.current[category] = null;
          setter((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      }
    },
    [refreshBookStatuses]
  );

  useEffect(() => {
    if (
      activeTab === "library" &&
      !libraryState.initialized &&
      !libraryState.loading
    ) {
      loadCollection("library", 1);
    }
    if (
      activeTab === "reading" &&
      !readingState.initialized &&
      !readingState.loading
    ) {
      loadCollection("reading", 1);
    }
    if (
      activeTab === "wishlist" &&
      !wishlistState.initialized &&
      !wishlistState.loading
    ) {
      loadCollection("wishlist", 1);
    }
  }, [
    activeTab,
    libraryState.initialized,
    libraryState.loading,
    readingState.initialized,
    readingState.loading,
    wishlistState.initialized,
    wishlistState.loading,
    loadCollection,
  ]);

  const discoverTotalPages = useMemo(() => {
    if (!discoverBooks.length) return 1;
    return Math.max(1, Math.ceil(discoverBooks.length / DISCOVER_PAGE_SIZE));
  }, [discoverBooks.length]);

  const paginatedDiscoverBooks = useMemo(() => {
    const start = (discoverPage - 1) * DISCOVER_PAGE_SIZE;
    return discoverBooks.slice(start, start + DISCOVER_PAGE_SIZE);
  }, [discoverBooks, discoverPage]);

  const handleDiscoverPageChange = (direction) => {
    const next = Math.min(
      Math.max(discoverPage + direction, 1),
      discoverTotalPages
    );
    setDiscoverPage(next);
  };

  const handleCollectionPageChange = (category, direction) => {
    const state =
      category === "library"
        ? libraryState
        : category === "reading"
        ? readingState
        : wishlistState;

    if (!state.meta?.totalPages || state.meta.totalPages <= 1) return;

    const nextPage = Math.min(
      Math.max((state.meta.page || 1) + direction, 1),
      state.meta.totalPages
    );

    if (nextPage === state.meta.page) return;
    loadCollection(category, nextPage);
  };

  const handleOpenBook = async (book) => {
    if (!book?._id) return;

    try {
      const access = await getMarketplaceBookAccess(book._id);
      const viewerUrl = access?.viewerUrl;

      if (!viewerUrl) {
        toast.error("Reader is not ready for this title yet.");
        return;
      }

      await updateReaderBook(book._id, {
        status: "in-progress",
        progress: bookStatuses[book._id]?.progress || 0,
        source: "view",
      }).catch(() => {});

      await refreshBookStatuses([book._id], { merge: true });
      recordMarketplaceBookView(book._id).catch(() => {});

      navigate(`/marketplace/books/${book._id}/read`, {
        state: {
          book: access?.book || book,
          viewerUrl,
          downloadUrl: access?.downloadUrl || "",
          userReview: access?.userReview || null,
        },
      });
    } catch (error) {
      const message =
        error?.response?.data?.message || "Unable to open this book.";
      toast.error(message);
    }
  };

  const handleWishlistToggle = async (book) => {
    if (!book?._id) return;

    const bookId = book._id;
    setWishlistProcessing((prev) => ({ ...prev, [bookId]: true }));
    const isWishlisted = bookStatuses[bookId]?.status === "wishlist";

    try {
      if (isWishlisted) {
        await removeMarketplaceWishlist(bookId);
        toast.success("Removed from wishlist");
      } else {
        await addMarketplaceWishlist(bookId);
        toast.success("Added to wishlist");
      }

      await refreshBookStatuses([bookId], { merge: true });

      if (activeTab === "wishlist") {
        await loadCollection("wishlist", wishlistState.meta.page || 1);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || "Unable to update wishlist.";
      toast.error(message);
    } finally {
      setWishlistProcessing((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const openRentModal = useCallback((book) => {
    if (!book?._id) return;
    const suggested = getSuggestedRentAmount(book);
    setRentModal({
      book,
      amount: suggested || 0,
      days: 7,
      submitting: false,
    });
  }, []);

  const openTipModal = useCallback((book) => {
    if (!book?._id) return;
    const price = Number(book?.price || 0);
    const suggested = price > 0 ? Math.max(Math.round(price * 0.1), 20) : 25;
    setTipModal({
      book,
      amount: suggested,
      note: "",
      submitting: false,
    });
  }, []);

  const closeRentModal = useCallback(() => setRentModal(null), []);
  const closeTipModal = useCallback(() => setTipModal(null), []);

  const handleRentConfirm = useCallback(async () => {
    if (!rentModal?.book?._id) return;

    const { book } = rentModal;
    const bookId = book._id;
    const amount = Math.max(0, Number(rentModal.amount) || 0);
    const days = Math.max(1, Math.min(Number(rentModal.days) || 1, 90));

    setRentProcessing((prev) => ({ ...prev, [bookId]: true }));
    setRentModal((prev) => (prev ? { ...prev, submitting: true } : prev));

    try {
      await rentMarketplaceBook(bookId, {
        amount,
        durationDays: days,
      });

      toast.success(
        amount > 0
          ? `Rental unlocked for ₹${amount.toLocaleString("en-IN")}`
          : "Rental unlocked"
      );

      const tasks = [refreshBookStatuses([bookId], { merge: true })];
      if (libraryInitialized) {
        tasks.push(loadCollection("library", libraryPage));
      }
      if (readingInitialized) {
        tasks.push(loadCollection("reading", readingPage));
      }
      if (wishlistInitialized) {
        tasks.push(loadCollection("wishlist", wishlistPage));
      }

      await Promise.allSettled(tasks);

      setRentModal(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || "Unable to rent this book.";
      toast.error(message);
      setRentModal((prev) => (prev ? { ...prev, submitting: false } : prev));
    } finally {
      setRentProcessing((prev) => {
        const next = { ...prev };
        delete next[bookId];
        return next;
      });
    }
  }, [
    rentModal,
    refreshBookStatuses,
    libraryInitialized,
    libraryPage,
    loadCollection,
    readingInitialized,
    readingPage,
    wishlistInitialized,
    wishlistPage,
  ]);

  const handleTipConfirm = useCallback(async () => {
    if (!tipModal?.book?._id) return;

    const { book } = tipModal;
    const bookId = book._id;
    const amount = Number(tipModal.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid tip amount");
      return;
    }

    setTipProcessing((prev) => ({ ...prev, [bookId]: true }));
    setTipModal((prev) => (prev ? { ...prev, submitting: true } : prev));

    try {
      await tipMarketplaceBook(bookId, {
        amount,
        note: tipModal.note,
      });

      toast.success(`Thanks for supporting ${resolveAuthorName(book)}!`);
      setTipModal(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || "Unable to send your tip.";
      toast.error(message);
      setTipModal((prev) => (prev ? { ...prev, submitting: false } : prev));
    } finally {
      setTipProcessing((prev) => {
        const next = { ...prev };
        delete next[bookId];
        return next;
      });
    }
  }, [tipModal]);

  const handleRemoveFromLibrary = async (entry) => {
    const bookId = entry?.book?._id;
    if (!bookId) return;

    try {
      await removeReaderBook(bookId);
      toast.success("Book removed from your library");

      await Promise.all([
        refreshBookStatuses([bookId], { merge: true }),
        loadCollection("library", libraryState.meta.page || 1),
        loadCollection("reading", readingState.meta.page || 1),
      ]);
    } catch (error) {
      const message =
        error?.response?.data?.message || "Unable to update your library.";
      toast.error(message);
    }
  };

  const handleStartWishlistBook = async (entry) => {
    const book = entry?.book;
    if (!book?._id) return;

    await updateReaderBook(book._id, {
      status: "in-progress",
      progress: entry?.progress || 0,
      source: "manual",
    }).catch(() => {});

    const tasks = [
      refreshBookStatuses([book._id], { merge: true }),
      loadCollection("reading", readingPage),
      loadCollection("wishlist", wishlistPage),
    ];

    if (libraryInitialized) {
      tasks.push(loadCollection("library", libraryPage));
    }

    await Promise.allSettled(tasks);

    await handleOpenBook(book);
  };

  const renderPagination = (page, totalPages, onChange) => {
    if (!totalPages || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => onChange(-1)}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <IoArrowBack className="w-4 h-4" />
          <span>Previous</span>
        </button>
        <span className="text-sm text-blue-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <span>Next</span>
          <IoArrowForward className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">
          Please log in to access Reader&apos;s Lounge.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <IoLibrary className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-900">
              Reader&apos;s Lounge
            </h1>
          </div>
          <p className="text-blue-600">
            Discover fresh titles, keep track of your reading journey, and
            curate your personal wishlist.
          </p>
        </header>

        <nav className="mb-6 bg-white rounded-xl p-2 shadow-sm">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "discover" && (
          <section className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Search the marketplace
                  </label>
                  <div className="relative">
                    <IoSearch className="w-5 h-5 text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search books, authors, or genres"
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
                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {genres.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {genre.name}
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
                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="trending">Trending</option>
                    <option value="rating">Top rated</option>
                    <option value="newest">Newest</option>
                    <option value="downloads">Most downloaded</option>
                    <option value="price-low">Price: Low to high</option>
                    <option value="price-high">Price: High to low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              {discoverLoading ? (
                <div className="py-16 flex items-center justify-center text-blue-500">
                  Loading curated recommendations...
                </div>
              ) : discoverError ? (
                <div className="py-16 text-center text-red-500">
                  {discoverError}
                </div>
              ) : paginatedDiscoverBooks.length === 0 ? (
                <div className="py-16 text-center text-blue-500">
                  No books found. Try adjusting your filters.
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedDiscoverBooks.map((book) => {
                      const cover = resolveCoverUrl(book);
                      const status = bookStatuses[book._id] || {};
                      const isWishlisted = status.status === "wishlist";
                      const isProcessingWishlist = wishlistProcessing[book._id];
                      const rating = book.reviewSummary?.averageRating || 0;
                      const reviews = book.reviewSummary?.ratingsCount || 0;
                      const downloads = book.stats?.downloads || 0;
                      const views = book.stats?.views || 0;
                      const badges = [];
                      if ((book.trendingScore || 0) > 0 || views > 100) {
                        badges.push({ label: "Trending", color: "bg-red-500" });
                      }
                      if (downloads > 50) {
                        badges.push({
                          label: "Popular",
                          color: "bg-purple-500",
                        });
                      }
                      if (rating >= 4.5 && reviews >= 10) {
                        badges.push({
                          label: "Top Rated",
                          color: "bg-yellow-500",
                        });
                      }

                      return (
                        <div
                          key={book._id}
                          className="group bg-blue-50/40 border border-blue-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                        >
                          <div className="relative h-48 bg-white border-b border-blue-100 flex items-center justify-center">
                            {cover ? (
                              <img
                                src={cover}
                                alt={book.title}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="text-4xl font-semibold text-blue-600">
                                {book.title?.charAt(0) || "B"}
                              </div>
                            )}
                            <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                              {badges.map((badge) => (
                                <span
                                  key={badge.label}
                                  className={`${badge.color} text-white text-xs font-semibold px-2 py-1 rounded-full`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex-1 p-5 flex flex-col">
                            <h3 className="text-lg font-semibold text-blue-900 mb-1 line-clamp-2">
                              {book.title}
                            </h3>
                            <p className="text-sm text-blue-600 mb-2">
                              by {resolveAuthorName(book)}
                            </p>
                            <p className="text-sm text-blue-500 line-clamp-3 mb-4">
                              {book.description ||
                                "No description available for this title yet."}
                            </p>

                            <div className="mt-auto space-y-3">
                              <div className="flex flex-wrap items-center gap-3 text-sm text-blue-600">
                                <span className="inline-flex items-center space-x-1">
                                  <IoStar className="w-4 h-4 text-yellow-500" />
                                  <span>{rating.toFixed(1)}</span>
                                  <span className="text-blue-400">
                                    ({reviews.toLocaleString()} reviews)
                                  </span>
                                </span>
                                <span className="inline-flex items-center space-x-1">
                                  <IoDownload className="w-4 h-4" />
                                  <span>
                                    {downloads.toLocaleString()} downloads
                                  </span>
                                </span>
                                {book.genre && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 uppercase tracking-wide">
                                    {book.genre}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between text-sm text-blue-600">
                                  <span className="text-lg font-semibold text-blue-900">
                                    {formatCurrencyINR(book.price)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openTipModal(book)}
                                    disabled={
                                      tipProcessing[book._id] ||
                                      tipModal?.book?._id === book._id
                                    }
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors ${
                                      tipProcessing[book._id] ||
                                      tipModal?.book?._id === book._id
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    <IoGiftOutline className="w-4 h-4" />
                                    <span>Tip author</span>
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {Number(book.price || 0) > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => openRentModal(book)}
                                      disabled={
                                        rentProcessing[book._id] ||
                                        rentModal?.book?._id === book._id
                                      }
                                      className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        rentProcessing[book._id] ||
                                        rentModal?.book?._id === book._id
                                          ? "bg-green-100 text-green-300 cursor-not-allowed"
                                          : "bg-green-50 text-green-600 hover:bg-green-100"
                                      }`}
                                    >
                                      <IoCashOutline className="w-4 h-4" />
                                      <span>Rent</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleWishlistToggle(book)}
                                    disabled={isProcessingWishlist}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isWishlisted
                                        ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                                        : "text-blue-600 bg-white hover:bg-blue-50"
                                    } ${
                                      isProcessingWishlist
                                        ? "opacity-60 cursor-not-allowed"
                                        : ""
                                    }`}
                                    aria-label={
                                      isWishlisted
                                        ? "Remove from wishlist"
                                        : "Add to wishlist"
                                    }
                                  >
                                    <IoHeart
                                      className={`w-4 h-4 ${
                                        isWishlisted ? "fill-current" : ""
                                      }`}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBook(book)}
                                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    <IoEye className="w-4 h-4" />
                                    <span>
                                      {book.isFree ? "Read now" : "Preview"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {renderPagination(
                    discoverPage,
                    discoverTotalPages,
                    handleDiscoverPageChange
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === "library" && (
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-blue-900">
                📚 My Library
              </h2>
              <span className="text-sm text-blue-600">
                {libraryState.meta.total || libraryState.items.length} titles
              </span>
            </div>

            {libraryState.loading ? (
              <div className="py-16 text-center text-blue-500">
                Fetching your bookshelf...
              </div>
            ) : libraryState.error ? (
              <div className="py-16 text-center text-red-500">
                {libraryState.error}
              </div>
            ) : libraryState.items.length === 0 ? (
              <div className="py-16 text-center text-blue-500">
                Your library is empty. Discover a new title to get started!
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {libraryState.items.map((entry) => {
                    const book = entry.book;
                    const cover = resolveCoverUrl(book);
                    const progress = entry.progress || 0;
                    const lastRead =
                      entry.lastReadAt || entry.updatedAt || entry.addedAt;
                    const isWishlistBusy = Boolean(
                      wishlistProcessing[book._id]
                    );
                    return (
                      <div
                        key={entry.id}
                        className="border border-blue-100 rounded-xl p-5 hover:shadow-md transition-shadow bg-blue-50/30 relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveFromLibrary(entry)}
                          className="absolute top-3 right-3 p-2 text-rose-500 bg-rose-50 rounded-full hover:bg-rose-100 transition-colors"
                          aria-label="Remove from library"
                        >
                          <IoTrashOutline className="w-4 h-4" />
                        </button>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-24 rounded-lg overflow-hidden border border-blue-100 bg-white flex-shrink-0">
                            {cover ? (
                              <img
                                src={cover}
                                alt={book.title}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-blue-600">
                                {book.title?.charAt(0) || "B"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-1 line-clamp-2">
                              {book.title}
                            </h3>
                            <p className="text-sm text-blue-600 mb-2">
                              {resolveAuthorName(book)}
                            </p>
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-blue-600 mb-1">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-blue-100 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-blue-500">
                              <span>
                                Last read {formatRelativeTime(lastRead)}
                              </span>
                              <span>
                                {(
                                  book.reviewSummary?.averageRating || 0
                                ).toFixed(1)}{" "}
                                ★
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenBook(book)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            {progress >= 100
                              ? "Revisit"
                              : progress > 0
                              ? "Continue reading"
                              : "Start reading"}
                          </button>
                          {Number(book.price || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => openRentModal(book)}
                              disabled={
                                rentProcessing[book._id] ||
                                rentModal?.book?._id === book._id
                              }
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                rentProcessing[book._id] ||
                                rentModal?.book?._id === book._id
                                  ? "bg-green-100 text-green-300 cursor-not-allowed"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                <IoCashOutline className="w-4 h-4" />
                                Extend rent
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openTipModal(book)}
                            disabled={
                              tipProcessing[book._id] ||
                              tipModal?.book?._id === book._id
                            }
                            className={`px-3 py-2 text-sm font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors ${
                              tipProcessing[book._id] ||
                              tipModal?.book?._id === book._id
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <IoGiftOutline className="w-4 h-4" />
                              Tip author
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWishlistToggle(book)}
                            disabled={isWishlistBusy}
                            className={`p-2 rounded-lg transition-colors ${
                              bookStatuses[book._id]?.status === "wishlist"
                                ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                                : "text-blue-600 bg-blue-50 hover:bg-blue-100"
                            } ${
                              isWishlistBusy
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            aria-label="Toggle wishlist"
                          >
                            <IoHeart
                              className={`w-4 h-4 ${
                                bookStatuses[book._id]?.status === "wishlist"
                                  ? "fill-current"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderPagination(
                  libraryState.meta.page || 1,
                  libraryState.meta.totalPages || 0,
                  (direction) =>
                    handleCollectionPageChange("library", direction)
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "reading" && (
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              📖 Currently Reading
            </h2>

            {readingState.loading ? (
              <div className="py-16 text-center text-blue-500">
                Gathering your in-progress titles...
              </div>
            ) : readingState.error ? (
              <div className="py-16 text-center text-red-500">
                {readingState.error}
              </div>
            ) : readingState.items.length === 0 ? (
              <div className="text-center py-12">
                <IoBook className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                <p className="text-blue-500">Nothing in progress right now.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("discover")}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Discover new books
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {readingState.items.map((entry) => {
                    const book = entry.book;
                    const progress = entry.progress || 0;
                    const isWishlistBusy = Boolean(
                      wishlistProcessing[book._id]
                    );
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-24 rounded-lg overflow-hidden border border-blue-100 bg-white flex-shrink-0">
                            {resolveCoverUrl(book) ? (
                              <img
                                src={resolveCoverUrl(book)}
                                alt={book.title}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-blue-600">
                                {book.title?.charAt(0) || "B"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-1">
                              {book.title}
                            </h3>
                            <p className="text-sm text-blue-600 mb-3">
                              {resolveAuthorName(book)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-blue-500 mb-2">
                              <span className="flex items-center gap-1">
                                <IoTime className="w-3 h-3" />
                                Updated{" "}
                                {formatRelativeTime(
                                  entry.lastReadAt || entry.updatedAt
                                )}
                              </span>
                              <span>
                                {(
                                  book.reviewSummary?.averageRating || 0
                                ).toFixed(1)}{" "}
                                ★
                              </span>
                            </div>
                            <div className="mb-2">
                              <div className="flex justify-between text-xs text-blue-600 mb-1">
                                <span>Progress</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-blue-100 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenBook(book)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            {progress >= 100 ? "Review" : "Continue reading"}
                          </button>
                          {Number(book.price || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => openRentModal(book)}
                              disabled={
                                rentProcessing[book._id] ||
                                rentModal?.book?._id === book._id
                              }
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                rentProcessing[book._id] ||
                                rentModal?.book?._id === book._id
                                  ? "bg-green-100 text-green-300 cursor-not-allowed"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                <IoCashOutline className="w-4 h-4" />
                                Extend rent
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openTipModal(book)}
                            disabled={
                              tipProcessing[book._id] ||
                              tipModal?.book?._id === book._id
                            }
                            className={`px-3 py-2 text-sm font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors ${
                              tipProcessing[book._id] ||
                              tipModal?.book?._id === book._id
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <IoGiftOutline className="w-4 h-4" />
                              Tip author
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWishlistToggle(book)}
                            disabled={isWishlistBusy}
                            className={`p-2 rounded-lg transition-colors ${
                              bookStatuses[book._id]?.status === "wishlist"
                                ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                                : "text-blue-600 bg-blue-50 hover:bg-blue-100"
                            } ${
                              isWishlistBusy
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            aria-label="Toggle wishlist"
                          >
                            <IoHeart
                              className={`w-4 h-4 ${
                                bookStatuses[book._id]?.status === "wishlist"
                                  ? "fill-current"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderPagination(
                  readingState.meta.page || 1,
                  readingState.meta.totalPages || 0,
                  (direction) =>
                    handleCollectionPageChange("reading", direction)
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "wishlist" && (
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              💖 Wishlist
            </h2>

            {wishlistState.loading ? (
              <div className="py-16 text-center text-blue-500">
                Loading your wishlist...
              </div>
            ) : wishlistState.error ? (
              <div className="py-16 text-center text-red-500">
                {wishlistState.error}
              </div>
            ) : wishlistState.items.length === 0 ? (
              <div className="text-center py-12">
                <IoHeart className="w-16 h-16 text-rose-300 mx-auto mb-4" />
                <p className="text-blue-500">
                  You haven&apos;t added anything to your wishlist yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("discover")}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse titles
                </button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistState.items.map((entry) => {
                    const book = entry.book;
                    const cover = resolveCoverUrl(book);
                    const isWishlistBusy = Boolean(
                      wishlistProcessing[book._id]
                    );
                    return (
                      <div
                        key={entry.id}
                        className="border border-blue-100 rounded-xl p-5 bg-blue-50/30 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-24 rounded-lg overflow-hidden border border-blue-100 bg-white flex-shrink-0">
                            {cover ? (
                              <img
                                src={cover}
                                alt={book.title}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-blue-600">
                                {book.title?.charAt(0) || "B"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-1 line-clamp-2">
                              {book.title}
                            </h3>
                            <p className="text-sm text-blue-600 mb-2">
                              {resolveAuthorName(book)}
                            </p>
                            <p className="text-xs text-blue-500 line-clamp-3">
                              {book.description || "No description available."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-blue-600 mb-4">
                          <span>{formatCurrencyINR(book.price)}</span>
                          <span>
                            {(book.reviewSummary?.averageRating || 0).toFixed(
                              1
                            )}{" "}
                            ★
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartWishlistBook(entry)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Start reading
                          </button>
                          {Number(book.price || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => openRentModal(book)}
                              disabled={
                                rentProcessing[book._id] ||
                                rentModal?.book?._id === book._id
                              }
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                rentProcessing[book._id] ||
                                rentModal?.book?._id === book._id
                                  ? "bg-green-100 text-green-300 cursor-not-allowed"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                <IoCashOutline className="w-4 h-4" />
                                Rent now
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openTipModal(book)}
                            disabled={
                              tipProcessing[book._id] ||
                              tipModal?.book?._id === book._id
                            }
                            className={`px-3 py-2 text-sm font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors ${
                              tipProcessing[book._id] ||
                              tipModal?.book?._id === book._id
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <IoGiftOutline className="w-4 h-4" />
                              Send tip
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWishlistToggle(book)}
                            disabled={isWishlistBusy}
                            className={`p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors ${
                              isWishlistBusy
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            aria-label="Remove from wishlist"
                          >
                            <IoHeart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {renderPagination(
                  wishlistState.meta.page || 1,
                  wishlistState.meta.totalPages || 0,
                  (direction) =>
                    handleCollectionPageChange("wishlist", direction)
                )}
              </>
            )}
          </section>
        )}
      </div>

      {rentModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!rentModal.submitting) {
                closeRentModal();
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-blue-900">
                Rent “{rentModal.book.title}”
              </h3>
              <p className="text-sm text-blue-600">
                Choose how long you’d like access. You can always extend later.
              </p>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                  Rental duration (days)
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={rentModal.days}
                    onChange={(event) => {
                      const value = Math.max(
                        1,
                        Math.min(Number(event.target.value) || 1, 90)
                      );
                      setRentModal((prev) =>
                        prev ? { ...prev, days: value } : prev
                      );
                    }}
                    className="w-24 rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                  <div className="flex items-center gap-2">
                    {[7, 14, 30].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setRentModal((prev) =>
                            prev ? { ...prev, days: option } : prev
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          rentModal.days === option
                            ? "bg-blue-600 text-white"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        }`}
                      >
                        {option}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                  Contribution amount (₹)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={rentModal.amount}
                    onChange={(event) => {
                      const value = Math.max(
                        0,
                        Number(event.target.value) || 0
                      );
                      setRentModal((prev) =>
                        prev ? { ...prev, amount: value } : prev
                      );
                    }}
                    className="w-32 rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                  {getSuggestedRentAmount(rentModal.book) > 0 && (
                    <span className="text-xs text-blue-500">
                      Suggested: ₹{getSuggestedRentAmount(rentModal.book)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeRentModal}
                disabled={rentModal.submitting}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRentConfirm}
                disabled={rentModal.submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {rentModal.submitting ? "Processing..." : "Confirm rental"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tipModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!tipModal.submitting) {
                closeTipModal();
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-blue-900">
                Tip the author
              </h3>
              <p className="text-sm text-blue-600">
                Show appreciation to {resolveAuthorName(tipModal.book)} with a
                quick tip.
              </p>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                  Tip amount (₹)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    step="10"
                    value={tipModal.amount}
                    onChange={(event) => {
                      const value = Math.max(
                        0,
                        Number(event.target.value) || 0
                      );
                      setTipModal((prev) =>
                        prev ? { ...prev, amount: value } : prev
                      );
                    }}
                    className="w-32 rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                  <div className="flex items-center gap-2">
                    {[25, 50, 100].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setTipModal((prev) =>
                            prev ? { ...prev, amount: option } : prev
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          tipModal.amount === option
                            ? "bg-amber-500 text-white"
                            : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        }`}
                      >
                        ₹{option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  value={tipModal.note}
                  onChange={(event) =>
                    setTipModal((prev) =>
                      prev
                        ? { ...prev, note: event.target.value.slice(0, 140) }
                        : prev
                    )
                  }
                  placeholder="Share a quick note of encouragement."
                  className="mt-2 w-full rounded-lg border border-blue-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeTipModal}
                disabled={tipModal.submitting}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTipConfirm}
                disabled={tipModal.submitting}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                {tipModal.submitting ? "Sending..." : "Send tip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
