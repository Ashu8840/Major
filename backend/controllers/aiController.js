const { GoogleGenerativeAI } = require("@google/generative-ai");

const {
  fixGrammar,
  translateText,
  improveContent,
} = require("../services/gemini");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const summarizeEntry = async (req, res) => {
  const { text } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Summarize this diary entry in a few sentences: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();
    res.json({ summary });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error summarizing text", error: error.message });
  }
};

const analyzeSentiment = async (req, res) => {
  const { text } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analyze the sentiment of this text and return one word (e.g., happy, sad, angry, neutral): "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const sentiment = response.text();
    res.json({ sentiment });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error analyzing sentiment", error: error.message });
  }
};

const getDailyPrompt = async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Give me a creative writing prompt for a diary entry.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const dailyPrompt = response.text();
    res.json({ dailyPrompt });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error generating prompt", error: error.message });
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

    // Check if it's a fallback result (basic grammar fixes)
    const isFallback =
      correctedText === text.replace(/\bi\b/g, "I").replace(/\s+/g, " ").trim();

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

    // Check if it's a fallback result
    const isFallback = translatedText.startsWith("[Translation to");

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

    // Check if it's a fallback result
    const isFallback = improvedText.includes(
      "This experience has given me much to contemplate"
    );

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
