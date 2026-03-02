const OpenAI = require("openai");

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// Groq client (OpenAI-compatible)
let client = null;
let isOperational = false;

const ensureClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }
  try {
    if (!client) {
      client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
      isOperational = true;
      console.log(`Groq client ready (model: ${GROQ_MODEL})`);
    }
    return client;
  } catch (error) {
    console.error("Failed to initialize Groq client:", error.message);
    client = null;
    isOperational = false;
    return null;
  }
};

try {
  if (!process.env.GROQ_API_KEY) {
    console.warn(
      "GROQ_API_KEY not found. AI features will use fallback methods.",
    );
  } else {
    ensureClient();
  }
} catch (error) {
  console.error("Failed to initialize Groq AI:", error.message);
  console.log("AI features will use fallback methods.");
  client = null;
  isOperational = false;
}

// Fallback text processing functions
const fallbackFixGrammar = (text) => {
  // Basic grammar fixes
  return text
    .replace(/\bi\b/g, "I") // Fix lowercase 'i'
    .replace(/\b(\w+)ing\b/g, "$1ing") // Basic ing forms
    .replace(/\s+/g, " ") // Fix multiple spaces
    .replace(/([.!?])\s*([a-z])/g, "$1 $2".toUpperCase()) // Capitalize after punctuation
    .trim();
};

const fallbackTranslate = (text, targetLanguage) => {
  // Basic translations for common languages
  const basicTranslations = {
    spanish: {
      hello: "hola",
      good: "bueno",
      day: "día",
      today: "hoy",
      happy: "feliz",
      sad: "triste",
      love: "amor",
      life: "vida",
    },
    french: {
      hello: "bonjour",
      good: "bon",
      day: "jour",
      today: "aujourd'hui",
      happy: "heureux",
      sad: "triste",
      love: "amour",
      life: "vie",
    },
    hindi: {
      hello: "नमस्ते",
      good: "अच्छा",
      day: "दिन",
      today: "आज",
      happy: "खुश",
      sad: "उदास",
      love: "प्यार",
      life: "जीवन",
    },
  };

  const lang = targetLanguage.toLowerCase();
  if (basicTranslations[lang]) {
    let translated = text;
    Object.entries(basicTranslations[lang]).forEach(([english, foreign]) => {
      const regex = new RegExp(`\\b${english}\\b`, "gi");
      translated = translated.replace(regex, foreign);
    });
    return translated;
  }

  return `[Translation to ${targetLanguage}]: ${text}`;
};

const fallbackImproveContent = (text) => {
  const words = text.trim().split(" ");
  if (words.length < 5) {
    return `${text}. This experience has been truly meaningful and has brought valuable insights into my daily life. The emotions and thoughts surrounding this moment are worth reflecting upon, as they contribute to my personal growth and understanding of myself. Such moments remind me of the beauty and complexity of human experience.`;
  }

  // Add descriptive words and expand
  return (
    text
      .replace(/good/gi, "wonderful and fulfilling")
      .replace(/bad/gi, "challenging yet enlightening")
      .replace(/happy/gi, "joyful and content")
      .replace(/sad/gi, "reflective and introspective") +
    ". This experience has given me much to contemplate and has enriched my understanding of life's intricate tapestry."
  );
};

// Shared Groq chat helper
const callGroq = async (prompt) => {
  const groqClient = ensureClient();
  if (!groqClient) return null;
  const completion = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content?.trim() || null;
};

const fixGrammar = async (text) => {
  try {
    const groqClient = ensureClient();
    if (!groqClient) {
      console.log("Groq API not available, using fallback grammar fix...");
      return fallbackFixGrammar(text);
    }
    console.log("Attempting Groq API for grammar fix...");
    const prompt = `Please fix the grammar, spelling, and punctuation in the following text. Only return the corrected text, nothing else:\n\n"${text}"`;
    const result = await callGroq(prompt);
    if (!result) return fallbackFixGrammar(text);
    console.log("Groq grammar fix successful");
    isOperational = true;
    return result;
  } catch (error) {
    console.error("Groq grammar fix failed:", error.message);
    client = null;
    isOperational = false;
    return fallbackFixGrammar(text);
  }
};

const translateText = async (text, targetLanguage) => {
  try {
    const groqClient = ensureClient();
    if (!groqClient) {
      console.log("Groq API not available, using fallback translation...");
      return fallbackTranslate(text, targetLanguage);
    }
    console.log(`Attempting Groq API for translation to ${targetLanguage}...`);
    const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else:\n\n"${text}"`;
    const result = await callGroq(prompt);
    if (!result) return fallbackTranslate(text, targetLanguage);
    console.log(`Groq translation to ${targetLanguage} successful`);
    isOperational = true;
    return result;
  } catch (error) {
    console.error("Groq translation failed:", error.message);
    client = null;
    isOperational = false;
    return fallbackTranslate(text, targetLanguage);
  }
};

const improveContent = async (text) => {
  try {
    const groqClient = ensureClient();
    if (!groqClient) {
      console.log(
        "Groq API not available, using fallback content improvement...",
      );
      return fallbackImproveContent(text);
    }
    console.log("Attempting Groq API for content improvement...");
    const prompt = `Please expand and improve the following text. Make it more detailed, engaging, and well-written while maintaining the original meaning and tone. Aim for 3-4 times the original length with better vocabulary and flow:\n\n"${text}"`;
    const result = await callGroq(prompt);
    if (!result) return fallbackImproveContent(text);
    console.log("Groq content improvement successful");
    isOperational = true;
    return result;
  } catch (error) {
    console.error("Groq content improvement failed:", error.message);
    client = null;
    isOperational = false;
    return fallbackImproveContent(text);
  }
};

module.exports = {
  fixGrammar,
  translateText,
  improveContent,
  isGeminiOperational: () => isOperational,
};
