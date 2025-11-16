import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/layout/Navbar";
import { useRouter } from "expo-router";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  buttonText: string;
  popular: boolean;
  features: string[];
  disabled: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with your personal diary",
    buttonText: "Current Plan",
    popular: false,
    disabled: true,
    features: [
      "5 diary entries per month",
      "1 community post per day",
      "Basic chat with 3 contacts",
      "Basic AI writing assistance",
      "Public community access",
      "Standard templates",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "per month",
    description:
      "Advanced features for passionate writers and active community members",
    buttonText: "Upgrade to Pro",
    popular: true,
    disabled: false,
    features: [
      "Unlimited diary entries",
      "Unlimited community posts",
      "Chat with up to 50 contacts",
      "Advanced AI writing & mood analysis",
      "Priority community features",
      "Premium templates & themes",
      "Export diary to PDF",
      "Advanced analytics",
      "Cloud backup (10GB)",
      "Email support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$19",
    period: "per month",
    description:
      "Ultimate experience for content creators and community leaders",
    buttonText: "Upgrade to Premium",
    popular: false,
    disabled: false,
    features: [
      "Everything in Pro",
      "Unlimited chat contacts",
      "AI-powered content suggestions",
      "Custom community groups",
      "Advanced mood tracking & insights",
      "Collaboration features",
      "Custom templates designer",
      "Priority support",
      "Cloud backup (100GB)",
      "API access",
      "White-label options",
      "Advanced security",
    ],
  },
];

const premiumFeatures = [
  {
    icon: "book-outline",
    title: "Unlimited Entries",
    description: "Write as much as you want with no monthly limits",
  },
  {
    icon: "heart-outline",
    title: "Mood Analytics",
    description: "Track your emotional journey with AI insights",
  },
  {
    icon: "chatbubble-outline",
    title: "Enhanced Chat",
    description: "Connect with unlimited community members",
  },
  {
    icon: "cloud-outline",
    title: "Cloud Backup",
    description: "Never lose your precious memories and thoughts",
  },
];

export default function UpgradeScreen() {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const handleUpgrade = (planId: string) => {
    if (planId === "free") return;

    Alert.alert(
      "Upgrade Plan",
      `Ready to upgrade to ${planId === "pro" ? "Pro" : "Premium"}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue",
          onPress: () => {
            // Here you would integrate with payment processor
            Alert.alert(
              "Coming Soon",
              "Payment integration will be available soon!"
            );
            console.log(`Upgrading to ${planId} plan`);
          },
        },
      ]
    );
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upgrade Your Diary Experience</Text>
          <Text style={styles.headerSubtitle}>
            Choose the perfect plan to unlock premium features and enhance your
            personal journaling and community engagement
          </Text>
        </View>

        {/* Current Plan Info */}
        {user && (
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanContent}>
              <View>
                <Text style={styles.currentPlanLabel}>
                  You're currently on plan:
                </Text>
                <Text style={styles.currentPlanName}>Free</Text>
              </View>
              <View style={styles.currentPlanRight}>
                <Text style={styles.currentPlanUpgradeText}>
                  Upgrade to unlock premium features and unlimited access
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Pricing Cards */}
        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[styles.planCard, plan.popular && styles.planCardPopular]}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Ionicons name="star" size={14} color="#ffffff" />
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              {/* Plan Header */}
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>

              {/* Features List */}
              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={plan.popular ? "#3b82f6" : "#10b981"}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  plan.disabled
                    ? styles.upgradeButtonDisabled
                    : plan.popular
                    ? styles.upgradeButtonPopular
                    : styles.upgradeButtonRegular,
                ]}
                onPress={() => handleUpgrade(plan.id)}
                disabled={plan.disabled}
              >
                <Text
                  style={[
                    styles.upgradeButtonText,
                    plan.disabled && styles.upgradeButtonTextDisabled,
                  ]}
                >
                  {plan.buttonText}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Features Comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>What You Get With Premium</Text>

          <View style={styles.comparisonGrid}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.comparisonFeature}>
                <View style={styles.comparisonIconContainer}>
                  <Ionicons
                    name={feature.icon as any}
                    size={24}
                    color="#3b82f6"
                  />
                </View>
                <Text style={styles.comparisonFeatureTitle}>
                  {feature.title}
                </Text>
                <Text style={styles.comparisonFeatureDesc}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Questions? We're Here to Help</Text>
          <Text style={styles.faqSubtitle}>
            Contact our support team for any questions about upgrading your
            account
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push("/contact" as any)}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
    },
    header: {
      marginBottom: 24,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: 12,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    currentPlanCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 24,
    },
    currentPlanContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    currentPlanLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    currentPlanName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    currentPlanRight: {
      flex: 1,
      marginLeft: 16,
    },
    currentPlanUpgradeText: {
      fontSize: 12,
      color: theme.colors.primary,
      textAlign: "right",
    },
    plansContainer: {
      gap: 20,
      marginBottom: 32,
    },
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 2,
      borderColor: theme.colors.border,
      position: "relative",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    planCardPopular: {
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
    popularBadge: {
      position: "absolute",
      top: -12,
      alignSelf: "center",
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    popularBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    planHeader: {
      alignItems: "center",
      marginBottom: 20,
      paddingTop: 8,
    },
    planName: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    planDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 16,
      lineHeight: 18,
    },
    planPriceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
    },
    planPrice: {
      fontSize: 36,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    planPeriod: {
      fontSize: 14,
      color: theme.colors.primary,
    },
    featuresList: {
      gap: 12,
      marginBottom: 24,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    featureText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    upgradeButton: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    upgradeButtonDisabled: {
      backgroundColor: theme.colors.textMuted,
    },
    upgradeButtonPopular: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    upgradeButtonRegular: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    upgradeButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    upgradeButtonTextDisabled: {
      color: theme.colors.onPrimary,
    },
    comparisonCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 32,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    comparisonTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center",
      marginBottom: 24,
    },
    comparisonGrid: {
      gap: 24,
    },
    comparisonFeature: {
      alignItems: "center",
    },
    comparisonIconContainer: {
      width: 56,
      height: 56,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    comparisonFeatureTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 6,
      textAlign: "center",
    },
    comparisonFeatureDesc: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 16,
    },
    faqSection: {
      alignItems: "center",
      marginBottom: 32,
    },
    faqTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12,
      textAlign: "center",
    },
    faqSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 20,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    contactButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    contactButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
  });
