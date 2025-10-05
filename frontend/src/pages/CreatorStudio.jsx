import {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoGlobe,
  IoStatsChart,
  IoLockClosed,
  IoWarning,
  IoCreate,
  IoAdd,
  IoFolderOpen,
  IoSave,
  IoRocket,
  IoSparkles,
  IoPencil,
  IoDocumentText,
  IoColorPalette,
  IoCloudUpload,
  IoTrash,
  IoCopy,
} from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import {
  getCreatorProjects,
  createCreatorProject,
  updateCreatorProject,
  deleteCreatorProject,
  publishCreatorProject,
  generateCreatorPrompt,
  markCreatorProjectExported,
  fixGrammar,
  translateUserText,
  improveUserText,
} from "../utils/api";

const SAVED_PAGE_SIZE = 4;
const DEFAULT_EDITOR_TEXT = "Begin your story…";
const DEFAULT_EDITOR_HTML = "<p>Begin your story…</p>";
const GRADIENTS = [
  "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  "linear-gradient(135deg, #0ea5e9, #6366f1)",
  "linear-gradient(135deg, #f97316, #f43f5e)",
  "linear-gradient(135deg, #10b981, #14b8a6)",
  "linear-gradient(135deg, #a855f7, #6366f1)",
  "linear-gradient(135deg, #facc15, #f97316)",
];
const COVER_FONTS = [
  "Playfair Display",
  "Inter",
  "Merriweather",
  "Lora",
  "Montserrat",
  "Source Serif Pro",
];
const LANG_OPTIONS = [
  { code: "english", label: "English" },
  { code: "spanish", label: "Spanish" },
  { code: "french", label: "French" },
  { code: "german", label: "German" },
  { code: "italian", label: "Italian" },
  { code: "japanese", label: "Japanese" },
];
const PANEL_TABS = [
  { id: "write", label: "Notebook", icon: <IoPencil className="h-4 w-4" /> },
  {
    id: "cover",
    label: "Cover design",
    icon: <IoColorPalette className="h-4 w-4" />,
  },
  { id: "ai", label: "AI ideas", icon: <IoSparkles className="h-4 w-4" /> },
  { id: "publish", label: "Publish", icon: <IoRocket className="h-4 w-4" /> },
];

const COLOR_PROPS = [
  "color",
  "background",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "boxShadow",
];

const convertUnsupportedColor = (value = "") =>
  value.replace(/oklch\([^)]*\)/gi, (match) => {
    const numeric = match
      .replace(/oklch|\(|\)/gi, "")
      .trim()
      .split(/\s+/)
      .map(Number);
    const lightness = numeric[0];
    if (!Number.isFinite(lightness)) {
      return "#1f2937";
    }
    if (lightness >= 0.75) return "#f8fafc";
    if (lightness >= 0.6) return "#cbd5f5";
    if (lightness >= 0.45) return "#3b82f6";
    if (lightness >= 0.3) return "#1d4ed8";
    return "#0f172a";
  });

const applyCanvasColorFallbacks = (root) => {
  if (typeof window === "undefined" || !root) {
    return () => {};
  }

  const overrides = [];
  const nodes = [root, ...root.querySelectorAll("*")];
  nodes.forEach((node) => {
    COLOR_PROPS.forEach((prop) => {
      const previous = node.style?.[prop] ?? "";
      const inlineValue = previous;
      if (inlineValue && inlineValue.includes("oklch(")) {
        const fallback = convertUnsupportedColor(inlineValue);
        overrides.push({ node, prop, previous });
        node.style[prop] = fallback;
        return;
      }
      const computedValue = window.getComputedStyle(node)[prop];
      if (computedValue && computedValue.includes("oklch(")) {
        const fallback = convertUnsupportedColor(computedValue);
        overrides.push({ node, prop, previous });
        node.style[prop] = fallback;
      }
    });
  });

  return () => {
    overrides.forEach(({ node, prop, previous }) => {
      node.style[prop] = previous;
    });
  };
};

const plainTextToHtml = (value = "") => {
  const normalized = value.replace(/\r\n/g, "\n");
  if (!normalized.trim()) {
    return DEFAULT_EDITOR_HTML;
  }
  return normalized
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${
          paragraph
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br />")
            .trim() || "<br />"
        }</p>`
    )
    .join("");
};

const htmlToNotebookText = (html = "") => {
  if (!html) return "";
  const normalized = html
    .replace(/<\/?(strong|em|span|div|u|b|i|font)[^>]*>/gi, "")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/(p|h[1-6]|li)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ");

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
};

const extractContentBlocks = (html = "") => {
  if (!html || !html.trim()) return [];
  const normalized = html
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n");

  return normalized
    .split(/\n{2,}/)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", text }));
};

const renderBlocksToPdf = async (doc, blocks, { margin = 64 } = {}) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let cursorY = margin;

  doc.setFont("times", "normal");
  doc.setFontSize(12);

  blocks.forEach((block, index) => {
    const lines = doc.splitTextToSize(block.text, maxWidth);
    lines.forEach((line) => {
      if (cursorY + 20 > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += 18;
    });
    if (index < blocks.length - 1) {
      cursorY += 6;
    }
  });
};

const appendPageNumbers = (doc, margin, { startAt = 1 } = {}) => {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = startAt; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `${page} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - margin / 2,
      { align: "center" }
    );
  }
};

const inferImageFormat = (dataUrl = "") => {
  if (
    dataUrl.startsWith("data:image/jpeg") ||
    dataUrl.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  if (dataUrl.startsWith("data:image/webp")) {
    return "WEBP";
  }
  return "PNG";
};

const formatDate = (value) => {
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

const pickProjectCoverBackground = (project, index = 0) => {
  const coverBackground = project?.coverDesign?.background;
  if (coverBackground?.type === "solid" && coverBackground.value) {
    return coverBackground.value;
  }
  if (coverBackground?.value) {
    return coverBackground.value;
  }

  const palette = project?.palette || [];
  if (Array.isArray(palette) && palette.length > 0) {
    const primary = palette[0];
    const secondary = palette[1] || primary;
    if (primary) {
      return `linear-gradient(135deg, ${primary}, ${secondary})`;
    }
  }

  return GRADIENTS[index % GRADIENTS.length];
};

const createBlankElement = (type, overrides = {}) => {
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    x: 40,
    y: 40,
    width: 220,
    height: type === "text" ? 120 : 220,
    rotate: 0,
    zIndex: 1,
  };

  if (type === "text") {
    return {
      ...base,
      type,
      text: "Your title here",
      fontFamily: "Playfair Display",
      fontWeight: 600,
      color: "#0f172a",
      letterSpacing: 1,
      textAlign: "center",
      lineHeight: 1.2,
      background: "transparent",
      ...overrides,
    };
  }

  if (type === "shape") {
    return {
      ...base,
      type,
      shape: "rectangle",
      fill: "#3b82f6",
      radius: 16,
      opacity: 0.2,
      ...overrides,
    };
  }

  return {
    ...base,
    type: "image",
    src: overrides.src || "",
    preserveRatio: true,
    ...overrides,
  };
};

const INITIAL_COVER = {
  background: { type: "gradient", value: GRADIENTS[0] },
  elements: [
    createBlankElement("shape", {
      x: 70,
      y: 90,
      width: 280,
      height: 280,
      opacity: 0.18,
      fill: "rgba(59, 130, 246, 0.35)",
    }),
    createBlankElement("text", {
      x: 60,
      y: 140,
      width: 300,
      height: 160,
      text: "Untitled manuscript",
    }),
    createBlankElement("text", {
      x: 60,
      y: 260,
      width: 300,
      height: 120,
      text: "Subtitle or author name",
      fontFamily: "Inter",
      fontWeight: 400,
      color: "#1f2937",
    }),
  ],
};

function SavedProjectsModal({
  isOpen,
  projects,
  page,
  totalPages,
  activeProjectId,
  onSelectProject,
  onPrevPage,
  onNextPage,
  onClose,
}) {
  if (!isOpen) return null;

  const hasProjects = projects.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Saved projects
            </h3>
            <p className="text-sm text-slate-600">
              Browse your library, preview covers, and jump back into any
              manuscript.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={!hasProjects || page === 0}
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              <IoChevronBack className="h-5 w-5" />
            </button>
            <button
              onClick={onNextPage}
              disabled={!hasProjects || page >= totalPages - 1}
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              <IoChevronForward className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              type="button"
            >
              <IoClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {!hasProjects && (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Create or save a project to see it listed here.
            </div>
          )}
          {projects.map((project, index) => {
            const globalIndex = page * SAVED_PAGE_SIZE + index;
            const background = pickProjectCoverBackground(project, globalIndex);
            const isActive = project._id === activeProjectId;
            const subtitle =
              project.subtitle ||
              project.promptHistory?.[0]?.tagline ||
              "No tagline yet";

            return (
              <button
                key={project._id}
                onClick={() => onSelectProject(project._id)}
                type="button"
                className={`group flex flex-col rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-sm">
                  {project.coverImage?.dataUrl ? (
                    <img
                      src={project.coverImage.dataUrl}
                      alt="Project cover"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center px-4 text-center"
                      style={{ background }}
                    >
                      <div className="text-white">
                        <p className="text-sm font-semibold leading-tight">
                          {project.title || "Untitled manuscript"}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-wide opacity-80">
                          {project.category || "general"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {project.title || "Untitled manuscript"}
                  </span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {subtitle}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <span>
            {hasProjects
              ? `Page ${page + 1} of ${totalPages}`
              : "No projects saved yet"}
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishModal({
  isOpen,
  onClose,
  onConfirm,
  defaultVisibility,
  defaultStatus,
}) {
  const [visibility, setVisibility] = useState(defaultVisibility || "public");
  const [status, setStatus] = useState(defaultStatus || "published");

  useEffect(() => {
    setVisibility(defaultVisibility || "public");
    setStatus(defaultStatus || "published");
  }, [defaultVisibility, defaultStatus, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Publish your book
            </h3>
            <p className="text-sm text-slate-600">
              Choose how readers can discover your work.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Visibility
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {["public", "followers", "private"].map((option) => (
                <button
                  key={option}
                  onClick={() => setVisibility(option)}
                  className={`rounded-xl border p-4 text-left transition ${
                    visibility === option
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold capitalize">
                    {option === "public" && <IoGlobe className="h-4 w-4" />}
                    {option === "followers" && (
                      <IoStatsChart className="h-4 w-4" />
                    )}
                    {option === "private" && (
                      <IoLockClosed className="h-4 w-4" />
                    )}
                    {option}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {option === "public"
                      ? "Visible to everyone on the platform"
                      : option === "followers"
                      ? "Visible only to your followers"
                      : "Only you can see this book"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Status</p>
            <div className="flex gap-3">
              {["published", "draft"].map((option) => (
                <button
                  key={option}
                  onClick={() => setStatus(option)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                    status === option
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-200 hover:border-blue-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ visibility, status })}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            Update publish settings
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, projectTitle }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2 text-red-600">
            <IoWarning className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Delete this project?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              "{projectTitle}" will be removed permanently. This action cannot
              be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreatorStudio() {
  const { user } = useContext(AuthContext);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activePanel, setActivePanel] = useState("write");
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [coverState, setCoverState] = useState(INITIAL_COVER);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [metadata, setMetadata] = useState({
    title: "Untitled manuscript",
    subtitle: "",
    category: "general",
    tags: [],
    visibility: "private",
    status: "draft",
  });
  const [editorContent, setEditorContent] = useState(
    "<p>Begin your story…</p>"
  );
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [assistLanguage, setAssistLanguage] = useState("english");
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistResult, setAssistResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtySinceSave, setDirtySinceSave] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    projectId: null,
  });
  const [savedGalleryOpen, setSavedGalleryOpen] = useState(false);
  const [savedPage, setSavedPage] = useState(0);
  const [editorDraft, setEditorDraft] = useState(DEFAULT_EDITOR_TEXT);

  const coverRef = useRef(null);
  const coverImageInputRef = useRef(null);

  const projectsLength = projects.length;
  const totalSavedPages = projectsLength
    ? Math.ceil(projectsLength / SAVED_PAGE_SIZE)
    : 0;

  const galleryProjects = useMemo(() => {
    const start = savedPage * SAVED_PAGE_SIZE;
    return projects.slice(start, start + SAVED_PAGE_SIZE);
  }, [projects, savedPage]);

  useEffect(() => {
    if (!projectsLength) {
      setSavedPage(0);
      return;
    }
    const maxPage = Math.max(
      0,
      Math.ceil(projectsLength / SAVED_PAGE_SIZE) - 1
    );
    setSavedPage((prev) => Math.min(prev, maxPage));
  }, [projectsLength]);

  const activeProject = useMemo(
    () => projects.find((project) => project._id === currentProjectId) || null,
    [projects, currentProjectId]
  );

  const wordCount = useMemo(() => {
    return editorDraft.replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
      .length;
  }, [editorDraft]);

  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await getCreatorProjects();
      setProjects(data);
      if (data.length > 0) {
        const first = data[0];
        setCurrentProjectId(first._id);
        hydrateStateFromProject(first);
      } else {
        setCurrentProjectId(null);
        hydrateStateFromProject(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Couldn't load your studio projects.");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  const hydrateStateFromProject = useCallback((project) => {
    if (!project) {
      setMetadata({
        title: "Untitled manuscript",
        subtitle: "",
        category: "general",
        tags: [],
        visibility: "private",
        status: "draft",
      });
      setEditorContent(DEFAULT_EDITOR_HTML);
      setEditorDraft(DEFAULT_EDITOR_TEXT);
      setAiHistory([]);
      setCoverState(INITIAL_COVER);
      setAiResult(null);
      setAssistResult(null);
      setDirtySinceSave(false);
      return;
    }

    setMetadata({
      title: project.title || "Untitled manuscript",
      subtitle: project.subtitle || "",
      category: project.category || "general",
      tags: project.tags || [],
      visibility: project.visibility || "private",
      status: project.status || "draft",
    });
    const contentHtml = project.content || DEFAULT_EDITOR_HTML;
    const draftText = htmlToNotebookText(contentHtml) || DEFAULT_EDITOR_TEXT;
    setEditorContent(contentHtml);
    setEditorDraft(draftText);
    setAiHistory(project.promptHistory || []);
    setCoverState(project.coverDesign || INITIAL_COVER);
    setAiResult(null);
    setAssistResult(null);
    setDirtySinceSave(false);
  }, []);

  const ensureProjectExists = useCallback(async () => {
    if (currentProjectId) return currentProjectId;
    try {
      const payload = {
        title: metadata.title,
        content: editorContent,
        coverDesign: coverState,
        visibility: metadata.visibility,
        status: metadata.status,
      };
      const project = await createCreatorProject(payload);
      setProjects((prev) => [project, ...prev]);
      setCurrentProjectId(project._id);
      return project._id;
    } catch (error) {
      console.error(error);
      toast.error("Unable to create a project.");
      throw error;
    }
  }, [currentProjectId, metadata, editorContent, coverState]);

  const addNewProject = async () => {
    try {
      const project = await createCreatorProject({
        title: "Untitled manuscript",
        content: "<p>Begin your story…</p>",
        coverDesign: INITIAL_COVER,
        visibility: "private",
        status: "draft",
      });
      setProjects((prev) => [project, ...prev]);
      setCurrentProjectId(project._id);
      hydrateStateFromProject(project);
      toast.success("New project ready to write.");
    } catch (error) {
      console.error(error);
      toast.error("We couldn't create a new project.");
    }
  };

  const handleSelectProject = (projectId) => {
    if (projectId === currentProjectId) return;
    const project = projects.find((item) => item._id === projectId);
    if (!project) return;
    setCurrentProjectId(projectId);
    hydrateStateFromProject(project);
    setSavedGalleryOpen(false);
  };

  const handleMetadataChange = (key, value) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
    setDirtySinceSave(true);
  };

  const handleTagInput = (value) => {
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setMetadata((prev) => ({ ...prev, tags }));
    setDirtySinceSave(true);
  };

  const updateCoverState = (next) => {
    setCoverState(next);
    setDirtySinceSave(true);
  };

  const handleEditorChange = (value) => {
    setEditorDraft(value);
    setEditorContent(plainTextToHtml(value));
    setDirtySinceSave(true);
  };

  const handleAddElement = (type, overrides = {}) => {
    const element = createBlankElement(type, overrides);
    updateCoverState({
      ...coverState,
      elements: [...coverState.elements, element],
    });
    setSelectedElementId(element.id);
  };

  const handleElementChange = (id, updates) => {
    updateCoverState({
      ...coverState,
      elements: coverState.elements.map((element) =>
        element.id === id ? { ...element, ...updates } : element
      ),
    });
  };

  const handleRemoveElement = (id) => {
    updateCoverState({
      ...coverState,
      elements: coverState.elements.filter((element) => element.id !== id),
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleBackgroundChange = (value) => {
    updateCoverState({
      ...coverState,
      background: value,
    });
  };

  const generateCoverSnapshot = async () => {
    if (!coverRef.current) return null;
    const revertColorOverrides = applyCanvasColorFallbacks(coverRef.current);
    try {
      const canvas = await html2canvas(coverRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Cover snapshot failed", error);
      return null;
    } finally {
      revertColorOverrides();
    }
  };

  const persistProject = useCallback(
    async ({ showToast = false } = {}) => {
      if (!user) return;
      try {
        setIsSaving(true);
        const projectId = await ensureProjectExists();
        const coverSnapshot = await generateCoverSnapshot();

        const payload = {
          title: metadata.title,
          subtitle: metadata.subtitle,
          category: metadata.category,
          tags: metadata.tags,
          content: editorContent,
          coverDesign: coverState,
          coverImage: coverSnapshot ? { dataUrl: coverSnapshot } : undefined,
          visibility: metadata.visibility,
          status: metadata.status,
          promptHistory: aiHistory,
        };

        const updated = await updateCreatorProject(projectId, payload);
        setProjects((prev) =>
          prev.map((project) =>
            project._id === updated._id ? updated : project
          )
        );
        setDirtySinceSave(false);
        if (showToast) {
          toast.success("Project saved");
        }
      } catch (error) {
        console.error(error);
        toast.error("Couldn't save your project");
      } finally {
        setIsSaving(false);
      }
    },
    [user, ensureProjectExists, metadata, editorContent, coverState, aiHistory]
  );

  useEffect(() => {
    if (!dirtySinceSave || !currentProjectId) return;
    const timer = setTimeout(() => {
      persistProject();
    }, 1500);
    return () => clearTimeout(timer);
  }, [dirtySinceSave, persistProject, currentProjectId]);

  const handleGeneratePrompt = async () => {
    try {
      if (!aiPrompt.trim()) {
        toast.error("Describe the idea you want to explore.");
        return;
      }
      const projectId = await ensureProjectExists();
      setAiGenerating(true);
      const result = await generateCreatorPrompt(projectId, aiPrompt.trim());
      setAiResult(result);
      setAiHistory(result.history || []);
      setDirtySinceSave(true);
      toast.success("Idea crafted ✨");
    } catch (error) {
      console.error(error);
      toast.error("Prompt generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiResultToEditor = (type) => {
    if (!aiResult) return;
    const text =
      type === "story"
        ? aiResult.storyIdea
        : type === "tagline"
        ? aiResult.tagline
        : aiResult.coverIdea;
    if (!text) return;
    const trimmed = text.trim();
    const prefix = editorDraft.trimEnd();
    const separator = prefix ? "\n\n" : "";
    const nextDraft = `${prefix}${separator}${trimmed}`;
    handleEditorChange(nextDraft);
    toast.success("Added to your manuscript");
  };

  const handleAssistAction = async (action) => {
    const text = editorDraft.trim();
    if (!text) {
      toast.error("Write something first");
      return;
    }
    try {
      setAssistLoading(true);
      if (action === "grammar") {
        const response = await fixGrammar(text);
        setAssistResult({
          type: "grammar",
          title: "Grammar suggestions",
          original: response.originalText,
          proposal: response.correctedText,
          message: response.message,
        });
      } else if (action === "translate") {
        const response = await translateUserText(text, assistLanguage);
        setAssistResult({
          type: "translate",
          title: `Translation to ${assistLanguage}`,
          original: response.originalText,
          proposal: response.translatedText,
          message: response.message,
        });
      } else if (action === "improve") {
        const response = await improveUserText(text);
        setAssistResult({
          type: "improve",
          title: "Enhanced narrative",
          original: response.originalText,
          proposal: response.improvedText,
          message: response.message,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("AI assistant is unavailable");
    } finally {
      setAssistLoading(false);
    }
  };

  const applyAssistResult = () => {
    if (!assistResult) return;
    const proposal = (assistResult.proposal || "").replace(/\r\n/g, "\n");
    handleEditorChange(proposal);
    toast.success("Updated with AI suggestion");
    setAssistResult(null);
  };

  const handlePublish = async ({ visibility, status }) => {
    try {
      const projectId = await ensureProjectExists();
      const updated = await publishCreatorProject(projectId, {
        visibility,
        status,
      });
      setProjects((prev) =>
        prev.map((project) => (project._id === updated._id ? updated : project))
      );
      setMetadata((prev) => ({
        ...prev,
        visibility: updated.visibility,
        status: updated.status,
      }));
      toast.success(
        updated.status === "published"
          ? "Your book is live"
          : "Publishing updated"
      );
    } catch (error) {
      console.error(error);
      toast.error("Publishing failed");
    } finally {
      setPublishModalOpen(false);
    }
  };

  const handleExportPdf = async () => {
    if (!user) return;
    try {
      setExporting(true);
      const projectId = await ensureProjectExists();
      let coverImage = await generateCoverSnapshot();
      const selectedProject =
        projects.find((project) => project._id === projectId) || activeProject;
      if (!coverImage) {
        coverImage = selectedProject?.coverImage?.dataUrl || null;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 64;

      doc.setProperties({ title: metadata.title || "Manuscript" });
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      if (coverImage) {
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        let drawWidth = maxWidth;
        let drawHeight = drawWidth * (4 / 3);

        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = drawHeight * (3 / 4);
        }

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;
        doc.addImage(
          coverImage,
          inferImageFormat(coverImage),
          x,
          y,
          drawWidth,
          drawHeight,
          undefined,
          "FAST"
        );
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(15, 23, 42);
        doc.text(
          metadata.title || "Untitled manuscript",
          pageWidth / 2,
          pageHeight / 2 - 16,
          {
            align: "center",
          }
        );
        doc.setFont("helvetica", "normal");
        if (metadata.subtitle) {
          doc.setFontSize(18);
          doc.text(metadata.subtitle, pageWidth / 2, pageHeight / 2 + 12, {
            align: "center",
          });
        }
        doc.setFontSize(12);
        doc.text(
          `By ${user.displayName || user.username || "Author"}`,
          pageWidth / 2,
          pageHeight / 2 + 48,
          {
            align: "center",
          }
        );
      }

      const blocks = extractContentBlocks(editorContent);
      if (blocks.length > 0) {
        doc.addPage();
        await renderBlocksToPdf(doc, blocks, { margin });
      }

      appendPageNumbers(doc, margin, { startAt: 2 });
      doc.save(`${metadata.title || "manuscript"}.pdf`);
      await markCreatorProjectExported(projectId);
      toast.success("PDF exported to your device");
    } catch (error) {
      console.error(error);
      toast.error("We couldn't export the PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      const { projectId } = deleteModal;
      if (!projectId) return;
      await deleteCreatorProject(projectId);
      const nextProjects = projects.filter(
        (project) => project._id !== projectId
      );
      setProjects(nextProjects);
      if (currentProjectId === projectId) {
        if (nextProjects.length > 0) {
          setCurrentProjectId(nextProjects[0]._id);
          hydrateStateFromProject(nextProjects[0]);
        } else {
          setCurrentProjectId(null);
          hydrateStateFromProject(null);
        }
      }
      toast.success("Project removed");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't delete project");
    } finally {
      setDeleteModal({ open: false, projectId: null });
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50">
        <p className="rounded-xl bg-white px-6 py-4 text-blue-700 shadow">
          Please sign in to access Creator Studio.
        </p>
      </div>
    );
  }

  const selectedElement = coverState.elements.find(
    (element) => element.id === selectedElementId
  );
  const projectPendingDelete = deleteModal.projectId
    ? projects.find((project) => project._id === deleteModal.projectId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[320px,1fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-blue-100/40">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                  <IoCreate className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    Creator Studio
                  </h1>
                  <p className="text-sm text-slate-500">
                    Blueprint your book, design covers, and publish with one
                    workspace.
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-blue-50/80 p-4 text-sm text-blue-700">
                <p className="font-medium">
                  Hey {user.displayName || user.username}! ✨
                </p>
                <p className="mt-1 text-blue-600">
                  Every change auto-saves. Export anytime or publish privately
                  until you're ready.
                </p>
              </div>
              <button
                onClick={addNewProject}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                <IoAdd className="h-4 w-4" /> New project
              </button>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Library</p>
                {isSaving ? (
                  <span className="text-xs text-blue-500">Saving…</span>
                ) : dirtySinceSave ? (
                  <span className="text-xs text-amber-600">
                    Unsaved changes
                  </span>
                ) : (
                  <span className="text-xs text-emerald-600">
                    All changes saved
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSavedPage(0);
                  setSavedGalleryOpen(true);
                }}
                disabled={!projectsLength}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IoFolderOpen className="h-4 w-4" />
                Browse saved projects
              </button>
              <div className="mt-3 space-y-3 overflow-y-auto pr-1 max-h-[420px]">
                {loadingProjects && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Loading projects…
                  </div>
                )}

                {!loadingProjects && projects.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No projects yet. Create your first story!
                  </div>
                )}

                {projects.map((project) => {
                  const isActive = project._id === currentProjectId;
                  const handleCardSelect = () =>
                    handleSelectProject(project._id);
                  return (
                    <div
                      key={project._id}
                      role="button"
                      tabIndex={0}
                      onClick={handleCardSelect}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleCardSelect();
                        }
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 ${
                        isActive
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
                          {project.status}
                        </span>
                        <span>Updated {formatDate(project.updatedAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {project.title || "Untitled manuscript"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {project.subtitle ||
                          project.promptHistory?.[0]?.tagline ||
                          "No tagline yet"}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{project.wordCount || 0} words</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteModal({
                              open: true,
                              projectId: project._id,
                            });
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-blue-100/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <input
                    value={metadata.title}
                    onChange={(event) =>
                      handleMetadataChange("title", event.target.value)
                    }
                    className="w-full rounded-2xl border border-transparent bg-slate-100 px-4 py-3 text-xl font-semibold text-slate-900 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Project title"
                  />
                  <input
                    value={metadata.subtitle}
                    onChange={(event) =>
                      handleMetadataChange("subtitle", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-transparent bg-slate-100 px-4 py-2 text-sm text-slate-600 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Tagline or subtitle"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 px-4 py-2 text-blue-700">
                    <IoStatsChart className="h-4 w-4" />
                    <span>{wordCount} words</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={metadata.category}
                      onChange={(event) =>
                        handleMetadataChange("category", event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      {[
                        "general",
                        "fiction",
                        "non-fiction",
                        "fantasy",
                        "romance",
                        "thriller",
                        "poetry",
                      ].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <input
                      value={metadata.tags.join(", ")}
                      onChange={(event) => handleTagInput(event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2"
                      placeholder="Tags, separated by commas"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {PANEL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(tab.id)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      activePanel === tab.id
                        ? "bg-blue-600 text-white shadow"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => persistProject({ showToast: true })}
                    className="flex items-center gap-2 rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    <IoSave className="h-4 w-4" /> Manual save
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exporting ? "Exporting…" : "Export PDF"}
                  </button>
                  <button
                    onClick={() => setPublishModalOpen(true)}
                    className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
                  >
                    <IoRocket className="h-4 w-4" /> Publish
                  </button>
                </div>
              </div>
            </div>

            {activePanel === "write" && (
              <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
                <div className="rounded-3xl bg-white shadow overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Notebook mode
                      </p>
                      <p className="text-xs text-slate-500">
                        Your thoughts are saved as you type.
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{wordCount} words</p>
                      <p>
                        {new Date().toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={editorDraft}
                    onChange={(event) => handleEditorChange(event.target.value)}
                    placeholder="Paint your story with words…"
                    className="notebook-textarea"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-5 shadow">
                    <h3 className="text-sm font-semibold text-slate-700">
                      AI assistance
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Polish your writing, translate passages, or expand ideas.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <button
                        onClick={() => handleAssistAction("grammar")}
                        disabled={assistLoading}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>Grammar polish</span>
                        <IoPencil className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
                        <select
                          value={assistLanguage}
                          onChange={(event) =>
                            setAssistLanguage(event.target.value)
                          }
                          className="flex-1 rounded-xl border border-slate-200 px-2 py-1 text-sm"
                        >
                          {LANG_OPTIONS.map((language) => (
                            <option key={language.code} value={language.code}>
                              {language.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssistAction("translate")}
                          disabled={assistLoading}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Translate
                        </button>
                      </div>
                      <button
                        onClick={() => handleAssistAction("improve")}
                        disabled={assistLoading}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>Story enhancer</span>
                        <IoSparkles className="h-4 w-4" />
                      </button>
                    </div>
                    {assistResult && (
                      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {assistResult.title}
                            </p>
                            <p className="text-xs text-blue-500">
                              {assistResult.message}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAssistResult(null)}
                              className="rounded-xl border border-blue-200 px-3 py-1 text-xs text-blue-600"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={applyAssistResult}
                              className="rounded-xl bg-blue-600 px-3 py-1 text-xs text-white"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-xs text-blue-700">
                          {assistResult.proposal}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl bg-white p-5 shadow">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Prompt notebook
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Recent AI ideas saved with this project.
                    </p>
                    <div className="mt-3 space-y-3">
                      {aiHistory.length === 0 && (
                        <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                          Generate a prompt to start building your idea bank.
                        </p>
                      )}
                      {aiHistory.slice(0, 5).map((entry) => (
                        <div
                          key={`${entry.prompt}-${entry.createdAt}`}
                          className="rounded-2xl border border-slate-200 p-3"
                        >
                          <p className="text-[11px] uppercase tracking-wide text-blue-500">
                            {formatDate(entry.createdAt)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {entry.prompt}
                          </p>
                          <p className="mt-2 text-xs text-slate-500 line-clamp-3">
                            {entry.storyIdea}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activePanel === "cover" && (
              <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr),minmax(0,2fr)] xl:grid-cols-[minmax(0,5fr),minmax(0,2fr)]">
                <div className="rounded-3xl bg-white p-5 shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Design canvas
                    </p>
                    <div className="flex gap-2 text-xs text-slate-500">
                      <button
                        onClick={() => updateCoverState(INITIAL_COVER)}
                        className="rounded-xl border border-slate-200 px-3 py-1"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-4 lg:flex-row">
                    <div className="flex-1 rounded-3xl bg-slate-100 p-4">
                      <div
                        ref={coverRef}
                        data-cover-export="true"
                        className="relative mx-auto aspect-[3/4] max-h-[560px] max-w-[420px] overflow-hidden rounded-2xl shadow-lg"
                        style={{
                          background:
                            coverState.background?.type === "solid"
                              ? coverState.background.value
                              : coverState.background?.value || GRADIENTS[0],
                        }}
                      >
                        {coverState.elements.map((element) => (
                          <Rnd
                            key={element.id}
                            size={{
                              width: element.width,
                              height: element.height,
                            }}
                            position={{ x: element.x, y: element.y }}
                            onDragStop={(event, data) =>
                              handleElementChange(element.id, {
                                x: data.x,
                                y: data.y,
                              })
                            }
                            onResizeStop={(
                              event,
                              direction,
                              ref,
                              delta,
                              position
                            ) =>
                              handleElementChange(element.id, {
                                width: ref.offsetWidth,
                                height: ref.offsetHeight,
                                ...position,
                              })
                            }
                            bounds="parent"
                            lockAspectRatio={element.type === "image"}
                            onClick={() => setSelectedElementId(element.id)}
                            className={`group absolute cursor-move rounded-xl border-2 transition ${
                              selectedElementId === element.id
                                ? "border-blue-500"
                                : "border-transparent hover:border-blue-300"
                            }`}
                          >
                            {element.type === "text" && (
                              <div
                                className="h-full w-full rounded-xl p-4 text-center"
                                style={{
                                  fontFamily: element.fontFamily,
                                  fontWeight: element.fontWeight,
                                  color: element.color,
                                  letterSpacing: `${element.letterSpacing}px`,
                                  textAlign: element.textAlign,
                                  lineHeight: element.lineHeight,
                                  background: element.background,
                                }}
                              >
                                {element.text}
                              </div>
                            )}
                            {element.type === "image" && (
                              <img
                                src={element.src}
                                alt="Cover element"
                                className="h-full w-full rounded-xl object-cover"
                              />
                            )}
                            {element.type === "shape" && (
                              <div
                                className="h-full w-full"
                                style={{
                                  borderRadius:
                                    element.shape === "circle"
                                      ? "999px"
                                      : `${element.radius}px`,
                                  background: element.fill,
                                  opacity: element.opacity,
                                }}
                              />
                            )}

                            {selectedElementId === element.id && (
                              <div className="absolute -top-9 right-0 flex gap-1">
                                <button
                                  onClick={() =>
                                    handleRemoveElement(element.id)
                                  }
                                  className="rounded-full bg-red-500 p-1 text-white shadow"
                                >
                                  <IoTrash className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    const {
                                      id: _ignored,
                                      type: _t,
                                      ...rest
                                    } = element;
                                    handleAddElement(element.type, {
                                      ...rest,
                                      x: element.x + 24,
                                      y: element.y + 24,
                                    });
                                  }}
                                  className="rounded-full bg-blue-600 p-1 text-white shadow"
                                >
                                  <IoCopy className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </Rnd>
                        ))}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-4 lg:w-72">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-700">
                          Background
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {GRADIENTS.map((gradient) => (
                            <button
                              key={gradient}
                              onClick={() =>
                                handleBackgroundChange({
                                  type: "gradient",
                                  value: gradient,
                                })
                              }
                              className={`h-16 rounded-xl border-2 transition hover:scale-105 ${
                                coverState.background?.value === gradient
                                  ? "border-blue-500"
                                  : "border-transparent"
                              }`}
                              style={{ background: gradient }}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="color"
                            value={
                              coverState.background?.type === "solid"
                                ? coverState.background.value
                                : "#ffffff"
                            }
                            onChange={(event) =>
                              handleBackgroundChange({
                                type: "solid",
                                value: event.target.value,
                              })
                            }
                            className="h-10 w-16 rounded-lg border border-slate-200"
                          />
                          <span className="text-xs text-slate-500">
                            Custom color
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-700">
                          Elements
                        </p>
                        <div className="mt-3 grid gap-2">
                          <button
                            onClick={() =>
                              handleAddElement("text", {
                                text: metadata.title || "Story title",
                              })
                            }
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                          >
                            <span>Heading</span>
                            <IoDocumentText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleAddElement("text", {
                                text: metadata.subtitle || "Subtitle goes here",
                                fontFamily: "Inter",
                                fontWeight: 400,
                              })
                            }
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                          >
                            <span>Subtitle</span>
                            <IoPencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleAddElement("shape", { shape: "rectangle" })
                            }
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                          >
                            <span>Block</span>
                            <IoColorPalette className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => coverImageInputRef.current?.click()}
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                          >
                            <span>Upload image</span>
                            <IoCloudUpload className="h-4 w-4" />
                          </button>
                          <input
                            ref={coverImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (loadEvent) => {
                                handleAddElement("image", {
                                  src: loadEvent.target?.result,
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </div>
                      </div>

                      {selectedElement && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                          <p className="text-sm font-semibold text-blue-700">
                            Element settings
                          </p>
                          {selectedElement.type === "text" && (
                            <div className="mt-3 space-y-3 text-xs text-blue-700">
                              <div>
                                <label className="font-semibold">Text</label>
                                <textarea
                                  value={selectedElement.text}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      text: event.target.value,
                                    })
                                  }
                                  className="mt-1 h-20 w-full rounded-xl border border-blue-200 bg-white px-3 py-2"
                                />
                              </div>
                              <div>
                                <label className="font-semibold">Font</label>
                                <select
                                  value={selectedElement.fontFamily}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      fontFamily: event.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2"
                                >
                                  {COVER_FONTS.map((font) => (
                                    <option key={font} value={font}>
                                      {font}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="color"
                                  value={selectedElement.color}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      color: event.target.value,
                                    })
                                  }
                                  className="h-10 w-full rounded-xl border border-blue-200"
                                />
                                <input
                                  type="range"
                                  min={0}
                                  max={3}
                                  step={0.1}
                                  value={selectedElement.letterSpacing || 0}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      letterSpacing: Number(event.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                          {selectedElement.type === "shape" && (
                            <div className="mt-3 space-y-3 text-xs text-blue-700">
                              <div>
                                <label className="font-semibold">Shape</label>
                                <select
                                  value={selectedElement.shape}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      shape: event.target.value,
                                    })
                                  }
                                  className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2"
                                >
                                  <option value="rectangle">Rectangle</option>
                                  <option value="circle">Circle</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="color"
                                  value={selectedElement.fill}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      fill: event.target.value,
                                    })
                                  }
                                  className="h-10 w-full rounded-xl border border-blue-200"
                                />
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={selectedElement.opacity || 1}
                                  onChange={(event) =>
                                    handleElementChange(selectedElement.id, {
                                      opacity: Number(event.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-5 shadow">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Live preview
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Exported cover will match this preview exactly.
                    </p>
                    <div className="mt-4 flex justify-center">
                      <div
                        className="aspect-[3/4] w-48 rounded-2xl shadow-xl"
                        style={{
                          background:
                            coverState.background?.type === "solid"
                              ? coverState.background.value
                              : coverState.background?.value || GRADIENTS[0],
                        }}
                      >
                        <div className="relative h-full w-full overflow-hidden">
                          {coverState.elements.slice(0, 3).map((element) => (
                            <div
                              key={element.id}
                              className="absolute overflow-hidden"
                              style={{
                                left: `${(element.x / 420) * 100}%`,
                                top: `${(element.y / 560) * 100}%`,
                                width: `${(element.width / 420) * 100}%`,
                                height: `${(element.height / 560) * 100}%`,
                              }}
                            >
                              {element.type === "text" && (
                                <div
                                  className="h-full w-full p-1 text-center text-[10px] font-semibold"
                                  style={{
                                    fontFamily: element.fontFamily,
                                    color: element.color,
                                  }}
                                >
                                  {element.text}
                                </div>
                              )}
                              {element.type === "image" && (
                                <img
                                  src={element.src}
                                  alt="Cover preview"
                                  className="h-full w-full object-cover"
                                />
                              )}
                              {element.type === "shape" && (
                                <div
                                  className="h-full w-full"
                                  style={{
                                    background: element.fill,
                                    borderRadius:
                                      element.shape === "circle"
                                        ? "999px"
                                        : `${element.radius}px`,
                                    opacity: element.opacity,
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-white p-5 shadow">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Publish preview
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      The latest cover snapshot is stored with your project.
                    </p>
                    <button
                      onClick={() => persistProject({ showToast: true })}
                      className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Save cover snapshot
                    </button>
                  </div>
                </div>
              </section>
            )}

            {activePanel === "ai" && (
              <section className="grid gap-4 lg:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
                <div className="rounded-3xl bg-white p-6 shadow">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Generate a creative blueprint
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Describe what you're imagining. We'll suggest narrative
                    angles, cover art, and a punchy tagline.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="A science fantasy tale about a cartographer mapping dreams..."
                    className="mt-4 h-40 w-full rounded-3xl border border-slate-200 px-5 py-4 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={handleGeneratePrompt}
                    disabled={aiGenerating}
                    className="mt-4 flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiGenerating ? "Crafting…" : "Generate"}
                    {!aiGenerating && <IoSparkles className="h-4 w-4" />}
                  </button>

                  {aiResult && (
                    <div className="mt-6 space-y-4">
                      <div className="rounded-3xl border border-purple-200 bg-purple-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-purple-800">
                            Story direction
                          </p>
                          <button
                            onClick={() => applyAiResultToEditor("story")}
                            className="rounded-xl bg-purple-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Add to manuscript
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-purple-700 whitespace-pre-line">
                          {aiResult.storyIdea}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-blue-800">
                            Cover inspiration
                          </p>
                          <button
                            onClick={() => applyAiResultToEditor("cover")}
                            className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Add to notes
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-blue-700 whitespace-pre-line">
                          {aiResult.coverIdea}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-emerald-800">
                            Tagline
                          </p>
                          <button
                            onClick={() => applyAiResultToEditor("tagline")}
                            className="rounded-xl bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                          >
                            Insert at cursor
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-emerald-700">
                          {aiResult.tagline}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-5 shadow">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Prompt history
                    </h3>
                    <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto">
                      {aiHistory.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                          No prompts yet. Your generated ideas will be saved
                          automatically.
                        </p>
                      )}
                      {aiHistory.map((entry) => (
                        <div
                          key={`${entry.prompt}-${entry.createdAt}`}
                          className="rounded-2xl border border-slate-200 p-3"
                        >
                          <p className="text-xs font-semibold text-slate-500">
                            {formatDate(entry.createdAt)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {entry.prompt}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-4">
                            {entry.storyIdea}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activePanel === "publish" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 shadow">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Publishing controls
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Publish privately, share with followers, or release
                    publicly.
                  </p>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-700">
                      <p className="font-semibold">Current visibility</p>
                      <p className="mt-1">
                        {metadata.visibility} · {metadata.status}
                      </p>
                    </div>
                    <button
                      onClick={() => setPublishModalOpen(true)}
                      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Adjust publishing settings
                    </button>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Export & deliverables
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Download high quality PDFs for beta readers or upload to
                    distribution.
                  </p>
                  <div className="mt-5 space-y-3">
                    <button
                      onClick={handleExportPdf}
                      disabled={exporting}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {exporting ? "Exporting…" : "Export print-ready PDF"}
                    </button>
                    <button
                      onClick={() => persistProject({ showToast: true })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      Save project snapshot
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <SavedProjectsModal
        isOpen={savedGalleryOpen}
        projects={galleryProjects}
        page={savedPage}
        totalPages={Math.max(totalSavedPages, 1)}
        activeProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onPrevPage={() => setSavedPage((prev) => Math.max(prev - 1, 0))}
        onNextPage={() =>
          setSavedPage((prev) =>
            Math.min(prev + 1, Math.max(totalSavedPages - 1, 0))
          )
        }
        onClose={() => setSavedGalleryOpen(false)}
      />

      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirm={handlePublish}
        defaultVisibility={metadata.visibility}
        defaultStatus={metadata.status === "published" ? "published" : "draft"}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, projectId: null })}
        onConfirm={handleDeleteProject}
        projectTitle={projectPendingDelete?.title || "Untitled project"}
      />
    </div>
  );
}
