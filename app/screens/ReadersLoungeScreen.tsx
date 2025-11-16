import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";
import { AppTheme, useAppTheme } from "../context/ThemeContext";
import { Navbar } from "../components/layout/Navbar";
import { FlipBookViewer } from "../components/creator/FlipBookViewer";
import { useRouter } from "expo-router";
import axios from "axios";

const API_URL = "http://10.179.215.93:5000/api";
const { width, height } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

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
  { id: "discover", name: "Discover", icon: "search" },
  { id: "library", name: "My Library", icon: "library" },
  { id: "reading", name: "Currently Reading", icon: "book" },
  { id: "wishlist", name: "Wishlist", icon: "heart" },
];

interface Book {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  genre?: string;
  isFree?: boolean;
  coverImage?: {
    url?: string;
    secureUrl?: string;
  };
  author?: {
    displayName?: string;
    username?: string;
  };
  seller?: {
    storeName?: string;
  };
  reviewSummary?: {
    averageRating?: number;
    ratingsCount?: number;
  };
  stats?: {
    downloads?: number;
    views?: number;
  };
  trendingScore?: number;
}

interface ReaderEntry {
  id: string;
  book: Book;
  progress?: number;
  status?: string;
  lastReadAt?: string;
  updatedAt?: string;
  addedAt?: string;
}

interface CollectionState {
  items: ReaderEntry[];
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  loading: boolean;
  error: string;
  initialized: boolean;
}

const formatCurrencyINR = (value: number | string | undefined) => {
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
    return `₹${formatted}`;
  } catch (error) {
    return `₹${amount.toFixed(fractionDigits)}`;
  }
};

const resolveCoverUrl = (book: Book) =>
  book?.coverImage?.secureUrl || book?.coverImage?.url || "";

const resolveAuthorName = (book: Book) =>
  book?.author?.displayName ||
  book?.author?.username ||
  book?.seller?.storeName ||
  "Unknown author";

const createCollectionState = (): CollectionState => ({
  items: [],
  meta: { total: 0, totalPages: 0, page: 1, limit: COLLECTION_PAGE_SIZE },
  loading: false,
  error: "",
  initialized: false,
});

export default function ReadersLoungeScreen() {
  const { user, token } = useAuth();
  const { theme } = useAppTheme();
  const isAuthenticated = Boolean(user && token);

  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  const [discoverBooks, setDiscoverBooks] = useState<Book[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverPage, setDiscoverPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const [bookStatuses, setBookStatuses] = useState<Record<string, any>>({});
  const [wishlistProcessing, setWishlistProcessing] = useState<
    Record<string, boolean>
  >({});

  const [libraryState, setLibraryState] = useState<CollectionState>(
    createCollectionState
  );
  const [readingState, setReadingState] = useState<CollectionState>(
    createCollectionState
  );
  const [wishlistState, setWishlistState] = useState<CollectionState>(
    createCollectionState
  );

  // New states for rent modal, tip modal, and flip book
  const [rentModal, setRentModal] = useState<{
    book: Book;
    days: number;
    amount: number;
    submitting: boolean;
  } | null>(null);

  const [tipModal, setTipModal] = useState<{
    book: Book;
    amount: number;
    note: string;
    submitting: boolean;
  } | null>(null);

  const [rentProcessing, setRentProcessing] = useState<Record<string, boolean>>(
    {}
  );
  const [tipProcessing, setTipProcessing] = useState<Record<string, boolean>>(
    {}
  );

  const [flipBookViewer, setFlipBookViewer] = useState<{
    visible: boolean;
    book: Book | null;
    content: string;
  }>({
    visible: false,
    book: null,
    content: "",
  });

  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // API functions
  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const refreshBookStatuses = useCallback(
    async (ids: string[] = [], options: { merge?: boolean } = {}) => {
      if (!isAuthenticated) {
        if (!options.merge) {
          setBookStatuses({});
        }
        return;
      }

      const targetIds = ids.filter(Boolean);
      if (!targetIds.length) {
        if (!options.merge) {
          setBookStatuses({});
        }
        return;
      }

      try {
        const response = await axios.post(
          `${API_URL}/marketplace/reader/status`,
          { bookIds: targetIds },
          getAuthHeaders()
        );

        const incoming = response.data?.statuses || {};
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
        if (!options.merge) {
          setBookStatuses({});
        }
      }
    },
    [isAuthenticated, token]
  );

  const fetchDiscover = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setDiscoverLoading(true);
    setDiscoverError("");

    try {
      const params: any = { sort: sortBy, limit: 60 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedGenre !== "all") params.genre = selectedGenre;

      const response = await axios.get(`${API_URL}/marketplace/books`, {
        params,
        ...getAuthHeaders(),
      });

      const books = response.data?.books || [];
      setDiscoverBooks(books);
      setDiscoverPage(1);

      if (books.length) {
        await refreshBookStatuses(
          books.map((book: Book) => book._id),
          { merge: false }
        );
      } else {
        setBookStatuses({});
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to load marketplace titles";
      setDiscoverError(message);
      setDiscoverBooks([]);
      setBookStatuses({});
    } finally {
      setDiscoverLoading(false);
    }
  }, [debouncedSearch, selectedGenre, sortBy, refreshBookStatuses, token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDiscover();
    }
  }, [fetchDiscover, isAuthenticated]);

  const loadCollection = useCallback(
    async (category: string, page = 1) => {
      const setter =
        category === "library"
          ? setLibraryState
          : category === "reading"
          ? setReadingState
          : setWishlistState;

      setter((prev) => ({
        ...prev,
        loading: true,
        error: "",
      }));

      try {
        const response = await axios.get(
          `${API_URL}/marketplace/reader/books`,
          {
            params: {
              category,
              page,
              limit: COLLECTION_PAGE_SIZE,
            },
            ...getAuthHeaders(),
          }
        );

        const items = (response.data?.items || []).filter(
          (item: any) => item?.book
        );

        setter({
          items,
          meta: {
            total: response.data?.meta?.total || items.length,
            totalPages: response.data?.meta?.totalPages || 0,
            page: response.data?.meta?.page || page,
            limit: response.data?.meta?.limit || COLLECTION_PAGE_SIZE,
          },
          loading: false,
          error: "",
          initialized: true,
        });

        if (items.length) {
          await refreshBookStatuses(
            items.map((entry: ReaderEntry) => entry.book?._id).filter(Boolean),
            { merge: true }
          );
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.message || "Unable to load your books";
        setter((prev) => ({
          ...prev,
          loading: false,
          error: message,
          initialized: true,
        }));
      }
    },
    [refreshBookStatuses, token]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

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
    isAuthenticated,
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

  const handleDiscoverPageChange = (direction: number) => {
    const next = Math.min(
      Math.max(discoverPage + direction, 1),
      discoverTotalPages
    );
    setDiscoverPage(next);
  };

  const handleCollectionPageChange = (category: string, direction: number) => {
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

  const handleOpenBook = async (book: Book) => {
    if (!book?._id) return;

    try {
      const response = await axios.get(
        `${API_URL}/marketplace/books/${book._id}/access`,
        getAuthHeaders()
      );
      const access = response.data;

      // Get book content for FlipBook viewer
      const content =
        access?.content || book?.description || "No content available";

      // Update book status
      await axios
        .patch(
          `${API_URL}/marketplace/reader/books/${book._id}`,
          {
            status: "in-progress",
            progress: bookStatuses[book._id]?.progress || 0,
            source: "view",
          },
          getAuthHeaders()
        )
        .catch(() => {});

      await refreshBookStatuses([book._id], { merge: true });

      // Record view
      await axios
        .post(
          `${API_URL}/marketplace/books/${book._id}/view`,
          {},
          getAuthHeaders()
        )
        .catch(() => {});

      // Open FlipBook viewer
      setFlipBookViewer({
        visible: true,
        book: book,
        content: content,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to open this book";
      Alert.alert("Error", message);
    }
  };

  const handleCloseFlipBook = () => {
    setFlipBookViewer({
      visible: false,
      book: null,
      content: "",
    });
  };

  // Rent Modal Handlers
  const getSuggestedRentAmount = (book: Book) => {
    const price = Number(book?.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      return 0;
    }
    const base = Math.max(price * 0.25, 10);
    return Math.round(base);
  };

  const openRentModal = (book: Book) => {
    setRentModal({
      book,
      days: 7,
      amount: getSuggestedRentAmount(book),
      submitting: false,
    });
  };

  const closeRentModal = () => {
    if (!rentModal?.submitting) {
      setRentModal(null);
    }
  };

  const handleRentConfirm = async () => {
    if (!rentModal) return;

    const { book, days, amount } = rentModal;
    const bookId = book._id;

    setRentModal((prev) => (prev ? { ...prev, submitting: true } : null));
    setRentProcessing((prev) => ({ ...prev, [bookId]: true }));

    try {
      await axios.post(
        `${API_URL}/marketplace/books/${bookId}/rent`,
        { days, amount },
        getAuthHeaders()
      );

      Alert.alert("Success", `You've rented "${book.title}" for ${days} days!`);

      await refreshBookStatuses([bookId], { merge: true });
      setRentModal(null);

      if (activeTab === "library") {
        await loadCollection("library", libraryState.meta.page || 1);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to complete rental";
      Alert.alert("Error", message);
      setRentModal((prev) => (prev ? { ...prev, submitting: false } : null));
    } finally {
      setRentProcessing((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  // Tip Modal Handlers
  const openTipModal = (book: Book) => {
    setTipModal({
      book,
      amount: 50,
      note: "",
      submitting: false,
    });
  };

  const closeTipModal = () => {
    if (!tipModal?.submitting) {
      setTipModal(null);
    }
  };

  const handleTipConfirm = async () => {
    if (!tipModal) return;

    const { book, amount, note } = tipModal;
    const bookId = book._id;

    if (amount < 10) {
      Alert.alert("Error", "Minimum tip amount is ₹10");
      return;
    }

    setTipModal((prev) => (prev ? { ...prev, submitting: true } : null));
    setTipProcessing((prev) => ({ ...prev, [bookId]: true }));

    try {
      await axios.post(
        `${API_URL}/marketplace/books/${bookId}/tip`,
        { amount, note: note.trim() },
        getAuthHeaders()
      );

      Alert.alert(
        "Success",
        `Thank you for tipping ${resolveAuthorName(book)}!`
      );
      setTipModal(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Unable to send tip";
      Alert.alert("Error", message);
      setTipModal((prev) => (prev ? { ...prev, submitting: false } : null));
    } finally {
      setTipProcessing((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const handleStartWishlistBook = async (entry: ReaderEntry) => {
    const book = entry?.book;
    if (!book?._id) return;

    try {
      await axios.patch(
        `${API_URL}/marketplace/reader/books/${book._id}`,
        { status: "in-progress", source: "wishlist" },
        getAuthHeaders()
      );

      Alert.alert("Success", "Added to your library!");

      await Promise.all([
        refreshBookStatuses([book._id], { merge: true }),
        loadCollection("wishlist", wishlistState.meta.page || 1),
        loadCollection("reading", 1),
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to start reading";
      Alert.alert("Error", message);
    }
  };

  const formatRelativeTime = (value: string | undefined) => {
    if (!value) return "Just now";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Just now";

    const diff = date.getTime() - Date.now();
    const absDiff = Math.abs(diff);

    const units: [string, number][] = [
      ["year", 1000 * 60 * 60 * 24 * 365],
      ["month", 1000 * 60 * 60 * 24 * 30],
      ["week", 1000 * 60 * 60 * 24 * 7],
      ["day", 1000 * 60 * 60 * 24],
      ["hour", 1000 * 60 * 60],
      ["minute", 1000 * 60],
      ["second", 1000],
    ];

    for (const [unit, ms] of units) {
      if (absDiff >= ms || unit === "second") {
        const count = Math.round(diff / ms);
        if (count === 0) return "Just now";
        return count > 0
          ? `in ${Math.abs(count)} ${unit}${Math.abs(count) !== 1 ? "s" : ""}`
          : `${Math.abs(count)} ${unit}${Math.abs(count) !== 1 ? "s" : ""} ago`;
      }
    }
    return "Just now";
  };

  const handleWishlistToggle = async (book: Book) => {
    if (!book?._id) return;

    const bookId = book._id;
    setWishlistProcessing((prev) => ({ ...prev, [bookId]: true }));
    const isWishlisted = bookStatuses[bookId]?.status === "wishlist";

    try {
      if (isWishlisted) {
        await axios.delete(
          `${API_URL}/marketplace/books/${bookId}/wishlist`,
          getAuthHeaders()
        );
        Alert.alert("Success", "Removed from wishlist");
      } else {
        await axios.post(
          `${API_URL}/marketplace/books/${bookId}/wishlist`,
          {},
          getAuthHeaders()
        );
        Alert.alert("Success", "Added to wishlist");
      }

      await refreshBookStatuses([bookId], { merge: true });

      if (activeTab === "wishlist") {
        await loadCollection("wishlist", wishlistState.meta.page || 1);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to update wishlist";
      Alert.alert("Error", message);
    } finally {
      setWishlistProcessing((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const handleRemoveFromLibrary = async (entry: ReaderEntry) => {
    const bookId = entry?.book?._id;
    if (!bookId) return;

    try {
      await axios.delete(
        `${API_URL}/marketplace/reader/books/${bookId}`,
        getAuthHeaders()
      );
      Alert.alert("Success", "Book removed from your library");

      await Promise.all([
        refreshBookStatuses([bookId], { merge: true }),
        loadCollection("library", libraryState.meta.page || 1),
        loadCollection("reading", readingState.meta.page || 1),
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to update your library";
      Alert.alert("Error", message);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === "discover") {
      await fetchDiscover();
    } else if (activeTab === "library") {
      await loadCollection("library", libraryState.meta.page || 1);
    } else if (activeTab === "reading") {
      await loadCollection("reading", readingState.meta.page || 1);
    } else if (activeTab === "wishlist") {
      await loadCollection("wishlist", wishlistState.meta.page || 1);
    }
    setRefreshing(false);
  }, [
    activeTab,
    fetchDiscover,
    loadCollection,
    libraryState.meta.page,
    readingState.meta.page,
    wishlistState.meta.page,
  ]);

  const renderPagination = (
    page: number,
    totalPages: number,
    onChange: (direction: number) => void
  ) => {
    if (!totalPages || totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => onChange(-1)}
          disabled={page <= 1}
          style={[
            styles.paginationButton,
            page <= 1 && styles.paginationButtonDisabled,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={16}
            color={page <= 1 ? "#93c5fd" : "#2563eb"}
          />
          <Text
            style={[
              styles.paginationButtonText,
              page <= 1 && styles.paginationButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        <Text style={styles.paginationText}>
          Page {page} of {totalPages}
        </Text>
        <TouchableOpacity
          onPress={() => onChange(1)}
          disabled={page >= totalPages}
          style={[
            styles.paginationButton,
            page >= totalPages && styles.paginationButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.paginationButtonText,
              page >= totalPages && styles.paginationButtonTextDisabled,
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={page >= totalPages ? "#93c5fd" : "#2563eb"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Please log in to access Reader's Lounge.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Navbar */}
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/more")} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 130 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="library" size={32} color="#2563eb" />
            <Text style={styles.headerTitle}>Reader's Lounge</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Discover fresh titles, keep track of your reading journey, and
            curate your personal wishlist.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabsRow}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.id ? "#ffffff" : "#2563eb"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.id && styles.tabTextActive,
                    ]}
                  >
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Discover Tab */}
        {activeTab === "discover" && (
          <View>
            {/* Filters - Compact Layout */}
            <View style={styles.filtersCard}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Search the marketplace</Text>
                <View style={styles.searchInput}>
                  <Ionicons name="search" size={20} color="#60a5fa" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search books, authors, or genres"
                    placeholderTextColor="#9ca3af"
                    style={styles.searchInputText}
                  />
                </View>
              </View>

              <View style={styles.filtersRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Genre</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedGenre}
                      onValueChange={(value: string) => setSelectedGenre(value)}
                      style={styles.picker}
                    >
                      {genres.map((genre) => (
                        <Picker.Item
                          key={genre.value}
                          label={genre.name}
                          value={genre.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.filterHalf}>
                  <Text style={styles.filterLabel}>Sort by</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={sortBy}
                      onValueChange={(value: string) => setSortBy(value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Trending" value="trending" />
                      <Picker.Item label="Top rated" value="rating" />
                      <Picker.Item label="Newest" value="newest" />
                      <Picker.Item label="Most downloaded" value="downloads" />
                      <Picker.Item
                        label="Price: Low to high"
                        value="price-low"
                      />
                      <Picker.Item
                        label="Price: High to low"
                        value="price-high"
                      />
                    </Picker>
                  </View>
                </View>
              </View>
            </View>

            {/* Books Grid */}
            <View style={styles.booksCard}>
              {discoverLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>
                    Loading curated recommendations...
                  </Text>
                </View>
              ) : discoverError ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.errorText}>{discoverError}</Text>
                </View>
              ) : paginatedDiscoverBooks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No books found. Try adjusting your filters.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.booksList}>
                    {paginatedDiscoverBooks.map((book) => {
                      const cover = resolveCoverUrl(book);
                      const status = bookStatuses[book._id] || {};
                      const isWishlisted = status.status === "wishlist";
                      const isProcessingWishlist = wishlistProcessing[book._id];
                      const rating = book.reviewSummary?.averageRating || 0;
                      const reviews = book.reviewSummary?.ratingsCount || 0;

                      return (
                        <View key={book._id} style={styles.wideBookCard}>
                          <View style={styles.wideBookRow}>
                            <View style={styles.wideBookCover}>
                              {cover ? (
                                <Image
                                  source={{ uri: cover }}
                                  style={styles.wideBookCoverImage}
                                  resizeMode="contain"
                                />
                              ) : (
                                <View style={styles.wideBookCoverPlaceholder}>
                                  <Text
                                    style={styles.wideBookCoverPlaceholderText}
                                  >
                                    {book.title?.charAt(0) || "B"}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.wideBookContent}>
                              <View style={styles.wideBookHeader}>
                                <View style={styles.wideBookTitleSection}>
                                  <Text
                                    style={styles.wideBookTitle}
                                    numberOfLines={2}
                                  >
                                    {book.title}
                                  </Text>
                                  <Text
                                    style={styles.wideBookAuthor}
                                    numberOfLines={1}
                                  >
                                    by {resolveAuthorName(book)}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleWishlistToggle(book)}
                                  disabled={isProcessingWishlist}
                                  style={[
                                    styles.wideBookWishlistButton,
                                    isWishlisted &&
                                      styles.wideBookWishlistButtonActive,
                                  ]}
                                >
                                  <Ionicons
                                    name={
                                      isWishlisted ? "heart" : "heart-outline"
                                    }
                                    size={24}
                                    color={isWishlisted ? "#f43f5e" : "#2563eb"}
                                  />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.wideBookMeta}>
                                <View style={styles.wideBookRating}>
                                  <Ionicons
                                    name="star"
                                    size={14}
                                    color="#eab308"
                                  />
                                  <Text style={styles.wideBookRatingText}>
                                    {rating.toFixed(1)} ({reviews} reviews)
                                  </Text>
                                </View>
                                <Text style={styles.wideBookPrice}>
                                  {formatCurrencyINR(book.price)}
                                </Text>
                              </View>

                              <View style={styles.wideBookActions}>
                                {!book.isFree && Number(book.price || 0) > 0 ? (
                                  <>
                                    <TouchableOpacity
                                      onPress={() => openRentModal(book)}
                                      disabled={rentProcessing[book._id]}
                                      style={styles.wideBookPrimaryButton}
                                    >
                                      <Ionicons
                                        name="cash-outline"
                                        size={16}
                                        color="#ffffff"
                                      />
                                      <Text
                                        style={styles.wideBookPrimaryButtonText}
                                      >
                                        Rent
                                      </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => openTipModal(book)}
                                      disabled={tipProcessing[book._id]}
                                      style={styles.wideBookSecondaryButton}
                                    >
                                      <Ionicons
                                        name="gift-outline"
                                        size={16}
                                        color="#f59e0b"
                                      />
                                      <Text
                                        style={
                                          styles.wideBookSecondaryButtonText
                                        }
                                      >
                                        Tip
                                      </Text>
                                    </TouchableOpacity>
                                  </>
                                ) : (
                                  <>
                                    <TouchableOpacity
                                      onPress={() => handleOpenBook(book)}
                                      style={styles.wideBookPrimaryButton}
                                    >
                                      <Ionicons
                                        name="book-outline"
                                        size={16}
                                        color="#ffffff"
                                      />
                                      <Text
                                        style={styles.wideBookPrimaryButtonText}
                                      >
                                        Read now
                                      </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => openTipModal(book)}
                                      disabled={tipProcessing[book._id]}
                                      style={styles.wideBookSecondaryButton}
                                    >
                                      <Ionicons
                                        name="gift-outline"
                                        size={16}
                                        color="#f59e0b"
                                      />
                                      <Text
                                        style={
                                          styles.wideBookSecondaryButtonText
                                        }
                                      >
                                        Tip
                                      </Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {renderPagination(
                    discoverPage,
                    discoverTotalPages,
                    handleDiscoverPageChange
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Library Tab */}
        {activeTab === "library" && (
          <View style={styles.collectionCard}>
            <View style={styles.collectionHeader}>
              <Text style={styles.collectionTitle}>📚 My Library</Text>
              <Text style={styles.collectionCount}>
                {libraryState.meta.total || libraryState.items.length} titles
              </Text>
            </View>

            {libraryState.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>
                  Fetching your bookshelf...
                </Text>
              </View>
            ) : libraryState.error ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.errorText}>{libraryState.error}</Text>
              </View>
            ) : libraryState.items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Your library is empty. Discover a new title to get started!
                </Text>
              </View>
            ) : (
              <>
                {libraryState.items.map((entry) => {
                  const book = entry.book;
                  const cover = resolveCoverUrl(book);
                  const progress = entry.progress || 0;
                  const lastRead = entry.lastReadAt || entry.updatedAt;

                  return (
                    <View key={entry.id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        <View style={styles.listItemCover}>
                          {cover ? (
                            <Image
                              source={{ uri: cover }}
                              style={styles.listItemCoverImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.listItemCoverPlaceholder}>
                              <Text style={styles.listItemCoverPlaceholderText}>
                                {book.title?.charAt(0) || "B"}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.listItemContent}>
                          <Text style={styles.listItemTitle} numberOfLines={2}>
                            {book.title}
                          </Text>
                          <Text style={styles.listItemAuthor}>
                            {resolveAuthorName(book)}
                          </Text>
                          {lastRead && (
                            <Text style={styles.listItemTimestamp}>
                              Last read: {formatRelativeTime(lastRead)}
                            </Text>
                          )}
                          <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                              <Text style={styles.progressLabel}>Progress</Text>
                              <Text style={styles.progressLabel}>
                                {progress}%
                              </Text>
                            </View>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  { width: `${progress}%` },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.listItemActions}>
                        <TouchableOpacity
                          onPress={() => handleOpenBook(book)}
                          style={styles.listItemActionButton}
                        >
                          <Text style={styles.listItemActionButtonText}>
                            {progress >= 100
                              ? "Revisit"
                              : progress > 0
                              ? "Continue reading"
                              : "Start reading"}
                          </Text>
                        </TouchableOpacity>
                        {Number(book.price || 0) > 0 && (
                          <TouchableOpacity
                            onPress={() => openRentModal(book)}
                            disabled={rentProcessing[book._id]}
                            style={styles.listItemActionSecondaryButton}
                          >
                            <Ionicons
                              name="cash-outline"
                              size={16}
                              color="#16a34a"
                            />
                            <Text
                              style={styles.listItemActionSecondaryButtonText}
                            >
                              Rent
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => openTipModal(book)}
                          disabled={tipProcessing[book._id]}
                          style={styles.listItemActionSecondaryButton}
                        >
                          <Ionicons
                            name="gift-outline"
                            size={16}
                            color="#f59e0b"
                          />
                          <Text
                            style={styles.listItemActionSecondaryButtonText}
                          >
                            Tip
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveFromLibrary(entry)}
                          style={styles.listItemActionIconButton}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#f43f5e"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {renderPagination(
                  libraryState.meta.page || 1,
                  libraryState.meta.totalPages || 0,
                  (direction) =>
                    handleCollectionPageChange("library", direction)
                )}
              </>
            )}
          </View>
        )}

        {/* Currently Reading Tab */}
        {activeTab === "reading" && (
          <View style={styles.collectionCard}>
            <Text style={styles.collectionTitle}>📖 Currently Reading</Text>

            {readingState.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>
                  Gathering your in-progress titles...
                </Text>
              </View>
            ) : readingState.error ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.errorText}>{readingState.error}</Text>
              </View>
            ) : readingState.items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book" size={64} color="#93c5fd" />
                <Text style={styles.emptyText}>
                  Nothing in progress right now.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab("discover")}
                  style={styles.emptyActionButton}
                >
                  <Text style={styles.emptyActionButtonText}>
                    Discover new books
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {readingState.items.map((entry) => {
                  const book = entry.book;
                  const progress = entry.progress || 0;
                  const cover = resolveCoverUrl(book);
                  const lastRead = entry.lastReadAt || entry.updatedAt;

                  return (
                    <View key={entry.id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        <View style={styles.listItemCover}>
                          {cover ? (
                            <Image
                              source={{ uri: cover }}
                              style={styles.listItemCoverImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.listItemCoverPlaceholder}>
                              <Text style={styles.listItemCoverPlaceholderText}>
                                {book.title?.charAt(0) || "B"}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.listItemContent}>
                          <Text style={styles.listItemTitle} numberOfLines={2}>
                            {book.title}
                          </Text>
                          <Text style={styles.listItemAuthor}>
                            {resolveAuthorName(book)}
                          </Text>
                          {lastRead && (
                            <Text style={styles.listItemTimestamp}>
                              Last read: {formatRelativeTime(lastRead)}
                            </Text>
                          )}
                          <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                              <Text style={styles.progressLabel}>Progress</Text>
                              <Text style={styles.progressLabel}>
                                {progress}%
                              </Text>
                            </View>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  { width: `${progress}%` },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleOpenBook(book)}
                        style={styles.listItemActionButton}
                      >
                        <Text style={styles.listItemActionButtonText}>
                          {progress >= 100 ? "Review" : "Continue reading"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {renderPagination(
                  readingState.meta.page || 1,
                  readingState.meta.totalPages || 0,
                  (direction) =>
                    handleCollectionPageChange("reading", direction)
                )}
              </>
            )}
          </View>
        )}

        {/* Wishlist Tab */}
        {activeTab === "wishlist" && (
          <View style={styles.collectionCard}>
            <Text style={styles.collectionTitle}>💖 Wishlist</Text>

            {wishlistState.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading your wishlist...</Text>
              </View>
            ) : wishlistState.error ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.errorText}>{wishlistState.error}</Text>
              </View>
            ) : wishlistState.items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart" size={64} color="#fda4af" />
                <Text style={styles.emptyText}>
                  You haven't added anything to your wishlist yet.
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab("discover")}
                  style={styles.emptyActionButton}
                >
                  <Text style={styles.emptyActionButtonText}>
                    Browse titles
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {wishlistState.items.map((entry) => {
                  const book = entry.book;
                  const cover = resolveCoverUrl(book);

                  return (
                    <View key={entry.id} style={styles.listItemCard}>
                      <View style={styles.listItemRow}>
                        <View style={styles.listItemCover}>
                          {cover ? (
                            <Image
                              source={{ uri: cover }}
                              style={styles.listItemCoverImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.listItemCoverPlaceholder}>
                              <Text style={styles.listItemCoverPlaceholderText}>
                                {book.title?.charAt(0) || "B"}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.listItemContent}>
                          <Text style={styles.listItemTitle} numberOfLines={2}>
                            {book.title}
                          </Text>
                          <Text style={styles.listItemAuthor}>
                            {resolveAuthorName(book)}
                          </Text>
                          <Text style={styles.listItemPrice}>
                            {formatCurrencyINR(book.price)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.listItemActions}>
                        <TouchableOpacity
                          onPress={() => handleStartWishlistBook(entry)}
                          style={styles.listItemActionButton}
                        >
                          <Text style={styles.listItemActionButtonText}>
                            Start reading
                          </Text>
                        </TouchableOpacity>
                        {Number(book.price || 0) > 0 && (
                          <TouchableOpacity
                            onPress={() => openRentModal(book)}
                            disabled={rentProcessing[book._id]}
                            style={styles.listItemActionSecondaryButton}
                          >
                            <Ionicons
                              name="cash-outline"
                              size={16}
                              color="#16a34a"
                            />
                            <Text
                              style={styles.listItemActionSecondaryButtonText}
                            >
                              Rent
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => openTipModal(book)}
                          disabled={tipProcessing[book._id]}
                          style={styles.listItemActionSecondaryButton}
                        >
                          <Ionicons
                            name="gift-outline"
                            size={16}
                            color="#f59e0b"
                          />
                          <Text
                            style={styles.listItemActionSecondaryButtonText}
                          >
                            Tip
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleWishlistToggle(book)}
                          style={styles.listItemActionIconButton}
                        >
                          <Ionicons name="heart" size={20} color="#f43f5e" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {renderPagination(
                  wishlistState.meta.page || 1,
                  wishlistState.meta.totalPages || 0,
                  (direction) =>
                    handleCollectionPageChange("wishlist", direction)
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* FlipBook Viewer */}
      {flipBookViewer.visible && flipBookViewer.book && (
        <FlipBookViewer
          visible={flipBookViewer.visible}
          onClose={handleCloseFlipBook}
          title={flipBookViewer.book.title}
          content={flipBookViewer.content}
          subtitle={`by ${resolveAuthorName(flipBookViewer.book)}`}
          category={flipBookViewer.book.genre}
        />
      )}

      {/* Rent Modal */}
      {rentModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={closeRentModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeRentModal}
              disabled={rentModal.submitting}
            />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Rent "{rentModal.book.title}"
              </Text>
              <Text style={styles.modalSubtitle}>
                Choose how long you'd like access. You can always extend later.
              </Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>RENTAL DURATION (DAYS)</Text>
                <View style={styles.modalInputRow}>
                  <TextInput
                    value={String(rentModal.days)}
                    onChangeText={(text) => {
                      const value = Math.max(
                        1,
                        Math.min(Number(text) || 1, 90)
                      );
                      setRentModal((prev) =>
                        prev ? { ...prev, days: value } : prev
                      );
                    }}
                    keyboardType="number-pad"
                    style={styles.modalInput}
                  />
                  {[7, 14, 30].map((days) => (
                    <TouchableOpacity
                      key={days}
                      onPress={() =>
                        setRentModal((prev) =>
                          prev ? { ...prev, days } : prev
                        )
                      }
                      style={[
                        styles.modalQuickButton,
                        rentModal.days === days &&
                          styles.modalQuickButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalQuickButtonText,
                          rentModal.days === days &&
                            styles.modalQuickButtonTextActive,
                        ]}
                      >
                        {days}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>CONTRIBUTION AMOUNT (₹)</Text>
                <View style={styles.modalInputRow}>
                  <TextInput
                    value={String(rentModal.amount)}
                    onChangeText={(text) => {
                      const value = Math.max(0, Number(text) || 0);
                      setRentModal((prev) =>
                        prev ? { ...prev, amount: value } : prev
                      );
                    }}
                    keyboardType="number-pad"
                    style={styles.modalInput}
                  />
                  {getSuggestedRentAmount(rentModal.book) > 0 && (
                    <Text style={styles.modalHint}>
                      Suggested: ₹{getSuggestedRentAmount(rentModal.book)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={closeRentModal}
                  disabled={rentModal.submitting}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRentConfirm}
                  disabled={rentModal.submitting}
                  style={styles.modalConfirmButton}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    {rentModal.submitting ? "Processing..." : "Confirm rental"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Tip Modal */}
      {tipModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={closeTipModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeTipModal}
              disabled={tipModal.submitting}
            />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Tip the author</Text>
              <Text style={styles.modalSubtitle}>
                Show appreciation to {resolveAuthorName(tipModal.book)} with a
                quick tip.
              </Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>TIP AMOUNT (₹)</Text>
                <View style={styles.modalInputRow}>
                  <TextInput
                    value={String(tipModal.amount)}
                    onChangeText={(text) => {
                      const value = Math.max(0, Number(text) || 0);
                      setTipModal((prev) =>
                        prev ? { ...prev, amount: value } : prev
                      );
                    }}
                    keyboardType="number-pad"
                    style={styles.modalInput}
                  />
                  {[25, 50, 100].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      onPress={() =>
                        setTipModal((prev) =>
                          prev ? { ...prev, amount } : prev
                        )
                      }
                      style={[
                        styles.modalQuickButton,
                        tipModal.amount === amount &&
                          styles.modalQuickButtonActiveAmber,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalQuickButtonText,
                          tipModal.amount === amount &&
                            styles.modalQuickButtonTextActive,
                        ]}
                      >
                        ₹{amount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>MESSAGE (OPTIONAL)</Text>
                <TextInput
                  value={tipModal.note}
                  onChangeText={(text) =>
                    setTipModal((prev) =>
                      prev ? { ...prev, note: text.slice(0, 140) } : prev
                    )
                  }
                  placeholder="Share a quick note of encouragement."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  style={styles.modalTextArea}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={closeTipModal}
                  disabled={tipModal.submitting}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleTipConfirm}
                  disabled={tipModal.submitting}
                  style={styles.modalConfirmButtonAmber}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    {tipModal.submitting ? "Sending..." : "Send tip"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 90,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 16,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginLeft: 12,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.primary,
      lineHeight: 20,
    },
    tabsContainer: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    tabsRow: {
      flexDirection: "row",
      gap: 8,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: "transparent",
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    tabTextActive: {
      color: theme.colors.onPrimary,
    },
    filtersCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    filterSection: {
      marginBottom: 16,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    searchInput: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInputText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    filterChipTextActive: {
      color: theme.colors.onPrimary,
    },
    // Navbar Wrapper
    navbarWrapper: {
      position: "absolute" as "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: "transparent",
      paddingTop: 35,
      paddingBottom: 12,
      paddingHorizontal: 0,
    },
    // New Compact Filter Layout
    filtersRow: {
      flexDirection: "row",
      gap: 12,
    },
    filterHalf: {
      flex: 1,
    },
    pickerContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    picker: {
      height: 50,
      color: theme.colors.textPrimary,
    },
    booksCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    loadingContainer: {
      paddingVertical: 64,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: "#3b82f6",
    },
    emptyContainer: {
      paddingVertical: 64,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 14,
      color: "#3b82f6",
      textAlign: "center",
    },
    errorText: {
      fontSize: 14,
      color: "#ef4444",
      textAlign: "center",
    },
    emptyActionButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: "#2563eb",
      borderRadius: 12,
    },
    emptyActionButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#ffffff",
    },
    // Wide Book Card Layout (One Column)
    booksList: {
      gap: 16,
    },
    wideBookCard: {
      backgroundColor: "#ffffff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#dbeafe",
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    wideBookRow: {
      flexDirection: "row",
      gap: 16,
    },
    wideBookCover: {
      width: 100,
      height: 150,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: "#eff6ff",
      borderWidth: 1,
      borderColor: "#dbeafe",
    },
    wideBookCoverImage: {
      width: "100%",
      height: "100%",
    },
    wideBookCoverPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    wideBookCoverPlaceholderText: {
      fontSize: 40,
      fontWeight: "600",
      color: "#2563eb",
    },
    wideBookContent: {
      flex: 1,
      gap: 12,
    },
    wideBookHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    wideBookTitleSection: {
      flex: 1,
      marginRight: 12,
    },
    wideBookTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1e3a8a",
      marginBottom: 4,
      lineHeight: 22,
    },
    wideBookAuthor: {
      fontSize: 13,
      color: "#2563eb",
    },
    wideBookWishlistButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: "#eff6ff",
      borderWidth: 1,
      borderColor: "#dbeafe",
    },
    wideBookWishlistButtonActive: {
      backgroundColor: "#fef2f2",
      borderColor: "#fecdd3",
    },
    wideBookMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    wideBookRating: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    wideBookRatingText: {
      fontSize: 13,
      color: "#2563eb",
    },
    wideBookPrice: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1e3a8a",
    },
    wideBookActions: {
      flexDirection: "row",
      gap: 8,
    },
    wideBookPrimaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "#2563eb",
      paddingVertical: 12,
      borderRadius: 12,
    },
    wideBookPrimaryButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#ffffff",
    },
    wideBookSecondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#dbeafe",
      backgroundColor: "#f9fafb",
    },
    wideBookSecondaryButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#64748b",
    },
    // Old Grid Styles (keeping for backward compatibility)
    booksGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -8,
    },
    bookCard: {
      width: CARD_WIDTH,
      marginHorizontal: 8,
      marginBottom: 16,
      backgroundColor: "#eff6ff",
      borderWidth: 1,
      borderColor: "#dbeafe",
      borderRadius: 16,
      overflow: "hidden",
    },
    bookCover: {
      height: 160,
      backgroundColor: "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor: "#dbeafe",
      alignItems: "center",
      justifyContent: "center",
    },
    bookCoverImage: {
      width: "100%",
      height: "100%",
    },
    bookCoverPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    bookCoverPlaceholderText: {
      fontSize: 48,
      fontWeight: "600",
      color: "#2563eb",
    },
    bookContent: {
      padding: 12,
    },
    bookTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1e3a8a",
      marginBottom: 4,
    },
    bookAuthor: {
      fontSize: 12,
      color: "#2563eb",
      marginBottom: 8,
    },
    bookRating: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    bookRatingText: {
      marginLeft: 4,
      fontSize: 12,
      color: "#2563eb",
    },
    bookPrice: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1e3a8a",
      marginBottom: 8,
    },
    bookActions: {
      flexDirection: "row",
      gap: 8,
    },
    bookActionIconButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: "#ffffff",
    },
    bookActionIconButtonActive: {
      backgroundColor: "#fef2f2",
    },
    bookActionButton: {
      flex: 1,
      backgroundColor: "#2563eb",
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    bookActionButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#ffffff",
    },
    bookSecondaryActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    bookSecondaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#dbeafe",
      backgroundColor: "#f9fafb",
    },
    bookSecondaryButtonText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#64748b",
    },
    pagination: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 16,
      paddingHorizontal: 16,
    },
    paginationButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#dbeafe",
      borderRadius: 8,
      gap: 8,
    },
    paginationButtonDisabled: {
      opacity: 0.5,
    },
    paginationButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#2563eb",
    },
    paginationButtonTextDisabled: {
      color: "#93c5fd",
    },
    paginationText: {
      fontSize: 13,
      color: "#2563eb",
    },
    collectionCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: "#ffffff",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    collectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    collectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1e3a8a",
    },
    collectionCount: {
      fontSize: 13,
      color: "#2563eb",
    },
    listItemCard: {
      marginBottom: 16,
      padding: 16,
      backgroundColor: "#eff6ff",
      borderWidth: 1,
      borderColor: "#dbeafe",
      borderRadius: 12,
    },
    listItemRow: {
      flexDirection: "row",
      marginBottom: 12,
    },
    listItemCover: {
      width: 64,
      height: 96,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#dbeafe",
      backgroundColor: "#ffffff",
    },
    listItemCoverImage: {
      width: "100%",
      height: "100%",
    },
    listItemCoverPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    listItemCoverPlaceholderText: {
      fontSize: 24,
      fontWeight: "600",
      color: "#2563eb",
    },
    listItemContent: {
      flex: 1,
      marginLeft: 16,
    },
    listItemTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#1e3a8a",
      marginBottom: 4,
    },
    listItemAuthor: {
      fontSize: 13,
      color: "#2563eb",
      marginBottom: 4,
    },
    listItemTimestamp: {
      fontSize: 11,
      color: "#64748b",
      marginBottom: 8,
    },
    listItemPrice: {
      fontSize: 14,
      fontWeight: "700",
      color: "#1e3a8a",
    },
    progressContainer: {
      marginBottom: 8,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    progressLabel: {
      fontSize: 11,
      color: "#2563eb",
    },
    progressBar: {
      height: 8,
      backgroundColor: "#dbeafe",
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: "#2563eb",
    },
    listItemActions: {
      flexDirection: "row",
      gap: 8,
    },
    listItemActionButton: {
      flex: 1,
      backgroundColor: "#2563eb",
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    listItemActionButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#ffffff",
    },
    listItemActionIconButton: {
      padding: 10,
      backgroundColor: "#fef2f2",
      borderRadius: 8,
    },
    listItemActionSecondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#dbeafe",
      backgroundColor: "#f9fafb",
    },
    listItemActionSecondaryButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#64748b",
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalContent: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: "#ffffff",
      borderRadius: 16,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1e3a8a",
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 13,
      color: "#2563eb",
      marginBottom: 20,
      lineHeight: 18,
    },
    modalSection: {
      marginBottom: 16,
    },
    modalLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "#1e3a8a",
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    modalInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    modalInput: {
      width: 80,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "#dbeafe",
      borderRadius: 8,
      fontSize: 14,
      color: "#111827",
      backgroundColor: "#f9fafb",
    },
    modalQuickButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "#eff6ff",
    },
    modalQuickButtonActive: {
      backgroundColor: "#2563eb",
    },
    modalQuickButtonActiveAmber: {
      backgroundColor: "#f59e0b",
    },
    modalQuickButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#2563eb",
    },
    modalQuickButtonTextActive: {
      color: "#ffffff",
    },
    modalHint: {
      fontSize: 11,
      color: "#2563eb",
    },
    modalTextArea: {
      padding: 12,
      borderWidth: 1,
      borderColor: "#dbeafe",
      borderRadius: 8,
      fontSize: 14,
      color: "#111827",
      backgroundColor: "#f9fafb",
      minHeight: 80,
      textAlignVertical: "top",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 8,
    },
    modalCancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    modalCancelButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#2563eb",
    },
    modalConfirmButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: "#2563eb",
      borderRadius: 8,
    },
    modalConfirmButtonAmber: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: "#f59e0b",
      borderRadius: 8,
    },
    modalConfirmButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#ffffff",
    },
  });
