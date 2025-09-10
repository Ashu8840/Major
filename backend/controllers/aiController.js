const { GoogleGenerativeAI } = require("@google/generative-ai");

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

module.exports = { summarizeEntry, analyzeSentiment, getDailyPrompt };
