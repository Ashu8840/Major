const { GoogleGenerativeAI } = require("@google/generative-ai");
const CreatorProject = require("../models/CreatorProject");
const User = require("../models/User");

let aiModel = null;

const ensureAiModel = () => {
  if (aiModel || !process.env.GEMINI_API_KEY) {
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (error) {
    console.error("CreatorStudio AI initialisation failed:", error.message);
    aiModel = null;
  }
};

const htmlToPlainText = (html = "") =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const buildPalette = (design) => {
  if (!design || typeof design !== "object") return [];

  const colors = new Set();
  const collect = (value) => {
    if (!value) return;
    if (typeof value === "string" && /^#([0-9A-F]{3}){1,2}$/i.test(value)) {
      colors.add(value.toLowerCase());
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  };

  collect(design);
  return Array.from(colors).slice(0, 8);
};

const formatProjectResponse = (project) => {
  if (!project) return project;
  const json = project.toJSON ? project.toJSON() : project;
  return json;
};

const fallbackPromptResult = (prompt) => {
  const trimmedPrompt = prompt.trim();
  return {
    storyIdea: `A captivating narrative inspired by "${trimmedPrompt}". Follow a relatable protagonist as they face a defining moment, uncovering deep emotions and unexpected revelations. The story blends vivid imagery with heartfelt introspection to keep readers engaged from the opening line to the closing reflection.`,
    coverIdea: `Design a modern cover with a calming gradient in sapphire blue and ivory. Place a bold typographic title at the top, add a subtle illustrative motif related to "${trimmedPrompt}", and frame it with minimal geometric accents for a polished look.`,
    tagline: `Discover a journey shaped by ${trimmedPrompt.toLowerCase() || "unexpected inspiration"}.`,
  };
};

const generatePromptIdeas = async (prompt) => {
  ensureAiModel();

  if (!aiModel) {
    return fallbackPromptResult(prompt);
  }

  try {
    const response = await aiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a creative writing assistant helping an author craft a book based on the following idea: "${prompt}".
Return a JSON object with three properties: storyIdea, coverIdea, tagline.
- storyIdea: 3-4 sentences describing the core narrative, protagonist arc, tone, and recommended structure.
- coverIdea: 2 sentences describing a visually appealing book cover concept with style, colors and focal imagery.
- tagline: A single sentence hook of fewer than 80 characters.
Use double quotes for all JSON strings and do not include markdown or explanations.`,
            },
          ],
        },
      ],
      safetySettings: [],
    });

    const [{ text }] = response.response.candidates[0].content.parts;
    try {
      const parsed = JSON.parse(text);
      return {
        storyIdea: parsed.storyIdea?.trim() || fallbackPromptResult(prompt).storyIdea,
        coverIdea: parsed.coverIdea?.trim() || fallbackPromptResult(prompt).coverIdea,
        tagline: parsed.tagline?.trim() || fallbackPromptResult(prompt).tagline,
      };
    } catch (jsonError) {
      console.warn("Failed to parse AI JSON response, using fallback:", jsonError.message);
      return fallbackPromptResult(prompt);
    }
  } catch (error) {
    console.error("AI prompt generation failed:", error.message);
    return fallbackPromptResult(prompt);
  }
};

const listProjects = async (req, res) => {
  try {
    const projects = await CreatorProject.find({ author: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(projects.map(formatProjectResponse));
  } catch (error) {
    console.error("Failed to fetch creator projects:", error);
    res.status(500).json({ message: "Unable to load creator projects" });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await CreatorProject.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(formatProjectResponse(project));
  } catch (error) {
    console.error("Failed to fetch project:", error);
    res.status(500).json({ message: "Unable to load project" });
  }
};

const createProject = async (req, res) => {
  try {
    const { title, subtitle, content = "", category, tags = [], coverDesign, coverImage, settings, visibility, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const plainText = htmlToPlainText(content);
    const palette = buildPalette(coverDesign);

    const project = await CreatorProject.create({
      author: req.user._id,
      title: title.trim(),
      subtitle: subtitle?.trim() || "",
      content,
      plainText,
      category: category?.trim() || "general",
      tags,
      coverDesign: coverDesign || null,
      coverImage: coverImage
        ? {
            dataUrl: coverImage.dataUrl || null,
            palette: coverImage.palette || palette,
          }
        : { dataUrl: null, palette },
      settings: {
        allowDownloads: settings?.allowDownloads ?? true,
        allowComments: settings?.allowComments ?? true,
      },
      visibility: visibility || "private",
      status: status || "draft",
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { creatorProjects: project._id },
    });

    res.status(201).json(formatProjectResponse(project));
  } catch (error) {
    console.error("Failed to create project:", error);
    res.status(500).json({ message: "Unable to create project" });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await CreatorProject.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const {
      title,
      subtitle,
      content,
      category,
      tags,
      coverDesign,
      coverImage,
      settings,
      visibility,
      status,
      promptHistory,
    } = req.body;

    if (title !== undefined) project.title = title?.trim() || project.title;
    if (subtitle !== undefined) project.subtitle = subtitle?.trim() || "";
    if (category !== undefined) project.category = category?.trim() || "general";
    if (Array.isArray(tags)) project.tags = tags;
    if (content !== undefined) {
      project.content = content;
      project.plainText = htmlToPlainText(content);
    }
    if (coverDesign !== undefined) {
      project.coverDesign = coverDesign;
      if (coverImage?.palette) {
        project.coverImage.palette = coverImage.palette;
      } else {
        project.coverImage.palette = buildPalette(coverDesign);
      }
    }
    if (coverImage?.dataUrl !== undefined) {
      project.coverImage.dataUrl = coverImage.dataUrl;
    }
    if (settings) {
      project.settings = {
        allowDownloads: settings.allowDownloads ?? project.settings.allowDownloads,
        allowComments: settings.allowComments ?? project.settings.allowComments,
      };
    }
    if (visibility) project.visibility = visibility;
    if (status) project.status = status;
    if (Array.isArray(promptHistory)) project.promptHistory = promptHistory.slice(0, 20);

    await project.save();

    res.json(formatProjectResponse(project));
  } catch (error) {
    console.error("Failed to update project:", error);
    res.status(500).json({ message: "Unable to update project" });
  }
};

const publishProject = async (req, res) => {
  try {
    const project = await CreatorProject.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const { visibility = "public", status = "published" } = req.body;

    project.visibility = visibility;
    project.status = status === "published" ? "published" : status;

    if (project.status === "published") {
      project.publishedAt = new Date();
    }

    await project.save();

    res.json(formatProjectResponse(project));
  } catch (error) {
    console.error("Failed to publish project:", error);
    res.status(500).json({ message: "Unable to update publishing status" });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await CreatorProject.findOneAndDelete({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { creatorProjects: project._id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    res.status(500).json({ message: "Unable to delete project" });
  }
};

const markExported = async (req, res) => {
  try {
    const project = await CreatorProject.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.lastExportedAt = new Date();
    project.settings.allowDownloads = true;

    await project.save();

    res.json(formatProjectResponse(project));
  } catch (error) {
    console.error("Failed to mark project exported:", error);
    res.status(500).json({ message: "Unable to update export status" });
  }
};

const generateProjectPrompt = async (req, res) => {
  try {
    const project = await CreatorProject.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const generated = await generatePromptIdeas(prompt);

    project.promptHistory.unshift({
      prompt: prompt.trim(),
      storyIdea: generated.storyIdea,
      coverIdea: generated.coverIdea,
      tagline: generated.tagline,
    });
    project.promptHistory = project.promptHistory.slice(0, 20);

    await project.save();

    res.json({
      ...generated,
      prompt: prompt.trim(),
      history: project.promptHistory,
    });
  } catch (error) {
    console.error("Failed to generate project prompt:", error);
    res.status(500).json({ message: "Unable to generate prompt" });
  }
};

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  publishProject,
  deleteProject,
  markExported,
  generateProjectPrompt,
};
