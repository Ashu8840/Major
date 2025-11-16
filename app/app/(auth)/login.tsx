import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 28,
    gap: 24,
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
    color: "#A83A43",
  },
});

export default function LoginScreen() {
  const { login, isAuthenticated, initializing } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      console.error("Login failed", err);
      const message =
        err?.response?.data?.message ||
        "Unable to sign in. Check your credentials and try again.";
      setError(message);
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, login]);

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
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled
      >
        <View style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>Major</Text>
          </View>
          <View>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              Continue your writing journey on mobile with the same tools you
              love on the web.
            </Text>
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
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || !email || !password) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !email || !password}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in…" : "Continue"}
            </Text>
          </TouchableOpacity>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.ctaLink}>Sign up now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
