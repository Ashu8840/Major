const { GoogleGenerativeAI } = require("@google/generative-ai");

const {
  fixGrammar,
  translateText,
  improveContent,
  isGeminiOperational,
} = require("../services/gemini");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const GEMINI_OFFLINE_MESSAGE =
  "Gemini service is temporarily unavailable. Using intelligent fallbacks.";

let cachedClient = null;
let cachedModel = null;

const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    if (!cachedClient) {
      cachedClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    if (!cachedModel) {
      cachedModel = cachedClient.getGenerativeModel({ model: GEMINI_MODEL });
    }

    return cachedModel;
  } catch (error) {
    console.error(
      `Failed to initialize Gemini model (${GEMINI_MODEL}):`,
      error.message
    );
    cachedClient = null;
    cachedModel = null;
    return null;
  }
};

const resetGemini = () => {
  cachedClient = null;
  cachedModel = null;
};

const fallbackSummarize = (text) => {
  if (!text) {
    return "No content provided to summarize.";
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 220) {
    return cleaned;
  }

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const preview = sentences.slice(0, 2).join(" ") || cleaned.slice(0, 200);
  return `${preview.trim()}…`;
};

const POSITIVE_WORDS = [
  "happy",
  "joy",
  "love",
  "excited",
  "grateful",
  "proud",
  "calm",
  "motivated",
  "optimistic",
  "peaceful",
  "hopeful",
];

const NEGATIVE_WORDS = [
  "sad",
  "angry",
  "upset",
  "worried",
  "tired",
  "frustrated",
  "anxious",
  "stressed",
  "lonely",
  "fear",
  "guilty",
];

const fallbackSentiment = (text) => {
  if (!text) {
    return { label: "neutral", score: 0 };
  }

  const tokens = text.toLowerCase().match(/[a-zA-Z']+/g);

  if (!tokens || tokens.length === 0) {
    return { label: "neutral", score: 0 };
  }

  let score = 0;

  tokens.forEach((word) => {
    if (POSITIVE_WORDS.includes(word)) {
      score += 1;
    }
    if (NEGATIVE_WORDS.includes(word)) {
      score -= 1;
    }
  });

  if (score > 1) {
    return { label: "positive", score };
  }
  if (score < -1) {
    return { label: "negative", score };
  }
  return { label: "neutral", score };
};

const DAILY_PROMPT_FALLBACKS = [
  "Write about a moment today that surprised you. What did it teach you?",
  "Describe a place you go to feel calm. What details make it special?",
  "List three things you’re grateful for this week and why they matter.",
  "Recall a conversation that stayed with you. What emotions did it evoke?",
  "Write a letter to your future self about what you’re currently learning.",
  "Capture the soundtrack of your day. Which sounds defined it?",
  "Describe a small win you had today and how it changed your perspective.",
];

const getFallbackPrompt = () => {
  const index = Math.floor(Math.random() * DAILY_PROMPT_FALLBACKS.length);
  return DAILY_PROMPT_FALLBACKS[index];
};

const summarizeEntry = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Text is required" });
  }

  const fallback = fallbackSummarize(text);
  const model = getGeminiModel();

  if (!model) {
    return res.status(200).json({
      summary: fallback,
      usingFallback: true,
      message: GEMINI_OFFLINE_MESSAGE,
    });
  }

  try {
    const prompt = `Summarize this diary entry (max 4 sentences) and preserve the author’s tone. Entry: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    if (!summary) {
      throw new Error("Empty response from Gemini");
    }

    res.json({
      summary,
      usingFallback: false,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error("Gemini summary error:", error.message);
    resetGemini();
    res.status(200).json({
      summary: fallback,
      usingFallback: true,
      message: GEMINI_OFFLINE_MESSAGE,
      error: error.message,
    });
  }
};

const analyzeSentiment = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Text is required" });
  }

  const fallback = fallbackSentiment(text);
  const model = getGeminiModel();

  if (!model) {
    return res.status(200).json({
      sentiment: fallback.label,
      score: fallback.score,
      usingFallback: true,
      message: GEMINI_OFFLINE_MESSAGE,
    });
  }

  try {
    const prompt = `Analyze the sentiment of the following text and respond with a JSON object that includes a 'sentiment' property (positive, neutral, or negative) and a 'score' between -1 and 1.

Text: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text().trim();

    let normalized = raw;
    let parsed;

    try {
      const jsonCandidate = raw.replace(/```json|```/g, "");
      parsed = JSON.parse(jsonCandidate);
    } catch (parseError) {
      normalized = raw.toLowerCase();
    }

    const sentimentCandidates = [
      parsed?.sentiment?.toLowerCase(),
      normalized?.includes("positive") ? "positive" : null,
      normalized?.includes("negative") ? "negative" : null,
      normalized?.includes("neutral") ? "neutral" : null,
      fallback.label,
    ].filter(Boolean);

    const sentiment = sentimentCandidates.find(Boolean) || fallback.label;

    const boundedScore = parsed?.score;

    res.json({
      sentiment,
      score:
        typeof boundedScore === "number"
          ? Math.max(-1, Math.min(1, boundedScore))
          : fallback.score,
      usingFallback: false,
      model: GEMINI_MODEL,
      rawResponse: raw,
    });
  } catch (error) {
    console.error("Gemini sentiment error:", error.message);
    resetGemini();
    res.status(200).json({
      sentiment: fallback.label,
      score: fallback.score,
      usingFallback: true,
      message: GEMINI_OFFLINE_MESSAGE,
      error: error.message,
    });
  }
};

const getDailyPrompt = async (req, res) => {
  const model = getGeminiModel();

  if (!model) {
    return res.status(200).json({
      dailyPrompt: getFallbackPrompt(),
      usingFallback: true,
      message: GEMINI_OFFLINE_MESSAGE,
    });
  }

  try {
    const prompt =
      "Provide a unique, inspiring writing prompt suitable for a personal journal. Keep it under 40 words.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const dailyPrompt = response.text().trim();

    if (!dailyPrompt) {
      throw new Error("Empty prompt from Gemini");
    }

    res.json({
      dailyPrompt,
      usingFallback: false,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error("Gemini prompt error:", error.message);
    resetGemini();
    res.status(200).json({
      dailyPrompt: getFallbackPrompt(),
      usingFallback: true,
      message: GEMINI_OFFLINE_MESSAGE,
      error: error.message,
    });
  }
};

// Fix grammar and spelling
const fixTextGrammar = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    console.log("Fixing grammar for text:", text);
    const correctedText = await fixGrammar(text);
    const isFallback = !isGeminiOperational();

    res.json({
      originalText: text,
      correctedText: correctedText,
      usingFallback: isFallback,
      message: isFallback
        ? "Basic grammar corrections applied (AI service temporarily unavailable)"
        : "Grammar corrected using AI",
    });
  } catch (error) {
    console.error("Grammar fix error:", error);
    res.status(500).json({ message: "Failed to fix grammar" });
  }
};

// Translate text to specified language
const translateUserText = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    if (!targetLanguage || !targetLanguage.trim()) {
      return res.status(400).json({ message: "Target language is required" });
    }

    console.log(`Translating text "${text}" to ${targetLanguage}`);
    const translatedText = await translateText(text, targetLanguage);
    const isFallback = !isGeminiOperational();

    res.json({
      originalText: text,
      translatedText: translatedText,
      targetLanguage: targetLanguage,
      usingFallback: isFallback,
      message: isFallback
        ? `Basic translation to ${targetLanguage} (AI service temporarily unavailable)`
        : `Translated to ${targetLanguage} using AI`,
    });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ message: "Failed to translate text" });
  }
};

// Improve and expand content
const improveTextContent = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    console.log("Improving content for text:", text);
    const improvedText = await improveContent(text);
    const isFallback = !isGeminiOperational();

    res.json({
      originalText: text,
      improvedText: improvedText,
      usingFallback: isFallback,
      message: isFallback
        ? "Content enhanced with basic improvements (AI service temporarily unavailable)"
        : "Content improved using AI",
    });
  } catch (error) {
    console.error("Content improvement error:", error);
    res.status(500).json({ message: "Failed to improve content" });
  }
};

module.exports = {
  summarizeEntry,
  analyzeSentiment,
  getDailyPrompt,
  fixTextGrammar,
  translateUserText,
  improveTextContent,
};
