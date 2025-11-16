import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/layout/Navbar";
import { useRouter } from "expo-router";
import axios from "axios";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

const API_URL = "http://10.179.215.93:5000/api";

const categories = [
  { value: "general", label: "General question" },
  { value: "technical", label: "Technical issue" },
  { value: "billing", label: "Billing & plans" },
  { value: "feedback", label: "Product feedback" },
  { value: "other", label: "Something else" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const statusStyles: Record<string, any> = {
  open: { bg: "#dbeafe", text: "#1e40af" },
  in_progress: { bg: "#fef3c7", text: "#92400e" },
  resolved: { bg: "#d1fae5", text: "#065f46" },
  closed: { bg: "#e5e7eb", text: "#374151" },
};

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

export default function ContactScreen() {
  const { user, token } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();

  const [form, setForm] = useState({
    subject: "",
    category: "general",
    priority: "normal",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadTickets = useCallback(async () => {
    if (!token) return;

    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/support/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data?.tickets || []);
    } catch (error) {
      console.error("Failed to load support history", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = async () => {
    if (!form.subject.trim()) {
      Alert.alert("Error", "Please add a subject for your request.");
      return;
    }

    if (!form.message.trim()) {
      Alert.alert(
        "Error",
        "Let us know how we can help you by adding a message."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/support`,
        {
          subject: form.subject.trim(),
          message: form.message.trim(),
          category: form.category,
          priority: form.priority,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert("Success", "Thanks! Our team will get back to you soon.");
      setTickets([response.data.ticket, ...tickets]);
      setForm({
        subject: "",
        category: form.category,
        priority: "normal",
        message: "",
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "We couldn't send your message. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (value: string) => {
    if (!value) return "";
    try {
      return (
        new Date(value).toLocaleDateString("en-IN", {
          dateStyle: "medium",
        }) +
        " " +
        new Date(value).toLocaleTimeString("en-IN", {
          timeStyle: "short",
        })
      );
    } catch (error) {
      return value;
    }
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/more")} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 130 }]}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
            <Text style={styles.badgeText}>Dedicated Support</Text>
          </View>
          <Text style={styles.heroTitle}>
            We're here to help you keep writing
          </Text>
          <Text style={styles.heroSubtitle}>
            Reach out with questions, report issues, or share feedback. Our team
            typically responds within 24 hours on weekdays.
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Support Hours</Text>
              <View style={styles.infoValue}>
                <Ionicons name="time-outline" size={16} color="#ffffff" />
                <Text style={styles.infoValueText}>
                  Mon – Fri · 9:00 – 19:00 IST
                </Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Response time</Text>
              <View style={styles.infoValue}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.infoValueText}>Under 24 hours</Text>
              </View>
            </View>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color="#ffffff" />
              <View>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>support@major-app.com</Text>
              </View>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="chatbubbles-outline" size={20} color="#ffffff" />
              <View>
                <Text style={styles.contactLabel}>Community</Text>
                <Text style={styles.contactValue}>
                  Join #help-desk inside Community
                </Text>
              </View>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color="#ffffff" />
              <View>
                <Text style={styles.contactLabel}>Phone (priority)</Text>
                <Text style={styles.contactValue}>+91-80471-12345</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Send us a message</Text>
          <Text style={styles.formSubtitle}>
            Fill in the form and our support specialists will follow up by
            email.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={form.subject}
              onChangeText={(text) => setForm({ ...form, subject: text })}
              placeholder="Brief summary of your request"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.pickerOption,
                      form.category === cat.value && styles.pickerOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, category: cat.value })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.category === cat.value &&
                          styles.pickerOptionTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.pickerContainer}>
                {priorities.map((pri) => (
                  <TouchableOpacity
                    key={pri.value}
                    style={[
                      styles.pickerOption,
                      form.priority === pri.value && styles.pickerOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, priority: pri.value })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.priority === pri.value &&
                          styles.pickerOptionTextActive,
                      ]}
                    >
                      {pri.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textArea}
              value={form.message}
              onChangeText={(text) => setForm({ ...form, message: text })}
              placeholder="Describe the issue, steps to reproduce, or share your feedback."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formActions}>
            <View style={styles.warningRow}>
              <Ionicons name="warning-outline" size={14} color="#6b7280" />
              <Text style={styles.warningText}>
                Please avoid sharing sensitive personal information.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Ionicons name="send" size={16} color="#ffffff" />
              <Text style={styles.submitButtonText}>
                {submitting ? "Sending..." : "Submit request"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sidebar Info */}
        <View style={styles.sidebarCard}>
          <Text style={styles.sidebarTitle}>Why creators love our support</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#10b981"
              />
              <Text style={styles.featureText}>
                Real humans who understand writers and creators
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#10b981"
              />
              <Text style={styles.featureText}>
                Detailed follow-ups with actionable next steps
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#10b981"
              />
              <Text style={styles.featureText}>
                Priority escalation for outages or billing concerns
              </Text>
            </View>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Your recent requests</Text>
          <Text style={styles.historySubtitle}>
            Track the status of every message you've sent our way.
          </Text>

          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>
                Loading your support history…
              </Text>
            </View>
          ) : tickets.length > 0 ? (
            <View style={styles.ticketsList}>
              {tickets.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                      <Text style={styles.ticketDate}>
                        {formatDateTime(ticket.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.ticketBadges}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              statusStyles[ticket.status]?.bg ||
                              statusStyles.open.bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                statusStyles[ticket.status]?.text ||
                                statusStyles.open.text,
                            },
                          ]}
                        >
                          {ticket.status.replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {ticket.message && (
                    <Text style={styles.ticketMessage} numberOfLines={3}>
                      {ticket.message}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No support requests yet. Reach out using the form above and
                we'll be in touch soon.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 90,
      gap: 20,
    },
    heroCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 16,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.onPrimary,
      marginBottom: 12,
      lineHeight: 32,
    },
    heroSubtitle: {
      fontSize: 14,
      color: theme.colors.onPrimary,
      marginBottom: 16,
      lineHeight: 20,
      opacity: 0.9,
    },
    infoRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    infoCard: {
      flex: 1,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: 12,
      padding: 12,
    },
    infoLabel: {
      fontSize: 11,
      color: theme.colors.onPrimary,
      marginBottom: 6,
      opacity: 0.8,
    },
    infoValue: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    infoValueText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    contactInfo: {
      gap: 12,
    },
    contactItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    contactLabel: {
      fontSize: 10,
      color: theme.colors.onPrimary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      opacity: 0.8,
    },
    contactValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    formCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    formTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    formSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    formGroup: {
      marginBottom: 16,
    },
    formRow: {
      flexDirection: "row",
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    pickerContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    pickerOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pickerOptionActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pickerOptionText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    pickerOptionTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: "600",
    },
    textArea: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
      minHeight: 120,
    },
    formActions: {
      gap: 12,
    },
    warningRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    warningText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.primarySoft,
    },
    submitButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    sidebarCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sidebarTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    featureList: {
      gap: 12,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    featureText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    historyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    historyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    historySubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    ticketsList: {
      gap: 12,
    },
    ticketCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 16,
    },
    ticketHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    ticketSubject: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    ticketDate: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    ticketBadges: {
      gap: 6,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    ticketMessage: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    emptyState: {
      paddingVertical: 40,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 20,
    },
  });
