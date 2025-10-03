const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI with error handling
let genAI, model;

try {
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "GEMINI_API_KEY not found. AI features will use fallback methods."
    );
  } else {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Gemini AI initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize Gemini AI:", error.message);
  console.log("AI features will use fallback methods.");
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

const fixGrammar = async (text) => {
  try {
    if (!model) {
      console.log("Gemini API not available, using fallback grammar fix...");
      return fallbackFixGrammar(text);
    }

    console.log("Attempting Gemini API for grammar fix...");

    const prompt = `Please fix the grammar, spelling, and punctuation in the following text. Only return the corrected text, nothing else:

"${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const correctedText = response.text().trim();

    console.log("Gemini API grammar fix successful");
    return correctedText;
  } catch (error) {
    console.error("Gemini API grammar fix failed:", error.message);
    console.log("Using fallback grammar fix...");
    return fallbackFixGrammar(text);
  }
};

const translateText = async (text, targetLanguage) => {
  try {
    if (!model) {
      console.log("Gemini API not available, using fallback translation...");
      return fallbackTranslate(text, targetLanguage);
    }

    console.log(
      `Attempting Gemini API for translation to ${targetLanguage}...`
    );

    const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else:

"${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();

    console.log("Gemini API translation successful");
    return translatedText;
  } catch (error) {
    console.error("Gemini API translation failed:", error.message);
    console.log(`Using fallback translation to ${targetLanguage}...`);
    return fallbackTranslate(text, targetLanguage);
  }
};

const improveContent = async (text) => {
  try {
    if (!model) {
      console.log(
        "Gemini API not available, using fallback content improvement..."
      );
      return fallbackImproveContent(text);
    }

    console.log("Attempting Gemini API for content improvement...");

    const prompt = `Please expand and improve the following text. Make it more detailed, engaging, and well-written while maintaining the original meaning and tone. Aim for 3-4 times the original length with better vocabulary and flow:

"${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvedText = response.text().trim();

    console.log("Gemini API content improvement successful");
    return improvedText;
  } catch (error) {
    console.error("Gemini API content improvement failed:", error.message);
    console.log("Using fallback content improvement...");
    return fallbackImproveContent(text);
  }
};

module.exports = {
  fixGrammar,
  translateText,
  improveContent,
};
