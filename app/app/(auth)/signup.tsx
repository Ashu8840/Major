import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAuth } from "@/context/AuthContext";
import { platformShadow } from "@/utils/shadow";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#20265A",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 28,
    gap: 20,
    ...platformShadow({
      offsetY: 16,
      opacity: 0.18,
      radius: 28,
      elevation: 12,
      webFallback: "0px 16px 36px rgba(13, 27, 94, 0.18)",
    }),
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#3142C6",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A224A",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A224A",
  },
  subtitle: {
    fontSize: 15,
    color: "#5F6DAF",
    lineHeight: 22,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B2554",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9DEFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1B2554",
    backgroundColor: "#FFFFFF",
  },
  button: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#3142C6",
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cta: {
    alignItems: "center",
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    color: "#5F6DAF",
  },
  ctaLink: {
    fontSize: 14,
    color: "#3142C6",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    color: "#E11D48",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
  },
  successText: {
    fontSize: 14,
    color: "#10B981",
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 12,
  },
});

export default function SignupScreen() {
  const { signup, isAuthenticated, initializing } = useAuth();
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    if (loading) return;

    // Validation
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signup({
        username: username.trim(),
        email: email.trim(),
        password,
      });
    } catch (err: any) {
      console.error("Signup failed", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to create account. Please try again.";
      setError(message);
      Alert.alert("Signup failed", message);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, loading, signup]);

  if (initializing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16 }}>
          Preparing your workspace…
        </Text>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    // Redirect new users to settings to complete profile
    return <Redirect href="/(tabs)/settings" />;
  }

  const isFormValid =
    username.trim().length >= 3 &&
    email.trim() &&
    password.length >= 6 &&
    password === confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.brandText}>Major</Text>
            </View>
            <View>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>
                Join Major to start your writing journey with powerful tools and
                a supportive community.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="johndoe"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.button,
                (!isFormValid || loading) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating account…" : "Sign up"}
              </Text>
            </TouchableOpacity>

            <View style={styles.cta}>
              <Text style={styles.ctaText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.ctaLink}>Sign in instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
