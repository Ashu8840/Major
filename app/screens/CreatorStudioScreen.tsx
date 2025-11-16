import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

import { Navbar } from "@/components/layout/Navbar";
import { FlipBookViewer } from "@/components/creator/FlipBookViewer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { platformShadow } from "@/utils/shadow";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

interface CreatorProject {
  _id: string;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  tags: string[];
  visibility: "private" | "public";
  status: "draft" | "published";
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "fiction", label: "Fiction" },
  { value: "non-fiction", label: "Non-Fiction" },
  { value: "poetry", label: "Poetry" },
  { value: "memoir", label: "Memoir" },
  { value: "essay", label: "Essay" },
];

const PANEL_TABS = [
  { id: "write", label: "Notebook", icon: "pencil" },
  { id: "ai", label: "AI Ideas", icon: "sparkles" },
  { id: "publish", label: "Publish", icon: "rocket" },
];

const AI_TOOLS = [
  { id: "grammar", label: "Fix Grammar", icon: "checkmark-circle" },
  { id: "improve", label: "Improve Writing", icon: "trending-up" },
  { id: "generate", label: "Generate Ideas", icon: "bulb" },
];

const LANGUAGES = [
  { code: "english", label: "English" },
  { code: "spanish", label: "Spanish" },
  { code: "french", label: "French" },
  { code: "german", label: "German" },
  { code: "italian", label: "Italian" },
  { code: "japanese", label: "Japanese" },
];

const formatDate = (value: string | undefined): string => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export const CreatorStudioScreen: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const [projects, setProjects] = useState<CreatorProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePanel, setActivePanel] = useState("write");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Editor state
  const [title, setTitle] = useState("Untitled manuscript");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english");

  // Modal state
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [flipBookOpen, setFlipBookOpen] = useState(false);
  const [flipBookProject, setFlipBookProject] = useState<CreatorProject | null>(
    null
  );

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [dirtySinceSave, setDirtySinceSave] = useState(false);

  const activeProject = useMemo(
    () => projects.find((p) => p._id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/creator/projects");
      setProjects(response.data);
      if (response.data.length > 0 && !currentProjectId) {
        const first = response.data[0];
        setCurrentProjectId(first._id);
        loadProjectData(first);
      }
    } catch (error: any) {
      console.error("Error loading projects:", error);
      Alert.alert("Error", "Couldn't load your studio projects");
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }, [loadProjects]);

  useEffect(() => {
    if (profile) {
      loadProjects();
    }
  }, [profile, loadProjects]);

  const loadProjectData = (project: CreatorProject) => {
    setTitle(project.title);
    setSubtitle(project.subtitle || "");
    setContent(project.content || "");
    setCategory(project.category || "general");
    setTags(project.tags || []);
    setVisibility(project.visibility || "private");
    setDirtySinceSave(false);
  };

  const handleCreateNew = async () => {
    try {
      const response = await api.post("/creator/projects", {
        title: "Untitled manuscript",
        content: "",
        category: "general",
        tags: [],
        visibility: "private",
        status: "draft",
      });
      setProjects((prev) => [response.data, ...prev]);
      setCurrentProjectId(response.data._id);
      loadProjectData(response.data);
      Alert.alert("Success", "New project created");
    } catch (error: any) {
      console.error("Error creating project:", error);
      Alert.alert("Error", "Couldn't create new project");
    }
  };

  const handleSave = async () => {
    if (!currentProjectId) return;

    try {
      setIsSaving(true);
      const payload = {
        title,
        subtitle,
        content,
        category,
        tags,
        visibility,
        status: "draft",
        wordCount,
      };
      const response = await api.put(
        `/creator/projects/${currentProjectId}`,
        payload
      );
      setProjects((prev) =>
        prev.map((p) => (p._id === currentProjectId ? response.data : p))
      );
      setDirtySinceSave(false);
      Alert.alert("Success", "Project saved");
    } catch (error: any) {
      console.error("Error saving project:", error);
      Alert.alert("Error", "Couldn't save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentProjectId) return;

    try {
      const payload = {
        title,
        subtitle,
        content,
        category,
        tags,
        visibility,
      };
      const response = await api.post(
        `/creator/projects/${currentProjectId}/publish`,
        payload
      );
      setProjects((prev) =>
        prev.map((p) => (p._id === currentProjectId ? response.data : p))
      );
      setPublishModalOpen(false);
      Alert.alert("Success", "Project published successfully!");
    } catch (error: any) {
      console.error("Error publishing project:", error);
      Alert.alert("Error", "Couldn't publish project");
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;

    try {
      await api.delete(`/creator/projects/${projectToDelete}`);
      setProjects((prev) => prev.filter((p) => p._id !== projectToDelete));
      if (currentProjectId === projectToDelete) {
        const remaining = projects.filter((p) => p._id !== projectToDelete);
        if (remaining.length > 0) {
          setCurrentProjectId(remaining[0]._id);
          loadProjectData(remaining[0]);
        } else {
          setCurrentProjectId(null);
          setTitle("Untitled manuscript");
          setSubtitle("");
          setContent("");
          setCategory("general");
          setTags([]);
          setVisibility("private");
        }
      }
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      Alert.alert("Success", "Project deleted");
    } catch (error: any) {
      console.error("Error deleting project:", error);
      Alert.alert("Error", "Couldn't delete project");
    }
  };

  const handleAITool = async (toolId: string) => {
    if (!content.trim()) {
      Alert.alert("Error", "Please write some content first");
      return;
    }

    try {
      setAiLoading(true);
      setAiResult("");
      let response;

      if (toolId === "grammar") {
        response = await api.post("/ai/fix-grammar", { text: content });
      } else if (toolId === "improve") {
        response = await api.post("/ai/improve", { text: content });
      } else if (toolId === "generate") {
        if (!aiPrompt.trim()) {
          Alert.alert("Error", "Please enter a prompt");
          return;
        }
        response = await api.post(
          `/creator/projects/${currentProjectId}/prompt`,
          {
            prompt: aiPrompt,
          }
        );
      }

      if (response) {
        setAiResult(response.data.result || response.data.text || "No result");
      }
    } catch (error: any) {
      console.error("Error with AI tool:", error);
      Alert.alert("Error", "AI tool failed. Try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Please write some content first");
      return;
    }

    try {
      setAiLoading(true);
      const response = await api.post("/ai/translate", {
        text: content,
        targetLanguage: selectedLanguage,
      });
      setAiResult(response.data.translation || "No translation");
    } catch (error: any) {
      console.error("Error translating:", error);
      Alert.alert("Error", "Translation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput("");
      setDirtySinceSave(true);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setDirtySinceSave(true);
  };

  const handleSelectProject = (project: CreatorProject) => {
    if (dirtySinceSave) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Save before switching?",
        [
          {
            text: "Discard",
            onPress: () => {
              setCurrentProjectId(project._id);
              loadProjectData(project);
              setProjectsModalOpen(false);
            },
          },
          {
            text: "Save & Switch",
            onPress: async () => {
              await handleSave();
              setCurrentProjectId(project._id);
              loadProjectData(project);
              setProjectsModalOpen(false);
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      setCurrentProjectId(project._id);
      loadProjectData(project);
      setProjectsModalOpen(false);
    }
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Please log in to access Creator Studio
          </Text>
        </View>
      </View>
    );
  }

  if (loading && projects.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3C4CC2" />
          <Text style={styles.loadingText}>Loading your projects…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Ionicons name="create" size={32} color="#3C4CC2" />
              <View>
                <Text style={styles.headerTitle}>Creator Studio</Text>
                <Text style={styles.headerSubtitle}>
                  {projects.length} project{projects.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setProjectsModalOpen(true)}
              >
                <Ionicons name="folder-open" size={24} color="#3C4CC2" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleCreateNew}
              >
                <Ionicons name="add-circle" size={24} color="#3C4CC2" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Panel Tabs */}
          <View style={styles.panelTabs}>
            {PANEL_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.panelTab,
                  activePanel === tab.id && styles.panelTabActive,
                ]}
                onPress={() => setActivePanel(tab.id)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={activePanel === tab.id ? "#FFFFFF" : "#3C4CC2"}
                />
                <Text
                  style={[
                    styles.panelTabText,
                    activePanel === tab.id && styles.panelTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Write Panel */}
        {activePanel === "write" && (
          <View style={styles.panel}>
            {/* Metadata Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    setDirtySinceSave(true);
                  }}
                  placeholder="Enter your manuscript title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subtitle</Text>
                <TextInput
                  style={styles.input}
                  value={subtitle}
                  onChangeText={(text) => {
                    setSubtitle(text);
                    setDirtySinceSave(true);
                  }}
                  placeholder="Optional subtitle"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setCategoryModalOpen(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {CATEGORIES.find((c) => c.value === category)?.label ||
                      "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B739B" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tags</Text>
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Add a tag"
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={handleAddTag}
                  />
                  <TouchableOpacity
                    style={styles.addTagButton}
                    onPress={handleAddTag}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.tagsContainer}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                        <Ionicons name="close" size={16} color="#3C4CC2" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visibility</Text>
                <View style={styles.visibilityButtons}>
                  <TouchableOpacity
                    style={[
                      styles.visibilityButton,
                      visibility === "private" && styles.visibilityButtonActive,
                    ]}
                    onPress={() => {
                      setVisibility("private");
                      setDirtySinceSave(true);
                    }}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color={visibility === "private" ? "#FFFFFF" : "#6B739B"}
                    />
                    <Text
                      style={[
                        styles.visibilityButtonText,
                        visibility === "private" &&
                          styles.visibilityButtonTextActive,
                      ]}
                    >
                      Private
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.visibilityButton,
                      visibility === "public" && styles.visibilityButtonActive,
                    ]}
                    onPress={() => {
                      setVisibility("public");
                      setDirtySinceSave(true);
                    }}
                  >
                    <Ionicons
                      name="globe"
                      size={18}
                      color={visibility === "public" ? "#FFFFFF" : "#6B739B"}
                    />
                    <Text
                      style={[
                        styles.visibilityButtonText,
                        visibility === "public" &&
                          styles.visibilityButtonTextActive,
                      ]}
                    >
                      Public
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Editor Section */}
            <View style={styles.section}>
              <View style={styles.editorHeader}>
                <Text style={styles.sectionTitle}>Manuscript Content</Text>
                <Text style={styles.wordCountBadge}>{wordCount} words</Text>
              </View>
              <TextInput
                style={styles.textEditor}
                value={content}
                onChangeText={(text) => {
                  setContent(text);
                  setDirtySinceSave(true);
                }}
                placeholder="Begin your story…"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaving || !currentProjectId}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Draft</Text>
                  </>
                )}
              </TouchableOpacity>

              {currentProjectId && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setProjectToDelete(currentProjectId);
                    setDeleteModalOpen(true);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* AI Panel */}
        {activePanel === "ai" && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>AI Writing Assistant</Text>

            {/* AI Tools */}
            <View style={styles.aiToolsGrid}>
              {AI_TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.aiToolCard}
                  onPress={() => handleAITool(tool.id)}
                  disabled={aiLoading}
                >
                  <Ionicons name={tool.icon as any} size={32} color="#3C4CC2" />
                  <Text style={styles.aiToolLabel}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate Ideas */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Generate Ideas</Text>
              <TextInput
                style={styles.textArea}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="Describe what you want to write about..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => handleAITool("generate")}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>Generate</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Translation */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Translate Content</Text>
              <View style={styles.languageSelector}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageChip,
                      selectedLanguage === lang.code &&
                        styles.languageChipActive,
                    ]}
                    onPress={() => setSelectedLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        selectedLanguage === lang.code &&
                          styles.languageChipTextActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.translateButton}
                onPress={handleTranslate}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#3C4CC2" />
                ) : (
                  <Text style={styles.translateButtonText}>Translate</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* AI Result */}
            {aiResult && (
              <View style={styles.aiResultContainer}>
                <View style={styles.aiResultHeader}>
                  <Text style={styles.aiResultTitle}>AI Result</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setContent(aiResult);
                      setDirtySinceSave(true);
                      setActivePanel("write");
                      Alert.alert("Success", "Result applied to editor");
                    }}
                  >
                    <Ionicons name="copy" size={20} color="#3C4CC2" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.aiResultScroll}>
                  <Text style={styles.aiResultText}>{aiResult}</Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Publish Panel */}
        {activePanel === "publish" && (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Publish Your Work</Text>

            {activeProject ? (
              <>
                <View style={styles.publishInfoCard}>
                  <View style={styles.publishInfoRow}>
                    <Text style={styles.publishInfoLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        activeProject.status === "published" &&
                          styles.statusBadgePublished,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          activeProject.status === "published" &&
                            styles.statusBadgeTextPublished,
                        ]}
                      >
                        {activeProject.status === "published"
                          ? "Published"
                          : "Draft"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.publishInfoRow}>
                    <Text style={styles.publishInfoLabel}>Word Count:</Text>
                    <Text style={styles.publishInfoValue}>
                      {activeProject.wordCount} words
                    </Text>
                  </View>
                  <View style={styles.publishInfoRow}>
                    <Text style={styles.publishInfoLabel}>Last Updated:</Text>
                    <Text style={styles.publishInfoValue}>
                      {formatDate(activeProject.updatedAt)}
                    </Text>
                  </View>
                  {activeProject.publishedAt && (
                    <View style={styles.publishInfoRow}>
                      <Text style={styles.publishInfoLabel}>Published:</Text>
                      <Text style={styles.publishInfoValue}>
                        {formatDate(activeProject.publishedAt)}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.publishButton}
                  onPress={() => setPublishModalOpen(true)}
                >
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>
                    {activeProject.status === "published"
                      ? "Update Published Version"
                      : "Publish Now"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.publishNote}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#3C4CC2"
                  />
                  <Text style={styles.publishNoteText}>
                    Publishing will make your work visible to others based on
                    your visibility settings. Make sure to save your changes
                    before publishing.
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>
                  Create a project to publish your work
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Projects Modal */}
      <Modal
        visible={projectsModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setProjectsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Projects</Text>
              <TouchableOpacity onPress={() => setProjectsModalOpen(false)}>
                <Ionicons name="close" size={24} color="#1A224A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={projects}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.projectItem,
                    item._id === currentProjectId && styles.projectItemActive,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.projectItemMain}
                    onPress={() => handleSelectProject(item)}
                  >
                    <View style={styles.projectItemContent}>
                      <Text style={styles.projectItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.projectItemMeta}>
                        {item.wordCount} words · {formatDate(item.updatedAt)}
                      </Text>
                    </View>
                    {item.status === "published" && (
                      <View style={styles.publishedBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#22C55E"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.previewButton}
                    onPress={() => {
                      setFlipBookProject(item);
                      setFlipBookOpen(true);
                    }}
                  >
                    <Ionicons name="book-outline" size={20} color="#3C4CC2" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No projects yet</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={categoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalOpen(false)}>
                <Ionicons name="close" size={24} color="#1A224A" />
              </TouchableOpacity>
            </View>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={styles.categoryItem}
                onPress={() => {
                  setCategory(cat.value);
                  setDirtySinceSave(true);
                  setCategoryModalOpen(false);
                }}
              >
                <Text style={styles.categoryItemText}>{cat.label}</Text>
                {category === cat.value && (
                  <Ionicons name="checkmark" size={24} color="#3C4CC2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Publish Modal */}
      <Modal
        visible={publishModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPublishModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Ionicons name="rocket" size={48} color="#3C4CC2" />
            <Text style={styles.alertTitle}>Publish Project?</Text>
            <Text style={styles.alertMessage}>
              Are you sure you want to publish "{title}"? This will make it
              available to others.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={styles.alertButtonCancel}
                onPress={() => setPublishModalOpen(false)}
              >
                <Text style={styles.alertButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertButtonConfirm}
                onPress={handlePublish}
              >
                <Text style={styles.alertButtonConfirmText}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={deleteModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Ionicons name="warning" size={48} color="#EF4444" />
            <Text style={styles.alertTitle}>Delete Project?</Text>
            <Text style={styles.alertMessage}>
              This action cannot be undone. All content will be permanently
              deleted.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={styles.alertButtonCancel}
                onPress={() => {
                  setDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
              >
                <Text style={styles.alertButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButtonConfirm, styles.alertButtonDelete]}
                onPress={handleDelete}
              >
                <Text style={styles.alertButtonConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FlipBook Viewer */}
      {flipBookProject && (
        <FlipBookViewer
          visible={flipBookOpen}
          onClose={() => {
            setFlipBookOpen(false);
            setFlipBookProject(null);
          }}
          title={flipBookProject.title}
          subtitle={flipBookProject.subtitle}
          content={flipBookProject.content}
          category={flipBookProject.category}
        />
      )}
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
    scrollView: {
      flex: 1,
    },
    content: {
      paddingBottom: 90,
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
      backgroundColor: theme.colors.background,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    panelTabs: {
      flexDirection: "row",
      gap: 8,
    },
    panelTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    panelTabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    panelTabText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    panelTabTextActive: {
      color: theme.colors.onPrimary,
    },
    panel: {
      paddingHorizontal: 24,
      gap: 20,
    },
    section: {
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
    textEditor: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
      minHeight: 300,
    },
    textArea: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
      minHeight: 100,
      textAlignVertical: "top",
    },
    selectButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: theme.colors.surface,
    },
    selectButtonText: {
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    tagInputRow: {
      flexDirection: "row",
      gap: 8,
    },
    flex1: {
      flex: 1,
    },
    addTagButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tagChipText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: "600",
    },
    visibilityButtons: {
      flexDirection: "row",
      gap: 12,
    },
    visibilityButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    visibilityButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    visibilityButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    visibilityButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    editorHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    wordCountBadge: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
      paddingVertical: 4,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    actionButtons: {
      flexDirection: "row",
      gap: 12,
    },
    saveButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 8,
        elevation: 4,
      }),
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    deleteButton: {
      width: 50,
      height: 50,
      borderRadius: 12,
      backgroundColor: theme.colors.dangerSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    aiToolsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    aiToolCard: {
      flex: 1,
      minWidth: "30%",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    aiToolLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
      marginTop: 8,
      textAlign: "center",
    },
    generateButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      marginTop: 12,
    },
    generateButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    languageSelector: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    languageChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    languageChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    languageChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    languageChipTextActive: {
      color: theme.colors.onPrimary,
    },
    translateButton: {
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: "center",
    },
    translateButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    aiResultContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    aiResultHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    aiResultTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    aiResultScroll: {
      maxHeight: 200,
    },
    aiResultText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    publishInfoCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      marginBottom: 20,
    },
    publishInfoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    publishInfoLabel: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    publishInfoValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    statusBadgePublished: {
      backgroundColor: theme.colors.successSoft,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    statusBadgeTextPublished: {
      color: theme.colors.success,
    },
    publishButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      marginBottom: 16,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 8,
        elevation: 4,
      }),
    },
    publishButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    publishNote: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    publishNoteText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 14,
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
      paddingBottom: 24,
      maxHeight: "80%",
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
    projectItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 20,
      marginVertical: 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    projectItemActive: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
    },
    projectItemMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    projectItemContent: {
      flex: 1,
    },
    projectItemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    projectItemMeta: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    publishedBadge: {
      marginLeft: 12,
    },
    previewButton: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginRight: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 4,
      borderRadius: 12,
    },
    categoryItemText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    alertModal: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 24,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.2,
        radius: 16,
        elevation: 8,
      }),
    },
    alertTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    alertMessage: {
      fontSize: 15,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 22,
    },
    alertButtons: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    alertButtonCancel: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    alertButtonCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    alertButtonConfirm: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
    },
    alertButtonDelete: {
      backgroundColor: theme.colors.danger,
    },
    alertButtonConfirmText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
  });
