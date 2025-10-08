import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
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
} from "react-icons/io5";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  getMarketplaceBookAccess,
  getMarketplaceBookReviews,
  recordMarketplaceBookDownload,
  recordMarketplaceBookView,
  submitMarketplaceBookReview,
} from "../utils/api";
import { downloadFileFromUrl, sanitizeFilename } from "../utils/fileDownload";
import { AuthContext } from "../context/AuthContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const DEFAULT_CHAPTERS = ["Overview", "Highlights", "Key Ideas", "Quotes"];
const REVIEWS_PER_PAGE = 5;

const buildParagraphs = (items = []) => {
  const merged = items
    .map((item) => item?.str?.trim?.())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!merged) return [];

  const segments = merged.split(/(?<=[.!?])\s+(?=[A-Z0-9])/g);
  return segments.length ? segments : [merged];
};

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

export default function BookReader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const initialState = location.state || {};
  const initialSummary = initialState.book?.reviewSummary || {};

  const [book, setBook] = useState(initialState.book || null);
  const [viewerUrl, setViewerUrl] = useState(initialState.viewerUrl || "");
  const [downloadUrl, setDownloadUrl] = useState(
    initialState.downloadUrl || ""
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImage, setPageImage] = useState("");
  const [pageText, setPageText] = useState([]);
  const [theme, setTheme] = useState("light");
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

  const progress = useMemo(() => {
    if (!totalPages) return 0;
    return Math.min(100, Math.round((pageNumber / totalPages) * 100));
  }, [pageNumber, totalPages]);

  const chapterList = useMemo(() => {
    if (book?.tags?.length) {
      return book.tags.slice(0, 6);
    }
    return DEFAULT_CHAPTERS;
  }, [book?.tags]);

  const renderPage = useCallback(async (pdf, targetPage) => {
    if (!pdf) return;
    setIsPageLoading(true);
    setError("");

    try {
      const page = await pdf.getPage(targetPage);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const textContent = await page.getTextContent();
      const paragraphs = buildParagraphs(textContent.items);

      setPageImage(canvas.toDataURL("image/png"));
      setPageText(paragraphs);
      setPageNumber(targetPage);
    } catch (err) {
      setError(err?.message || "Unable to render this page.");
    } finally {
      setIsPageLoading(false);
    }
  }, []);

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
        await renderPage(pdf, 1);
      } catch (err) {
        setError(
          err?.message || "We couldn't open this book. Please try again."
        );
      } finally {
        setIsInitialLoading(false);
      }
    },
    [renderPage]
  );

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
          err?.response?.data?.message || "Unable to load reviews right now."
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    [bookId]
  );

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
            "Failed to load this book."
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
  }, [
    bookId,
    fetchReviews,
    initialState.book,
    initialState.downloadUrl,
    initialState.userReview,
    initialState.viewerUrl,
    initialSummary.averageRating,
    initialSummary.ratingsCount,
    loadPdfDocument,
  ]);

  const handlePreviousPage = async () => {
    if (!pdfRef.current || pageNumber <= 1 || isPageLoading) return;
    await renderPage(pdfRef.current, pageNumber - 1);
  };

  const handleNextPage = async () => {
    if (!pdfRef.current || pageNumber >= totalPages || isPageLoading) return;
    await renderPage(pdfRef.current, pageNumber + 1);
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
        `${sanitizeFilename(book?.title || "book")}.pdf`
      );
      toast.success("Download started");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Download failed"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRatingSelect = (value) => {
    setReviewForm((prev) => ({
      ...prev,
      rating: value,
    }));
  };

  const handleReviewFieldChange = (field, value) => {
    setReviewForm((prev) => ({
      ...prev,
      [field]: value,
    }));
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
          "Unable to submit review"
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewsPageChange = (nextPage) => {
    if (reviewsMeta.totalPages && nextPage > reviewsMeta.totalPages) return;
    if (nextPage <= 0 || nextPage === reviewsPage) return;
    fetchReviews(nextPage);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const goBack = () => {
    navigate(-1);
  };

  const readerShellClasses =
    theme === "dark"
      ? "bg-slate-950 text-slate-100"
      : "bg-slate-100 text-slate-900";

  const surfaceClasses =
    theme === "dark"
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-slate-200";

  const reviewPagination = useMemo(() => {
    if (!reviewsMeta.totalPages || reviewsMeta.totalPages <= 1) {
      return [];
    }

    const pages = [];
    for (let i = 1; i <= reviewsMeta.totalPages; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [reviewsMeta.totalPages]);

  return (
    <div className={`min-h-screen ${readerShellClasses}`}>
      <div className="flex flex-col lg:flex-row min-h-screen">
        <aside
          className={`lg:flex w-full lg:w-72 flex-col border-b lg:border-b-0 lg:border-r ${surfaceClasses} sticky top-0 z-20`}
        >
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-500 mb-1">
                  Now reading
                </p>
                <h1 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                  {book?.title || "Loading book"}
                </h1>
                {book?.author?.displayName && (
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {book.author.displayName}
                  </p>
                )}
              </div>
              <div className="bg-blue-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-blue-500 dark:text-blue-300 uppercase tracking-wide">
                  Progress
                </p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {progress}%
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-300">
                  {pageNumber}/{totalPages || "–"} pages
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="flex items-center justify-between text-xs text-blue-500 dark:text-blue-300 mb-2">
                <span>Progress</span>
                <span>
                  {pageNumber} / {totalPages || "–"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-blue-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Chapters
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:block">
                {chapterList.map((chapter) => (
                  <span
                    key={chapter}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-blue-50 dark:bg-slate-800/60 text-sm text-blue-600 dark:text-blue-300"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="truncate">{chapter}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:block">
              <div className="rounded-xl bg-white/70 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Average rating
                  </p>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <IoStar className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {reviewsSummary.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                  {reviewsSummary.ratingsCount} review
                  {reviewsSummary.ratingsCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="hidden lg:block text-xs text-blue-500 dark:text-blue-300">
                Reader tips · switch to dark mode for low-light reading and use
                download to save offline.
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header
            className={`flex items-center justify-between px-4 sm:px-8 py-4 border-b ${surfaceClasses}`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 transition-colors"
              >
                <IoArrowBack className="w-4 h-4" />
                <span className="hidden sm:inline">Back to marketplace</span>
              </button>
              <div>
                <p className="text-xs text-blue-500 uppercase tracking-wide">
                  Page {pageNumber} of {totalPages || "–"}
                </p>
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {book?.title || "Untitled"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-200 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? (
                  <IoSunny className="w-5 h-5" />
                ) : (
                  <IoMoon className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-colors ${
                  isDownloading
                    ? "bg-blue-100 text-blue-300 cursor-wait"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <IoDownload className="w-5 h-5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-4">
                  <p className="font-medium mb-2">{error}</p>
                  <button
                    type="button"
                    onClick={() => viewerUrl && loadPdfDocument(viewerUrl)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              {isInitialLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-96 rounded-3xl bg-blue-100" />
                  <div className="h-4 rounded bg-blue-100 w-3/4" />
                  <div className="h-4 rounded bg-blue-100 w-2/3" />
                  <div className="h-4 rounded bg-blue-100 w-5/6" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="mx-auto max-w-3xl rounded-3xl bg-white shadow-xl ring-1 ring-blue-100 overflow-hidden">
                      {pageImage ? (
                        <img
                          src={pageImage}
                          alt={`Page ${pageNumber}`}
                          className="w-full max-h-[75vh] object-contain"
                        />
                      ) : (
                        <div className="h-96 flex items-center justify-center text-blue-400">
                          Preparing page preview...
                        </div>
                      )}
                    </div>
                    {isPageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl text-blue-500">
                        Loading page...
                      </div>
                    )}
                  </div>

                  <article
                    className="rounded-3xl bg-white dark:bg-slate-900/60 shadow-sm ring-1 ring-blue-100 dark:ring-slate-800 px-5 sm:px-8 py-6 sm:py-8 space-y-4"
                    style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}
                  >
                    <header className="flex items-center gap-2 text-blue-500 dark:text-blue-300 uppercase tracking-wide text-xs">
                      <IoBookOutline className="w-4 h-4" />
                      <span>
                        Page {pageNumber} · {book?.title || "Reader"}
                      </span>
                    </header>
                    {pageText.length ? (
                      pageText.map((paragraph, index) => (
                        <p
                          key={`${pageNumber}-para-${index}`}
                          className="text-lg leading-relaxed text-slate-700 dark:text-slate-200"
                        >
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p className="text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                        Text extraction is unavailable for this page. Use the
                        image above to read the original layout.
                      </p>
                    )}
                  </article>

                  <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <section className="rounded-3xl bg-white dark:bg-slate-900/60 shadow-sm ring-1 ring-blue-100 dark:ring-slate-800 p-5 sm:p-6 space-y-5">
                      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-blue-500 dark:text-blue-300">
                            Reader thoughts
                          </p>
                          <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                            Reviews & highlights
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
                          <div className="flex items-center gap-1 text-yellow-400">
                            <IoStar className="w-4 h-4" />
                            <span className="font-semibold">
                              {reviewsSummary.averageRating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs uppercase tracking-wide">
                            {reviewsSummary.ratingsCount} review
                            {reviewsSummary.ratingsCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </header>

                      {user ? (
                        <form
                          onSubmit={handleReviewSubmit}
                          className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-blue-50/60 dark:bg-slate-900/60 p-4 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Share your review
                              </p>
                              <p className="text-xs text-blue-500 dark:text-blue-300">
                                Your review helps other readers decide
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => handleRatingSelect(value)}
                                  className="text-yellow-400 hover:scale-110 transition-transform"
                                  aria-label={`Rate ${value} star${
                                    value > 1 ? "s" : ""
                                  }`}
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

                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              type="text"
                              maxLength={120}
                              value={reviewForm.title}
                              onChange={(event) =>
                                handleReviewFieldChange(
                                  "title",
                                  event.target.value
                                )
                              }
                              placeholder="Give your review a headline"
                              className="w-full px-3 py-2 rounded-lg border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                            />
                            <div className="text-xs text-blue-500 dark:text-blue-400 self-center">
                              {reviewForm.title.length}/120 characters
                            </div>
                          </div>

                          <div className="space-y-2">
                            <textarea
                              value={reviewForm.comment}
                              onChange={(event) =>
                                handleReviewFieldChange(
                                  "comment",
                                  event.target.value
                                )
                              }
                              maxLength={1500}
                              rows={4}
                              placeholder="What stood out to you? Share insights without spoilers."
                              className="w-full px-3 py-2 rounded-lg border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-y"
                            />
                            <div className="flex items-center justify-between text-xs text-blue-500 dark:text-blue-400">
                              <span>{reviewForm.comment.length}/1500</span>
                              {userReview && (
                                <span className="text-green-500">
                                  Last updated{" "}
                                  {formatReviewDate(userReview.updatedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-xs text-blue-500 dark:text-blue-400">
                              You’re reviewing as{" "}
                              {user?.displayName || user?.username}
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                                isSubmittingReview
                                  ? "bg-blue-100 text-blue-400 cursor-wait"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              <IoSend className="w-5 h-5" />
                              <span>
                                {userReview ? "Update review" : "Post review"}
                              </span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-blue-50/60 dark:bg-slate-900/60 p-4 text-sm text-blue-600 dark:text-blue-300">
                          Sign in to share your review and keep track of your
                          rating across devices.
                        </div>
                      )}

                      <div className="space-y-4">
                        {reviewsLoading ? (
                          <div className="space-y-3">
                            {[...Array(REVIEWS_PER_PAGE)].map((_, index) => (
                              <div
                                key={index}
                                className="h-20 rounded-xl bg-blue-50 dark:bg-slate-800/60 animate-pulse"
                              />
                            ))}
                          </div>
                        ) : reviewsError ? (
                          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
                            {reviewsError}
                          </div>
                        ) : reviews.length === 0 ? (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-600">
                            Be the first to review this title.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {reviews.map((review) => (
                              <article
                                key={review.id}
                                className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 space-y-3"
                              >
                                <header className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                                      {review.userSnapshot?.displayName?.[0] ||
                                        review.userSnapshot?.username?.[0] ||
                                        "R"}
                                    </span>
                                    <div>
                                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                        {review.userSnapshot?.displayName ||
                                          review.userSnapshot?.username ||
                                          "Reader"}
                                      </p>
                                      <p className="text-xs text-blue-500 dark:text-blue-300">
                                        {formatReviewDate(review.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-yellow-400">
                                    {[1, 2, 3, 4, 5].map((value) =>
                                      value <= review.rating ? (
                                        <IoStar
                                          key={value}
                                          className="w-4 h-4"
                                        />
                                      ) : (
                                        <IoStarOutline
                                          key={value}
                                          className="w-4 h-4"
                                        />
                                      )
                                    )}
                                  </div>
                                </header>
                                {review.title && (
                                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    {review.title}
                                  </h4>
                                )}
                                {review.comment && (
                                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                                    {review.comment}
                                  </p>
                                )}
                              </article>
                            ))}

                            {reviewPagination.length > 0 && (
                              <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                <div className="text-blue-500 dark:text-blue-300">
                                  Page {reviewsPage} of {reviewsMeta.totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewsPageChange(reviewsPage - 1)
                                    }
                                    disabled={reviewsPage <= 1}
                                    className={`px-3 py-1 rounded-lg border transition-colors ${
                                      reviewsPage <= 1
                                        ? "border-blue-100 text-blue-200 cursor-not-allowed"
                                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                                    }`}
                                  >
                                    Prev
                                  </button>
                                  {reviewPagination.map((page) => (
                                    <button
                                      key={page}
                                      type="button"
                                      onClick={() =>
                                        handleReviewsPageChange(page)
                                      }
                                      className={`px-3 py-1 rounded-lg transition-colors ${
                                        page === reviewsPage
                                          ? "bg-blue-600 text-white"
                                          : "text-blue-700 hover:bg-blue-50"
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReviewsPageChange(reviewsPage + 1)
                                    }
                                    disabled={
                                      reviewsMeta.totalPages &&
                                      reviewsPage >= reviewsMeta.totalPages
                                    }
                                    className={`px-3 py-1 rounded-lg border transition-colors ${
                                      reviewsMeta.totalPages &&
                                      reviewsPage >= reviewsMeta.totalPages
                                        ? "border-blue-100 text-blue-200 cursor-not-allowed"
                                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                                    }`}
                                  >
                                    Next
                                  </button>
                                </div>
                              </nav>
                            )}
                          </div>
                        )}
                      </div>
                    </section>

                    <aside className="rounded-3xl bg-white dark:bg-slate-900/60 shadow-sm ring-1 ring-blue-100 dark:ring-slate-800 p-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          Quick actions
                        </h4>
                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                              isDownloading
                                ? "bg-blue-100 text-blue-300 cursor-wait"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            <IoDownload className="w-4 h-4" />
                            Download PDF
                          </button>
                          <button
                            type="button"
                            onClick={toggleTheme}
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm border border-blue-200 dark:border-slate-800 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-slate-800"
                          >
                            {theme === "dark" ? (
                              <IoSunny className="w-4 h-4" />
                            ) : (
                              <IoMoon className="w-4 h-4" />
                            )}
                            Switch theme
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-blue-50/60 dark:bg-slate-900/60 p-4 text-sm text-blue-700 dark:text-blue-200 space-y-2">
                        <p className="font-semibold">Reading tip</p>
                        <p>
                          Use the pagination controls below to move between
                          pages. We remember your progress for smoother
                          sessions.
                        </p>
                      </div>
                    </aside>
                  </div>
                </>
              )}
            </div>
          </section>

          <footer
            className={`flex items-center justify-between px-4 sm:px-8 py-4 border-t ${surfaceClasses}`}
          >
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={isPageLoading || pageNumber <= 1}
              className={`inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-base transition-colors ${
                pageNumber <= 1 || isPageLoading
                  ? "bg-blue-100 text-blue-300 cursor-not-allowed"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <IoChevronBack className="w-5 h-5" />
              <span className="hidden sm:inline">Previous page</span>
            </button>

            <div className="text-xs sm:text-sm text-blue-500 dark:text-blue-300">
              Page {pageNumber} of {totalPages || "–"}
            </div>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={
                isPageLoading || !totalPages || pageNumber >= totalPages
              }
              className={`inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-base transition-colors ${
                pageNumber >= totalPages || isPageLoading
                  ? "bg-blue-100 text-blue-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <span className="hidden sm:inline">Next page</span>
              <IoChevronForward className="w-5 h-5" />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
