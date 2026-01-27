import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import HTMLFlipBook from "react-pageflip";
import {
  IoArrowBack,
  IoChevronBack,
  IoChevronForward,
  IoDownload,
  IoMoon,
  IoSunny,
  IoBookOutline,
  IoStar,
  IoStarOutline,
  IoSend,
  IoExpand,
  IoContract,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoList,
  IoClose,
  IoBookmark,
  IoBookmarkOutline,
  IoReader,
} from "react-icons/io5";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  getMarketplaceBookAccess,
  getMarketplaceBookReviews,
  recordMarketplaceBookDownload,
  recordMarketplaceBookView,
  updateReaderBook,
  submitMarketplaceBookReview,
  API_HOST,
} from "../utils/api";
import { downloadFileFromUrl, sanitizeFilename } from "../utils/fileDownload";
import { AuthContext } from "../context/AuthContext";
import { resolveAvatarUrl } from "../utils/socialHelpers";

// Helper to resolve book cover image URL
const resolveCoverImage = (coverImage) => {
  const url = resolveAvatarUrl(coverImage);
  if (!url) return null;
  // If it's already a full URL, return as is
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  // Otherwise prepend API_HOST for relative paths
  return `${API_HOST}${url.startsWith("/") ? "" : "/"}${url}`;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const REVIEWS_PER_PAGE = 5;

const formatReviewDate = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Individual page component for the flipbook
const Page = forwardRef(({ pageImage, pageNumber, isLoading, theme }, ref) => {
  return (
    <div
      ref={ref}
      className={`relative w-full h-full ${
        theme === "dark" ? "bg-slate-900" : "bg-white"
      }`}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pageImage ? (
        <img
          src={pageImage}
          alt={`Page ${pageNumber}`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <IoBookOutline className="w-16 h-16 mb-4" />
          <p className="text-lg">Page {pageNumber}</p>
        </div>
      )}
      {/* Page number corner */}
      <div
        className={`absolute bottom-3 ${
          pageNumber % 2 === 0 ? "left-4" : "right-4"
        } text-xs font-medium ${
          theme === "dark" ? "text-slate-500" : "text-gray-400"
        }`}
      >
        {pageNumber}
      </div>
    </div>
  );
});

Page.displayName = "Page";

// Cover page component
const CoverPage = forwardRef(({ book, theme, isFront }, ref) => {
  return (
    <div
      ref={ref}
      className={`relative w-full h-full overflow-hidden ${
        isFront
          ? "bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700"
          : "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800"
      }`}
    >
      {isFront ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-300/20 rounded-full blur-3xl" />

          {resolveCoverImage(book?.coverImage) ? (
            <img
              src={resolveCoverImage(book?.coverImage)}
              alt={book?.title}
              className="w-32 h-44 object-cover rounded-lg shadow-2xl mb-6 ring-4 ring-white/20"
            />
          ) : (
            <div className="w-32 h-44 bg-white/20 rounded-lg shadow-2xl mb-6 flex items-center justify-center">
              <IoBookOutline className="w-16 h-16 text-white/60" />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-lg">
            {book?.title || "Untitled Book"}
          </h1>

          {book?.author?.displayName && (
            <p className="text-lg text-white/80 mb-6">
              by {book.author.displayName}
            </p>
          )}

          <div className="flex items-center gap-2 text-white/60 text-sm">
            <IoReader className="w-4 h-4" />
            <span>Swipe or click to turn pages</span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-white/60 text-lg mb-4">Thank you for reading</p>
          <h2 className="text-xl font-semibold text-white mb-2">
            {book?.title || "Untitled Book"}
          </h2>
          {book?.author?.displayName && (
            <p className="text-white/70">by {book.author.displayName}</p>
          )}
          <div className="mt-8 text-white/40 text-sm">
            <IoBookOutline className="w-8 h-8 mx-auto mb-2" />
            <p>The End</p>
          </div>
        </div>
      )}
    </div>
  );
});

CoverPage.displayName = "CoverPage";

export default function BookReader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const flipBookRef = useRef(null);

  const initialState = location.state || {};
  const initialSummary = initialState.book?.reviewSummary || {};

  const [book, setBook] = useState(initialState.book || null);
  const [viewerUrl, setViewerUrl] = useState(initialState.viewerUrl || "");
  const [downloadUrl, setDownloadUrl] = useState(
    initialState.downloadUrl || "",
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImages, setPageImages] = useState({});
  const [loadingPages, setLoadingPages] = useState({});
  const [theme, setTheme] = useState("light");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState({
    averageRating: initialSummary.averageRating || 0,
    ratingsCount: initialSummary.ratingsCount || 0,
  });
  const [userReview, setUserReview] = useState(initialState.userReview || null);
  const [reviewForm, setReviewForm] = useState({
    rating: initialState.userReview?.rating || 0,
    title: initialState.userReview?.title || "",
    comment: initialState.userReview?.comment || "",
  });
  const [reviewsMeta, setReviewsMeta] = useState({
    total: 0,
    totalPages: 0,
    limit: REVIEWS_PER_PAGE,
    page: 1,
  });
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const pdfRef = useRef(null);
  const progressSyncRef = useRef({ lastSent: 0, lastPage: 0, totalPages: 0 });
  const containerRef = useRef(null);

  const progress = useMemo(() => {
    if (!totalPages) return 0;
    return Math.min(100, Math.round((currentPage / totalPages) * 100));
  }, [currentPage, totalPages]);

  // Sync progress to backend
  useEffect(() => {
    if (!user || !bookId) return undefined;
    if (!totalPages) return undefined;

    const payload = {
      progress,
      lastPage: currentPage,
      totalPages,
      source: "view",
    };

    const timer = setTimeout(() => {
      const snapshot = progressSyncRef.current;
      if (
        snapshot.lastSent === payload.progress &&
        snapshot.lastPage === payload.lastPage &&
        snapshot.totalPages === payload.totalPages
      ) {
        return;
      }

      updateReaderBook(bookId, payload)
        .then(() => {
          progressSyncRef.current = {
            lastSent: payload.progress,
            lastPage: payload.lastPage,
            totalPages: payload.totalPages,
          };
        })
        .catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [bookId, currentPage, progress, totalPages, user]);

  // Render a single page
  const renderPage = useCallback(async (pdf, pageNum) => {
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return null;

    try {
      const page = await pdf.getPage(pageNum);
      const scale = 2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, []);

  // Preload pages around current page
  const preloadPages = useCallback(
    async (pdf, centerPage, range = 3) => {
      const pagesToLoad = [];
      for (
        let i = Math.max(1, centerPage - range);
        i <= Math.min(pdf.numPages, centerPage + range);
        i++
      ) {
        if (!pageImages[i] && !loadingPages[i]) {
          pagesToLoad.push(i);
        }
      }

      if (pagesToLoad.length === 0) return;

      setLoadingPages((prev) => {
        const next = { ...prev };
        pagesToLoad.forEach((p) => {
          next[p] = true;
        });
        return next;
      });

      const results = await Promise.all(
        pagesToLoad.map(async (pageNum) => {
          const image = await renderPage(pdf, pageNum);
          return { pageNum, image };
        }),
      );

      setPageImages((prev) => {
        const next = { ...prev };
        results.forEach(({ pageNum, image }) => {
          if (image) next[pageNum] = image;
        });
        return next;
      });

      setLoadingPages((prev) => {
        const next = { ...prev };
        pagesToLoad.forEach((p) => {
          delete next[p];
        });
        return next;
      });
    },
    [pageImages, loadingPages, renderPage],
  );

  // Load PDF document
  const loadPdfDocument = useCallback(
    async (url) => {
      setIsInitialLoading(true);
      setError("");

      try {
        if (pdfRef.current) {
          await pdfRef.current.destroy().catch(() => {});
          pdfRef.current = null;
        }

        const task = pdfjsLib.getDocument({ url, withCredentials: false });
        const pdf = await task.promise;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages || 0);

        // Load first few pages
        await preloadPages(pdf, 1, 5);
      } catch (err) {
        setError(
          err?.message || "We couldn't open this book. Please try again.",
        );
      } finally {
        setIsInitialLoading(false);
      }
    },
    [preloadPages],
  );

  // Fetch reviews
  const fetchReviews = useCallback(
    async (page = 1) => {
      setReviewsLoading(true);
      setReviewsError("");

      try {
        const data = await getMarketplaceBookReviews(bookId, {
          page,
          limit: REVIEWS_PER_PAGE,
        });

        const pageMeta = data?.meta || {};
        setReviews(data?.reviews || []);
        setReviewsSummary({
          averageRating: data?.summary?.averageRating || 0,
          ratingsCount: data?.summary?.ratingsCount || 0,
        });
        setReviewsMeta({
          total: pageMeta.total || 0,
          totalPages: pageMeta.totalPages || 0,
          limit: pageMeta.limit || REVIEWS_PER_PAGE,
          page: pageMeta.page || page,
        });
        setReviewsPage(pageMeta.page || page);
      } catch (err) {
        setReviewsError(
          err?.response?.data?.message || "Unable to load reviews right now.",
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    [bookId],
  );

  // Initialize
  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      try {
        let activeViewer = initialState.viewerUrl;
        let accessBook = initialState.book;
        let activeDownload = initialState.downloadUrl;
        let accessReview = initialState.userReview;

        if (!activeViewer || !accessBook) {
          const data = await getMarketplaceBookAccess(bookId);
          activeViewer = data?.viewerUrl;
          accessBook = data?.book;
          activeDownload = data?.downloadUrl;
          accessReview = data?.userReview;
        }

        if (!activeViewer) {
          throw new Error("Viewer not available for this title.");
        }

        if (!isMounted) return;

        setBook(accessBook || null);
        setViewerUrl(activeViewer);
        setDownloadUrl(activeDownload || "");
        setUserReview(accessReview || null);
        setReviewForm({
          rating: accessReview?.rating || 0,
          title: accessReview?.title || "",
          comment: accessReview?.comment || "",
        });
        setReviewsSummary({
          averageRating:
            accessBook?.reviewSummary?.averageRating ||
            initialSummary.averageRating ||
            0,
          ratingsCount:
            accessBook?.reviewSummary?.ratingsCount ||
            initialSummary.ratingsCount ||
            0,
        });

        await loadPdfDocument(activeViewer);
        recordMarketplaceBookView(bookId).catch(() => {});
        fetchReviews(1);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load this book.",
        );
        setIsInitialLoading(false);
        setReviewsLoading(false);
      }
    };

    initialise();

    return () => {
      isMounted = false;
      if (pdfRef.current) {
        pdfRef.current.cleanup();
        pdfRef.current.destroy().catch(() => {});
        pdfRef.current = null;
      }
    };
  }, [bookId]);

  // Handle page flip
  const onFlip = useCallback(
    (e) => {
      const newPage = e.data + 1; // Convert from 0-indexed to 1-indexed
      setCurrentPage(newPage);

      // Preload surrounding pages
      if (pdfRef.current) {
        preloadPages(pdfRef.current, newPage, 3);
      }
    },
    [preloadPages],
  );

  const goToPage = (pageNum) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flip(pageNum - 1);
    }
  };

  const nextPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const prevPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const goToFirstPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flip(0);
    }
  };

  const goToLastPage = () => {
    if (flipBookRef.current && totalPages) {
      flipBookRef.current.pageFlip().flip(totalPages + 1); // +1 for back cover
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const toggleBookmark = () => {
    if (currentPage <= 0) return;

    setBookmarks((prev) => {
      if (prev.includes(currentPage)) {
        return prev.filter((p) => p !== currentPage);
      }
      return [...prev, currentPage].sort((a, b) => a - b);
    });
    toast.success(
      bookmarks.includes(currentPage) ? "Bookmark removed" : "Page bookmarked",
    );
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const data = await recordMarketplaceBookDownload(bookId);
      const finalUrl = data?.downloadUrl || downloadUrl || viewerUrl;

      if (!finalUrl) {
        throw new Error("Download link unavailable right now.");
      }

      await downloadFileFromUrl(
        finalUrl,
        `${sanitizeFilename(book?.title || "book")}.pdf`,
      );
      toast.success("Download started");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Download failed",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      toast.error("Sign in to share your review");
      return;
    }

    if (!reviewForm.rating) {
      toast.error("Select a rating to continue");
      return;
    }

    setIsSubmittingReview(true);

    try {
      const payload = {
        rating: reviewForm.rating,
        title: reviewForm.title?.trim() || "",
        comment: reviewForm.comment?.trim() || "",
      };

      const response = await submitMarketplaceBookReview(bookId, payload);
      const savedReview = response?.review;
      const summary = response?.summary;
      const isUpdate = Boolean(userReview);

      setUserReview(savedReview || null);
      setReviewForm({
        rating: savedReview?.rating || payload.rating,
        title: savedReview?.title || payload.title,
        comment: savedReview?.comment || payload.comment,
      });
      setReviewsSummary({
        averageRating: summary?.averageRating || 0,
        ratingsCount: summary?.ratingsCount || 0,
      });

      toast.success(isUpdate ? "Review updated" : "Thanks for the review!");
      fetchReviews(1);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to submit review",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const goBack = () => {
    navigate(-1);
  };

  // Theme classes
  const bgClass =
    theme === "dark"
      ? "bg-slate-950"
      : "bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50";
  const surfaceClass =
    theme === "dark"
      ? "bg-slate-900 border-slate-800"
      : "bg-white/90 backdrop-blur border-slate-200";
  const textClass = theme === "dark" ? "text-white" : "text-slate-900";
  const mutedClass = theme === "dark" ? "text-slate-400" : "text-slate-500";

  // Generate pages array for flipbook
  const pagesArray = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextPage();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevPage();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToFirstPage();
      } else if (e.key === "End") {
        e.preventDefault();
        goToLastPage();
      } else if (e.key === "Escape" && isFullscreen) {
        document.exitFullscreen?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Responsive listener for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div ref={containerRef} className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Top Header Bar */}
      <header
        className={`sticky top-0 z-50 border-b ${surfaceClass} px-4 py-3`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-lg truncate max-w-xs">
                {book?.title || "Loading..."}
              </h1>
              <p className={`text-sm ${mutedClass}`}>
                Page {currentPage} of {totalPages || "–"}
              </p>
            </div>
          </div>

          {/* Center - Progress bar (desktop) */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${mutedClass}`}>
              {progress}%
            </span>
          </div>

          {/* Right section - Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-xl transition-colors ${
                bookmarks.includes(currentPage)
                  ? "bg-yellow-100 text-yellow-600"
                  : theme === "dark"
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="Bookmark page"
            >
              {bookmarks.includes(currentPage) ? (
                <IoBookmark className="w-5 h-5" />
              ) : (
                <IoBookmarkOutline className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors ${
                theme === "dark"
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <IoSunny className="w-5 h-5" />
              ) : (
                <IoMoon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-xl transition-colors ${
                theme === "dark"
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="Toggle fullscreen"
            >
              {isFullscreen ? (
                <IoContract className="w-5 h-5" />
              ) : (
                <IoExpand className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-xl transition-colors ${
                showSidebar
                  ? "bg-blue-100 text-blue-600"
                  : theme === "dark"
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title="Table of contents"
            >
              <IoList className="w-5 h-5" />
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isDownloading
                  ? "bg-blue-100 text-blue-400 cursor-wait"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <IoDownload className="w-5 h-5" />
              <span className="hidden lg:inline">Download</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <aside
            className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 border-r ${surfaceClass} transform transition-transform lg:translate-x-0 overflow-y-auto`}
            style={{ top: "73px", height: "calc(100vh - 73px)" }}
          >
            <div className="p-4 space-y-6">
              {/* Book info */}
              <div className="text-center">
                {resolveCoverImage(book?.coverImage) ? (
                  <img
                    src={resolveCoverImage(book?.coverImage)}
                    alt={book?.title}
                    className="w-24 h-32 object-cover rounded-lg shadow-lg mx-auto mb-3"
                  />
                ) : (
                  <div
                    className={`w-24 h-32 rounded-lg shadow-lg mx-auto mb-3 flex items-center justify-center ${
                      theme === "dark" ? "bg-slate-800" : "bg-slate-100"
                    }`}
                  >
                    <IoBookOutline className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                <h3 className="font-semibold">{book?.title}</h3>
                {book?.author?.displayName && (
                  <p className={`text-sm ${mutedClass}`}>
                    {book.author.displayName}
                  </p>
                )}
              </div>

              {/* Progress */}
              <div
                className={`rounded-xl p-4 ${
                  theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <div className="flex justify-between text-sm mb-2">
                  <span className={mutedClass}>Progress</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={`text-xs ${mutedClass} mt-2`}>
                  Page {currentPage} of {totalPages}
                </p>
              </div>

              {/* Bookmarks */}
              {bookmarks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <IoBookmark className="w-4 h-4 text-yellow-500" />
                    Bookmarks
                  </h4>
                  <div className="space-y-1">
                    {bookmarks.map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentPage === page
                            ? "bg-blue-100 text-blue-700"
                            : theme === "dark"
                              ? "hover:bg-slate-800"
                              : "hover:bg-slate-100"
                        }`}
                      >
                        Page {page}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick jump */}
              <div>
                <h4 className="font-semibold mb-3">Quick Jump</h4>
                <div className="grid grid-cols-5 gap-1">
                  {[10, 25, 50, 75, 90].map((percent) => {
                    const targetPage = Math.ceil((percent / 100) * totalPages);
                    return (
                      <button
                        key={percent}
                        onClick={() => goToPage(targetPage)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          theme === "dark"
                            ? "bg-slate-800 hover:bg-slate-700"
                            : "bg-slate-100 hover:bg-slate-200"
                        }`}
                      >
                        {percent}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div
                className={`rounded-xl p-4 ${
                  theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={mutedClass}>Rating</span>
                  <div className="flex items-center gap-1">
                    <IoStar className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold">
                      {reviewsSummary.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className={`text-xs ${mutedClass} mt-1`}>
                  {reviewsSummary.ratingsCount} reviews
                </p>
                <button
                  onClick={() => setShowReviews(true)}
                  className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  View Reviews
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center py-8 px-4">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 border border-red-200 rounded-xl p-4 max-w-md">
              <p className="font-medium mb-2">{error}</p>
              <button
                onClick={() => viewerUrl && loadPdfDocument(viewerUrl)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className={mutedClass}>Loading your book...</p>
            </div>
          ) : (
            <>
              {/* Flipbook container */}
              <div
                className={`relative rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl ${
                  theme === "dark" ? "bg-slate-900" : "bg-white"
                }`}
                style={{
                  boxShadow:
                    theme === "dark"
                      ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                      : "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                }}
              >
                <HTMLFlipBook
                  ref={flipBookRef}
                  width={isMobile ? 300 : 800}
                  height={isMobile ? 450 : 600}
                  size="stretch"
                  minWidth={isMobile ? 280 : 500}
                  maxWidth={isMobile ? 400 : 1400}
                  minHeight={isMobile ? 400 : 450}
                  maxHeight={isMobile ? 600 : 900}
                  showCover={true}
                  mobileScrollSupport={true}
                  onFlip={onFlip}
                  className="flipbook"
                  style={{
                    width: "100%",
                    maxWidth: isMobile ? "100%" : "1400px",
                    margin: "0 auto",
                  }}
                  startPage={0}
                  drawShadow={true}
                  flippingTime={isMobile ? 400 : 600}
                  usePortrait={isMobile}
                  startZIndex={0}
                  autoSize={true}
                  maxShadowOpacity={0.5}
                  showPageCorners={true}
                  disableFlipByClick={false}
                >
                  {/* Front Cover */}
                  <CoverPage book={book} theme={theme} isFront={true} />

                  {/* Content Pages */}
                  {pagesArray.map((pageNum) => (
                    <Page
                      key={pageNum}
                      pageImage={pageImages[pageNum]}
                      pageNumber={pageNum}
                      isLoading={loadingPages[pageNum]}
                      theme={theme}
                    />
                  ))}

                  {/* Back Cover */}
                  <CoverPage book={book} theme={theme} isFront={false} />
                </HTMLFlipBook>
              </div>

              {/* Page navigation */}
              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={goToFirstPage}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === "dark"
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white text-slate-600 hover:bg-slate-100 shadow-md"
                  }`}
                  title="First page"
                >
                  <IoPlaySkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={prevPage}
                  className={`p-3 rounded-xl transition-colors ${
                    theme === "dark"
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white text-slate-600 hover:bg-slate-100 shadow-md"
                  }`}
                  title="Previous page"
                >
                  <IoChevronBack className="w-6 h-6" />
                </button>

                <div
                  className={`px-6 py-2 rounded-xl font-medium ${
                    theme === "dark" ? "bg-slate-800" : "bg-white shadow-md"
                  }`}
                >
                  <span className="text-blue-600 font-bold">{currentPage}</span>
                  <span className={mutedClass}> / {totalPages}</span>
                </div>

                <button
                  onClick={nextPage}
                  className={`p-3 rounded-xl transition-colors ${
                    theme === "dark"
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white text-slate-600 hover:bg-slate-100 shadow-md"
                  }`}
                  title="Next page"
                >
                  <IoChevronForward className="w-6 h-6" />
                </button>

                <button
                  onClick={goToLastPage}
                  className={`p-2 rounded-xl transition-colors ${
                    theme === "dark"
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-white text-slate-600 hover:bg-slate-100 shadow-md"
                  }`}
                  title="Last page"
                >
                  <IoPlaySkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Keyboard hints */}
              <p className={`mt-4 text-sm ${mutedClass}`}>
                Use{" "}
                <kbd className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs">
                  ←
                </kbd>{" "}
                <kbd className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs">
                  →
                </kbd>{" "}
                arrow keys or click/swipe to navigate
              </p>
            </>
          )}
        </main>
      </div>

      {/* Reviews Modal */}
      {showReviews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden ${surfaceClass}`}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold">Reviews & Ratings</h3>
              <button
                onClick={() => setShowReviews(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
              {/* Summary */}
              <div
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                }`}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {reviewsSummary.averageRating.toFixed(1)}
                  </p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <IoStar
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(reviewsSummary.averageRating)
                            ? "text-yellow-400"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-sm ${mutedClass}`}>
                    {reviewsSummary.ratingsCount} reviews
                  </p>
                </div>
              </div>

              {/* Review form */}
              {user ? (
                <form
                  onSubmit={handleReviewSubmit}
                  className={`p-4 rounded-xl space-y-4 ${
                    theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Your Review</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setReviewForm((prev) => ({
                              ...prev,
                              rating: value,
                            }))
                          }
                          className="text-yellow-400 hover:scale-110 transition-transform"
                        >
                          {reviewForm.rating >= value ? (
                            <IoStar className="w-6 h-6" />
                          ) : (
                            <IoStarOutline className="w-6 h-6" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Review title"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === "dark"
                        ? "bg-slate-900 border-slate-700"
                        : "bg-white border-slate-200"
                    }`}
                  />

                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        comment: e.target.value,
                      }))
                    }
                    placeholder="Share your thoughts..."
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border resize-none ${
                      theme === "dark"
                        ? "bg-slate-900 border-slate-700"
                        : "bg-white border-slate-200"
                    }`}
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      isSubmittingReview
                        ? "bg-blue-300 cursor-wait"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isSubmittingReview ? (
                      "Submitting..."
                    ) : userReview ? (
                      "Update Review"
                    ) : (
                      <>
                        <IoSend className="w-4 h-4 inline mr-2" />
                        Submit Review
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div
                  className={`p-4 rounded-xl text-center ${
                    theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                  }`}
                >
                  <p className={mutedClass}>Sign in to leave a review</p>
                </div>
              )}

              {/* Reviews list */}
              <div className="space-y-3">
                {reviewsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className={`text-center py-8 ${mutedClass}`}>
                    No reviews yet. Be the first!
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className={`p-4 rounded-xl ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                              theme === "dark"
                                ? "bg-slate-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {review.userSnapshot?.displayName?.[0] ||
                              review.userSnapshot?.username?.[0] ||
                              "R"}
                          </div>
                          <div>
                            <p className="font-medium">
                              {review.userSnapshot?.displayName ||
                                review.userSnapshot?.username ||
                                "Reader"}
                            </p>
                            <p className={`text-xs ${mutedClass}`}>
                              {formatReviewDate(review.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          {[1, 2, 3, 4, 5].map((star) =>
                            star <= review.rating ? (
                              <IoStar key={star} className="w-4 h-4" />
                            ) : (
                              <IoStarOutline key={star} className="w-4 h-4" />
                            ),
                          )}
                        </div>
                      </div>
                      {review.title && (
                        <p className="font-medium mt-3">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className={`mt-2 text-sm ${mutedClass}`}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
