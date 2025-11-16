import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { Navbar } from "@/components/layout/Navbar";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import { platformShadow } from "@/utils/shadow";

const MOOD_OPTIONS = [
  "happy",
  "calm",
  "neutral",
  "grateful",
  "excited",
  "sad",
  "angry",
  "anxious",
  "tired",
  "confident",
];

export const NewEntryScreen: React.FC = () => {
  const { createEntry, updateEntry } = useDiaryEntries({ pageSize: 6 });
  const router = useRouter();
  const params = useLocalSearchParams();

  // Check if we're in edit mode
  const isEditMode = !!params.entryId;
  const entryId = params.entryId as string | undefined;

  const [title, setTitle] = useState((params.title as string) || "");
  const [mood, setMood] = useState<string | undefined>(
    (params.mood as string) || undefined
  );
  const [tagsInput, setTagsInput] = useState((params.tags as string) || "");
  const [content, setContent] = useState((params.content as string) || "");
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const disabled = useMemo(
    () => submitting || !title.trim() || !content.trim(),
    [content, submitting, title]
  );

  const formattedTags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }, [tagsInput]);

  const handleSubmit = useCallback(
    async (mode: "draft" | "publish") => {
      if (disabled && mode === "publish") return;
      setSubmitting(true);
      try {
        console.log("[handleSubmit] Submitting entry with image:", {
          hasImage: !!imageUri,
          imageUri: imageUri?.substring(0, 50) + "...",
          mode,
          isEditMode,
        });

        if (isEditMode && entryId) {
          // Update existing entry
          setStatus("saving");
          await updateEntry(entryId, {
            title: title.trim(),
            content: content.trim(),
            tags: formattedTags,
            mood,
            imageUri: imageUri || undefined,
          });
          Alert.alert("Success", "Entry updated successfully!");
        } else {
          // Create new entry
          await createEntry(
            {
              title: title.trim(),
              content: content.trim(),
              tags: formattedTags,
              mood,
              visibility: "private", // Always private
              isDraft: mode === "draft",
              imageUri,
            },
            (next) => setStatus(next)
          );
          Alert.alert(
            "Entry saved",
            mode === "draft"
              ? "Your draft is stored safely."
              : "Your entry is now live." +
                  (imageUri ? " Image uploaded successfully!" : "")
          );
        }

        setImageUri(null);
        setImageName(null);
        setTitle("");
        setContent("");
        setTagsInput("");
        setMood(undefined);
        router.replace("/(tabs)/diary");
      } catch (error) {
        console.error("Failed to submit entry", error);
        Alert.alert(
          "Unable to save",
          "Please check your connection and try again."
        );
      } finally {
        setStatus("idle");
        setSubmitting(false);
      }
    },
    [
      createEntry,
      updateEntry,
      formattedTags,
      mood,
      content,
      title,
      router,
      disabled,
      imageUri,
      isEditMode,
      entryId,
    ]
  );

  const requestLibraryPermission = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to attach an image."
      );
      return false;
    }
    return true;
  }, []);

  const handlePickImage = useCallback(async () => {
    const allowed = await requestLibraryPermission();
    if (!allowed) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      console.log("[ImagePicker] Selected image:", {
        uri: asset.uri,
        fileName: asset.fileName,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
      });
      setImageUri(asset.uri);
      const derivedName =
        asset.fileName ??
        asset.uri.split("/").pop() ??
        `entry-${Date.now()}.jpg`;
      setImageName(derivedName);
      Alert.alert("Image selected", "Image ready to upload with your entry!");
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  }, [requestLibraryPermission]);

  const handleRemoveImage = useCallback(() => {
    setImageUri(null);
    setImageName(null);
  }, []);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navbarWrapper}>
            <Navbar onAvatarPress={() => router.push("/(tabs)/profile")} />
          </View>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={18} color="#3142C6" />
              <Text style={styles.backButtonText}>Back to diary</Text>
            </TouchableOpacity>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isEditMode ? "Edit entry" : "New diary entry"}
              </Text>
              <Text style={styles.subtitle}>
                {isEditMode
                  ? "Update your reflections with mood, tags, and rich notes."
                  : "Capture today's reflections with mood, tags, and rich notes."}
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your entry a headline"
                placeholderTextColor="#8F96C7"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Mood</Text>
              <View style={styles.chipRow}>
                {MOOD_OPTIONS.map((option) => {
                  const active = option === mood;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setMood(active ? undefined : option)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Tags</Text>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. gratitude, progress, idea"
                placeholderTextColor="#8F96C7"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Notes</Text>
              <View style={styles.notepadShell}>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="Write freely..."
                  placeholderTextColor="#9AA2D5"
                  style={[styles.richInput, styles.richInputTall]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Attach image</Text>
              <View style={styles.mediaBlock}>
                <TouchableOpacity
                  style={styles.mediaPicker}
                  onPress={handlePickImage}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={22}
                    color="#4B5CD7"
                  />
                  <Text style={styles.mediaPickerText}>
                    {imageUri ? "Replace image" : "Upload image"}
                  </Text>
                </TouchableOpacity>
                {imageUri ? (
                  <View style={styles.mediaPreview}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.mediaInfo}>
                      <Ionicons
                        name="image-outline"
                        size={16}
                        color="#4B5CD7"
                      />
                      <Text style={styles.mediaName} numberOfLines={1}>
                        {imageName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={handleRemoveImage}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#E11D48"
                      />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>

            {status !== "idle" ? (
              <View style={styles.statusPill}>
                <Ionicons
                  name={
                    status === "uploading"
                      ? "cloud-upload-outline"
                      : "save-outline"
                  }
                  size={16}
                  color="#3142C6"
                />
                <Text style={styles.statusText}>
                  {status === "uploading"
                    ? "Uploading media…"
                    : "Saving entry…"}
                </Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.draftButton]}
                onPress={() => handleSubmit("draft")}
                disabled={submitting}
              >
                <Ionicons name="bookmark-outline" size={16} color="#3142C6" />
                <Text style={styles.draftText}>Save draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.publishButton,
                  disabled && styles.disabledButton,
                ]}
                onPress={() => handleSubmit("publish")}
                disabled={disabled}
              >
                <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.publishText}>Publish now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FE",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 48,
  },
  navbarWrapper: {
    marginTop: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E8ECFF",
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3142C6",
  },
  header: {
    marginBottom: 24,
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A224A",
  },
  subtitle: {
    fontSize: 15,
    color: "#5F6DAF",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E7FF",
    gap: 24,
    ...platformShadow({
      offsetY: 12,
      opacity: 0.08,
      radius: 22,
      elevation: 6,
      webFallback: "0px 12px 28px rgba(26, 34, 74, 0.08)",
    }),
  },
  fieldBlock: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B2554",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9DFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A224A",
    backgroundColor: "#F9FAFF",
  },
  richInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A224A",
    lineHeight: 22,
  },
  richInputTall: {
    height: 220,
  },
  notepadShell: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D3DAFF",
    backgroundColor: "#FBFCFF",
    padding: 18,
    ...platformShadow({
      offsetY: 10,
      opacity: 0.06,
      radius: 18,
      elevation: 4,
      webFallback: "0px 10px 22px rgba(26, 34, 74, 0.05)",
    }),
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E8ECFF",
  },
  chipActive: {
    backgroundColor: "#3142C6",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3142C6",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  mediaBlock: {
    gap: 14,
  },
  mediaPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9DFFF",
    backgroundColor: "#F3F5FF",
  },
  mediaPickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  mediaPreview: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCE1FF",
    backgroundColor: "#F6F7FF",
    padding: 12,
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    marginBottom: 4,
  },
  mediaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#3E4671",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFE8EE",
  },
  removeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E11D48",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
  },
  draftButton: {
    backgroundColor: "#EEF1FF",
  },
  publishButton: {
    backgroundColor: "#3142C6",
    ...platformShadow({
      offsetY: 12,
      opacity: 0.16,
      radius: 24,
      elevation: 7,
      webFallback: "0px 12px 26px rgba(49, 66, 198, 0.25)",
    }),
  },
  disabledButton: {
    opacity: 0.5,
  },
  draftText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3142C6",
  },
  publishText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E9EDFF",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3142C6",
  },
});
