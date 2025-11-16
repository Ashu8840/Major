import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { platformShadow } from "@/utils/shadow";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

interface MarketplaceBook {
  _id: string;
  title: string;
  description: string;
  genre: string;
  language: string;
  price: number;
  pages: number;
  tags: string[];
  status: string;
  coverImage: {
    url?: string;
    secureUrl?: string;
  };
  file: {
    url?: string;
    secureUrl?: string;
    downloadUrl?: string;
  };
  seller: {
    _id: string;
    storeName: string;
  };
  stats: {
    views: number;
    downloads: number;
    rating: number;
    reviews: number;
  };
  createdAt: string;
}

interface SellerInfo {
  _id: string;
  storeName: string;
  bio: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  isApproved: boolean;
}

interface Analytics {
  totalRevenue: number;
  totalSales: number;
  totalViews: number;
  totalDownloads: number;
  bookCount: number;
  recentActivity: Array<{
    type: string;
    book: { title: string };
    timestamp: string;
  }>;
  topBooks: MarketplaceBook[];
}

const GENRES = [
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

const PRICE_FILTERS = [
  { value: "all", label: "All prices" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "downloads", label: "Most downloaded" },
  { value: "price-low", label: "Price: Low to high" },
  { value: "price-high", label: "Price: High to low" },
];

const TABS = [
  { id: "browse", label: "Browse", icon: "storefront" },
  { id: "my-books", label: "My Books", icon: "book" },
  { id: "upload", label: "Upload", icon: "cloud-upload" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
];

const formatCurrency = (value: number): string => {
  const amount = Number(value || 0);
  const fractionDigits = amount % 1 === 0 ? 0 : 2;
  try {
    const formatted = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: fractionDigits,
    }).format(amount);
    return `₹${formatted}`;
  } catch {
    return `₹${amount.toFixed(fractionDigits)}`;
  }
};

const buildAssetUrl = (value: string | undefined): string => {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  // You'll need to replace this with your actual API host
  const API_HOST = "http://10.179.215.93:5000";
  return `${API_HOST}${value.startsWith("/") ? value : `/${value}`}`;
};

const resolveCoverUrl = (coverImage: any): string => {
  const raw = coverImage?.secureUrl || coverImage?.url;
  return raw ? buildAssetUrl(raw) : "";
};

export const MarketplaceScreen: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState("browse");

  // Browse state
  const [books, setBooks] = useState<MarketplaceBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  // Seller state
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [sellerStatus, setSellerStatus] = useState<
    "loading" | "registered" | "not-registered"
  >("loading");
  const [myBooks, setMyBooks] = useState<MarketplaceBook[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Registration state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    storeName: profile?.displayName || profile?.username || "",
    bio: "",
    contactEmail: profile?.email || "",
    contactPhone: "",
    website: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Upload state
  const [bookForm, setBookForm] = useState({
    title: "",
    description: "",
    genre: "fiction",
    language: "English",
    price: "",
    pages: "",
    tags: "",
  });
  const [coverFile, setCoverFile] = useState<any>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bookFile, setBookFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modals
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [selectedBook, setSelectedBook] = useState<MarketplaceBook | null>(
    null
  );
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookModalLoading, setBookModalLoading] = useState(false);

  // Check seller status
  const checkSellerStatus = useCallback(async () => {
    try {
      setSellerStatus("loading");
      const response = await api.get("/marketplace/seller/status");
      if (response.data.seller) {
        setSeller(response.data.seller);
        setSellerStatus("registered");
      } else {
        setSellerStatus("not-registered");
      }
    } catch (error: any) {
      console.error("Error checking seller status:", error);
      setSellerStatus("not-registered");
    }
  }, []);

  // Fetch books
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { sort: sortBy };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedGenre !== "all") params.genre = selectedGenre;
      if (priceFilter !== "all") params.price = priceFilter;

      console.log("[Marketplace] Fetching books with params:", params);
      const response = await api.get("/marketplace/books", { params });
      console.log(
        "[Marketplace] Response:",
        JSON.stringify(response.data, null, 2)
      );

      const booksData = response.data?.books || response.data || [];
      console.log("[Marketplace] Books count:", booksData.length);
      setBooks(booksData);
    } catch (error: any) {
      console.error("[Marketplace] Error fetching books:", error);
      console.error("[Marketplace] Error response:", error.response?.data);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load marketplace books"
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenre, priceFilter, sortBy]);

  // Fetch seller books
  const fetchSellerBooks = useCallback(async () => {
    if (sellerStatus !== "registered") return;
    try {
      console.log("[Marketplace] Fetching seller books...");
      const response = await api.get("/marketplace/seller/books");
      console.log(
        "[Marketplace] Seller books response:",
        JSON.stringify(response.data, null, 2)
      );

      const booksData = response.data?.books || response.data || [];
      console.log("[Marketplace] Seller books count:", booksData.length);
      setMyBooks(booksData);
    } catch (error: any) {
      console.error("[Marketplace] Error fetching seller books:", error);
      console.error("[Marketplace] Error response:", error.response?.data);
    }
  }, [sellerStatus]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (sellerStatus !== "registered") return;
    try {
      const response = await api.get("/marketplace/seller/analytics");
      setAnalytics(response.data);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
    }
  }, [sellerStatus]);

  useEffect(() => {
    if (profile) {
      checkSellerStatus();
    }
  }, [profile, checkSellerStatus]);

  useEffect(() => {
    if (activeTab === "browse") {
      fetchBooks();
    } else if (activeTab === "my-books") {
      fetchSellerBooks();
    } else if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab, fetchBooks, fetchSellerBooks, fetchAnalytics]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === "browse") {
      await fetchBooks();
    } else if (activeTab === "my-books") {
      await fetchSellerBooks();
    } else if (activeTab === "analytics") {
      await fetchAnalytics();
    }
    setRefreshing(false);
  }, [activeTab, fetchBooks, fetchSellerBooks, fetchAnalytics]);

  // Register as seller
  const handleRegisterSeller = async () => {
    if (!registrationForm.storeName.trim()) {
      Alert.alert("Error", "Store name is required");
      return;
    }
    if (!registrationForm.contactEmail.trim()) {
      Alert.alert("Error", "Contact email is required");
      return;
    }

    try {
      setIsRegistering(true);
      const response = await api.post(
        "/marketplace/seller/register",
        registrationForm
      );
      setSeller(response.data.seller);
      setSellerStatus("registered");
      setShowRegisterModal(false);
      Alert.alert("Success", "Registered as seller successfully!");
    } catch (error: any) {
      console.error("Error registering seller:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to register"
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // Pick cover image
  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverFile(result.assets[0]);
        setCoverPreview(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // Pick book file
  const pickBookFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setBookFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  // Upload book
  const handleUploadBook = async () => {
    if (!bookForm.title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }
    if (!bookForm.description.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }
    if (!coverFile) {
      Alert.alert("Error", "Cover image is required");
      return;
    }
    if (!bookFile) {
      Alert.alert("Error", "Book file is required");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("title", bookForm.title);
      formData.append("description", bookForm.description);
      formData.append("genre", bookForm.genre);
      formData.append("language", bookForm.language);
      formData.append("price", bookForm.price || "0");
      formData.append("pages", bookForm.pages || "0");
      formData.append("tags", bookForm.tags);
      formData.append("status", "published");

      // Append cover image
      formData.append("cover", {
        uri: coverFile.uri,
        type: coverFile.mimeType || "image/jpeg",
        name: coverFile.fileName || "cover.jpg",
      } as any);

      // Append book file
      formData.append("file", {
        uri: bookFile.uri,
        type: bookFile.mimeType || "application/pdf",
        name: bookFile.name || "book.pdf",
      } as any);

      await api.post("/marketplace/books", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Success", "Book uploaded successfully!");

      // Reset form
      setBookForm({
        title: "",
        description: "",
        genre: "fiction",
        language: "English",
        price: "",
        pages: "",
        tags: "",
      });
      setCoverFile(null);
      setCoverPreview(null);
      setBookFile(null);

      // Switch to my books tab
      setActiveTab("my-books");
    } catch (error: any) {
      console.error("Error uploading book:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to upload book"
      );
    } finally {
      setIsUploading(false);
    }
  };

  // View book details
  const handleViewBook = async (book: MarketplaceBook) => {
    setSelectedBook(book);
    setShowBookModal(true);

    // Record view
    try {
      await api.post(`/marketplace/books/${book._id}/view`);
    } catch (error) {
      console.error("Error recording view:", error);
    }
  };

  // Purchase/Download book
  const handlePurchaseBook = async (book: MarketplaceBook) => {
    setBookModalLoading(true);
    try {
      if (book.price > 0) {
        // Purchase flow
        await api.post(`/marketplace/books/${book._id}/purchase`);
        Alert.alert("Success", "Book purchased successfully!");
      }

      // Download
      await api.post(`/marketplace/books/${book._id}/download`);
      Alert.alert("Success", "Book download started!");

      setShowBookModal(false);
    } catch (error: any) {
      console.error("Error purchasing book:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to purchase book"
      );
    } finally {
      setBookModalLoading(false);
    }
  };

  // Delete book
  const handleDeleteBook = async (bookId: string) => {
    Alert.alert("Delete Book", "Are you sure you want to delete this book?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/marketplace/seller/books/${bookId}`);
            Alert.alert("Success", "Book deleted successfully");
            fetchSellerBooks();
          } catch (error: any) {
            console.error("Error deleting book:", error);
            Alert.alert("Error", "Failed to delete book");
          }
        },
      },
    ]);
  };

  // Check if seller tabs accessible
  const isSellerTab = useMemo(() => {
    return ["my-books", "upload", "analytics"].includes(activeTab);
  }, [activeTab]);

  const canAccessSellerTabs = useMemo(() => {
    return sellerStatus === "registered";
  }, [sellerStatus]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons
            name="storefront"
            size={64}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>
            Please log in to access Marketplace
          </Text>
        </View>
      </View>
    );
  }

  if (loading && books.length === 0 && activeTab === "browse") {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="storefront" size={32} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const isDisabled =
              ["my-books", "upload", "analytics"].includes(tab.id) &&
              !canAccessSellerTabs;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.tabActive,
                  isDisabled && styles.tabDisabled,
                ]}
                onPress={() => {
                  if (isDisabled) {
                    setShowRegisterModal(true);
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={
                    activeTab === tab.id
                      ? theme.colors.onPrimary
                      : isDisabled
                      ? theme.colors.textMuted
                      : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.tabTextActive,
                    isDisabled && styles.tabTextDisabled,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <View style={styles.content}>
          {/* Search and Filters */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search books..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={fetchBooks}
              />
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFiltersModal(true)}
            >
              <Ionicons name="options" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Books List */}
          <FlatList
            data={books}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.booksRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.bookCard}
                onPress={() => handleViewBook(item)}
              >
                <Image
                  source={{
                    uri:
                      resolveCoverUrl(item.coverImage) ||
                      "https://via.placeholder.com/150x200",
                  }}
                  style={styles.bookCover}
                />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {item.seller?.storeName || "Unknown"}
                  </Text>
                  <View style={styles.bookMeta}>
                    <View style={styles.bookRating}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.bookRatingText}>
                        {item.stats?.rating?.toFixed(1) || "0.0"}
                      </Text>
                    </View>
                    <Text style={styles.bookPrice}>
                      {item.price === 0 ? "Free" : formatCurrency(item.price)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="book-outline"
                  size={64}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.emptyStateText}>No books found</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            contentContainerStyle={styles.booksList}
          />
        </View>
      )}

      {/* My Books Tab */}
      {activeTab === "my-books" && canAccessSellerTabs && (
        <FlatList
          data={myBooks}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.sellerBookCard}>
              <Image
                source={{
                  uri:
                    resolveCoverUrl(item.coverImage) ||
                    "https://via.placeholder.com/80x100",
                }}
                style={styles.sellerBookCover}
              />
              <View style={styles.sellerBookInfo}>
                <Text style={styles.sellerBookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.sellerBookMeta}>
                  {item.stats?.views || 0} views · {item.stats?.downloads || 0}{" "}
                  downloads
                </Text>
                <Text style={styles.sellerBookPrice}>
                  {item.price === 0 ? "Free" : formatCurrency(item.price)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteBook(item._id)}
              >
                <Ionicons name="trash" size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="book-outline"
                size={64}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyStateText}>No books uploaded yet</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && canAccessSellerTabs && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.uploadContent, { paddingTop: 130 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Book Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={bookForm.title}
                onChangeText={(text) =>
                  setBookForm({ ...bookForm, title: text })
                }
                placeholder="Enter book title"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bookForm.description}
                onChangeText={(text) =>
                  setBookForm({ ...bookForm, description: text })
                }
                placeholder="Enter book description"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Genre *</Text>
                <TouchableOpacity
                  style={styles.pickerContainer}
                  onPress={() => setShowGenrePicker(true)}
                >
                  <Text style={styles.pickerText}>
                    {GENRES.find((g) => g.value === bookForm.genre)?.label ||
                      bookForm.genre}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Language</Text>
                <TextInput
                  style={styles.input}
                  value={bookForm.language}
                  onChangeText={(text) =>
                    setBookForm({ ...bookForm, language: text })
                  }
                  placeholder="Language"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={bookForm.price}
                  onChangeText={(text) =>
                    setBookForm({ ...bookForm, price: text })
                  }
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Pages</Text>
                <TextInput
                  style={styles.input}
                  value={bookForm.pages}
                  onChangeText={(text) =>
                    setBookForm({ ...bookForm, pages: text })
                  }
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={bookForm.tags}
                onChangeText={(text) =>
                  setBookForm({ ...bookForm, tags: text })
                }
                placeholder="e.g., thriller, suspense"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* Cover Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cover Image *</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickCoverImage}
              >
                <Ionicons name="image" size={24} color={theme.colors.primary} />
                <Text style={styles.uploadButtonText}>
                  {coverFile ? "Change Cover" : "Select Cover"}
                </Text>
              </TouchableOpacity>
              {coverPreview && (
                <Image
                  source={{ uri: coverPreview }}
                  style={styles.coverPreviewImage}
                />
              )}
            </View>

            {/* Book File */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Book File (PDF/EPUB) *</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickBookFile}
              >
                <Ionicons
                  name="document"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.uploadButtonText}>
                  {bookFile ? bookFile.name : "Select File"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Upload Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isUploading && styles.submitButtonDisabled,
              ]}
              onPress={handleUploadBook}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onPrimary}
                />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload"
                    size={20}
                    color={theme.colors.onPrimary}
                  />
                  <Text style={styles.submitButtonText}>Upload Book</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && canAccessSellerTabs && analytics && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.analyticsContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={32} color="#10B981" />
              <Text style={styles.statValue}>
                {formatCurrency(analytics.totalRevenue)}
              </Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cart" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{analytics.totalSales}</Text>
              <Text style={styles.statLabel}>Sales</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="eye" size={32} color="#8B5CF6" />
              <Text style={styles.statValue}>{analytics.totalViews}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="download" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{analytics.totalDownloads}</Text>
              <Text style={styles.statLabel}>Downloads</Text>
            </View>
          </View>

          {/* Recent Activity */}
          {analytics.recentActivity && analytics.recentActivity.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {analytics.recentActivity.map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                  <Ionicons
                    name="pulse"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityText}>
                      {activity.type} - {activity.book?.title}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Seller Registration Modal */}
      <Modal
        visible={showRegisterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Become a Seller</Text>
              <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Store Name *</Text>
                <TextInput
                  style={styles.input}
                  value={registrationForm.storeName}
                  onChangeText={(text) =>
                    setRegistrationForm({
                      ...registrationForm,
                      storeName: text,
                    })
                  }
                  placeholder="Your store name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={registrationForm.bio}
                  onChangeText={(text) =>
                    setRegistrationForm({ ...registrationForm, bio: text })
                  }
                  placeholder="Tell us about yourself"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Email *</Text>
                <TextInput
                  style={styles.input}
                  value={registrationForm.contactEmail}
                  onChangeText={(text) =>
                    setRegistrationForm({
                      ...registrationForm,
                      contactEmail: text,
                    })
                  }
                  placeholder="your@email.com"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.input}
                  value={registrationForm.contactPhone}
                  onChangeText={(text) =>
                    setRegistrationForm({
                      ...registrationForm,
                      contactPhone: text,
                    })
                  }
                  placeholder="+91 XXXXXXXXXX"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={registrationForm.website}
                  onChangeText={(text) =>
                    setRegistrationForm({ ...registrationForm, website: text })
                  }
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="url"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isRegistering && styles.submitButtonDisabled,
                ]}
                onPress={handleRegisterSeller}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.onPrimary}
                  />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Register as Seller
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Genre Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Genre</Text>
                {GENRES.map((genre) => (
                  <TouchableOpacity
                    key={genre.value}
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedGenre(genre.value);
                      setShowFiltersModal(false);
                      fetchBooks();
                    }}
                  >
                    <Text style={styles.filterOptionText}>{genre.label}</Text>
                    {selectedGenre === genre.value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Price</Text>
                {PRICE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={styles.filterOption}
                    onPress={() => {
                      setPriceFilter(filter.value);
                      setShowFiltersModal(false);
                      fetchBooks();
                    }}
                  >
                    <Text style={styles.filterOptionText}>{filter.label}</Text>
                    {priceFilter === filter.value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Sort By</Text>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.filterOption}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowFiltersModal(false);
                      fetchBooks();
                    }}
                  >
                    <Text style={styles.filterOptionText}>{option.label}</Text>
                    {sortBy === option.value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Genre Picker Modal */}
      <Modal
        visible={showGenrePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGenrePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Genre</Text>
              <TouchableOpacity onPress={() => setShowGenrePicker(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {GENRES.filter((g) => g.value !== "all").map((genre) => (
                <TouchableOpacity
                  key={genre.value}
                  style={styles.filterOption}
                  onPress={() => {
                    setBookForm({ ...bookForm, genre: genre.value });
                    setShowGenrePicker(false);
                  }}
                >
                  <Text style={styles.filterOptionText}>{genre.label}</Text>
                  {bookForm.genre === genre.value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Book Details Modal */}
      <Modal
        visible={showBookModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBookModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBook && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Book Details</Text>
                  <TouchableOpacity onPress={() => setShowBookModal(false)}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <Image
                    source={{
                      uri:
                        resolveCoverUrl(selectedBook.coverImage) ||
                        "https://via.placeholder.com/200x300",
                    }}
                    style={styles.bookModalCover}
                  />
                  <Text style={styles.bookModalTitle}>
                    {selectedBook.title}
                  </Text>
                  <Text style={styles.bookModalAuthor}>
                    by {selectedBook.seller?.storeName || "Unknown"}
                  </Text>
                  <Text style={styles.bookModalDescription}>
                    {selectedBook.description}
                  </Text>

                  <View style={styles.bookModalMeta}>
                    <View style={styles.bookModalMetaItem}>
                      <Ionicons name="star" size={20} color="#F59E0B" />
                      <Text style={styles.bookModalMetaText}>
                        {selectedBook.stats?.rating?.toFixed(1) || "0.0"}
                      </Text>
                    </View>
                    <View style={styles.bookModalMetaItem}>
                      <Ionicons
                        name="eye"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.bookModalMetaText}>
                        {selectedBook.stats?.views || 0} views
                      </Text>
                    </View>
                    <View style={styles.bookModalMetaItem}>
                      <Ionicons
                        name="download"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.bookModalMetaText}>
                        {selectedBook.stats?.downloads || 0} downloads
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.purchaseButton,
                      bookModalLoading && styles.purchaseButtonDisabled,
                    ]}
                    onPress={() => handlePurchaseBook(selectedBook)}
                    disabled={bookModalLoading}
                  >
                    {bookModalLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.onPrimary}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="download"
                          size={20}
                          color={theme.colors.onPrimary}
                        />
                        <Text style={styles.purchaseButtonText}>
                          {selectedBook.price === 0
                            ? "Download Free"
                            : `Purchase for ${formatCurrency(
                                selectedBook.price
                              )}`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
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
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      marginTop: 16,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.primary,
      marginTop: 16,
      fontWeight: "600",
    },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      paddingTop: 130,
      backgroundColor: theme.colors.background,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    tabsContainer: {
      flexDirection: "row",
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 8,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    tabDisabled: {
      opacity: 0.5,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    tabTextActive: {
      color: theme.colors.onPrimary,
    },
    tabTextDisabled: {
      color: theme.colors.textMuted,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 0,
    },
    searchSection: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    filterButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    booksList: {
      paddingBottom: 100,
    },
    booksRow: {
      justifyContent: "space-between",
      marginBottom: 16,
    },
    bookCard: {
      width: "48%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    bookCover: {
      width: "100%",
      height: 200,
      backgroundColor: theme.colors.border,
    },
    bookInfo: {
      padding: 12,
    },
    bookTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    bookAuthor: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: 8,
    },
    bookMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bookRating: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    bookRatingText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    bookPrice: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    listContent: {
      padding: 24,
      paddingTop: 0,
      paddingBottom: 100,
    },
    sellerBookCard: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    sellerBookCover: {
      width: 80,
      height: 100,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
    },
    sellerBookInfo: {
      flex: 1,
      marginLeft: 16,
      justifyContent: "center",
    },
    sellerBookTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    sellerBookMeta: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    sellerBookPrice: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    deleteButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: 8,
    },
    scrollView: {
      flex: 1,
    },
    uploadContent: {
      padding: 24,
      paddingBottom: 100,
    },
    uploadSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    inputRow: {
      flexDirection: "row",
      gap: 12,
    },
    flex1: {
      flex: 1,
    },
    pickerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: theme.colors.surface,
    },
    pickerText: {
      fontSize: 15,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    uploadButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    uploadButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    coverPreviewImage: {
      width: 150,
      height: 200,
      borderRadius: 12,
      marginTop: 12,
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      backgroundColor: "#3C4CC2",
      borderRadius: 12,
      marginTop: 8,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 8,
        elevation: 4,
      }),
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    analyticsContent: {
      padding: 24,
      paddingBottom: 100,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      width: "48%",
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E5E9FF",
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    statValue: {
      fontSize: 24,
      fontWeight: "700",
      color: "#1A224A",
      marginTop: 8,
    },
    statLabel: {
      fontSize: 14,
      color: "#6B739B",
      marginTop: 4,
    },
    section: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: "#E5E9FF",
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E9FF",
    },
    activityInfo: {
      flex: 1,
    },
    activityText: {
      fontSize: 14,
      color: "#1A224A",
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      marginTop: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    modalScroll: {
      padding: 20,
    },
    filterSection: {
      marginBottom: 24,
    },
    filterTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    filterOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      marginBottom: 8,
    },
    filterOptionText: {
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    bookModalCover: {
      width: "100%",
      height: 300,
      borderRadius: 16,
      backgroundColor: theme.colors.border,
      marginBottom: 16,
    },
    bookModalTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    bookModalAuthor: {
      fontSize: 16,
      color: theme.colors.textMuted,
      marginBottom: 16,
    },
    bookModalDescription: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 20,
    },
    bookModalMeta: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 20,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    bookModalMetaItem: {
      alignItems: "center",
      gap: 4,
    },
    bookModalMetaText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    purchaseButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 8,
        elevation: 4,
      }),
    },
    purchaseButtonDisabled: {
      opacity: 0.6,
    },
    purchaseButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
  });
