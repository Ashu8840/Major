import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { 
  IoCloudUpload, 
  IoSave, 
  IoDocument, 
  IoSparkles, 
  IoImage, 
  IoPricetag as IoTag, 
  IoHeart, 
  IoArrowBack,
  IoCheckmark,
  IoCloseOutline as IoClose,
  IoRefresh,
  IoLanguage,
  IoDocumentText as IoText
} from "react-icons/io5";

export default function NewEntry() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newMood, setNewMood] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const [isAIHelperOpen, setIsAIHelperOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);

  const addEntry = async (e, saveAsDraft = false) => {
    if (e) e.preventDefault();
    
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Please fill in both title and content");
      return;
    }

    try {
      // Prepare form data for file upload
      const formData = new FormData();
      formData.append("title", newTitle);
      formData.append("content", newContent);
      if (newTags) formData.append("tags", newTags);
      if (newMood) formData.append("mood", newMood);
      formData.append("isDraft", saveAsDraft.toString());
      
      // Handle multiple images
      selectedImages.forEach((image, index) => {
        formData.append(`images`, image);
      });

      const { data } = await api.post("/entries", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Show success message
      const message = saveAsDraft ? "Draft saved successfully!" : "Entry published successfully!";
      alert(message);
      
      // Redirect to diary page after successful save
      navigate("/diary");
    } catch (error) {
      console.error("Failed to add entry:", error);
      alert("Failed to save entry. Please try again.");
    }
  };

  const handleCancel = () => {
    const hasContent = newTitle.trim() || newContent.trim();
    if (hasContent) {
      const shouldLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!shouldLeave) return;
    }
    navigate("/diary");
  };

  const handleContentChange = (content) => {
    setNewContent(content);
    setWordCount(content.trim().split(/\s+/).filter(word => word.length > 0).length);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIHelper = async (action) => {
    if (!newContent.trim()) {
      alert("Please write some content first");
      return;
    }

    setIsProcessingAI(true);
    try {
      // Simulate AI processing (replace with actual AI API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let suggestion = "";
      switch (action) {
        case "grammar":
          suggestion = "Grammar has been improved! Here are the suggested corrections...";
          break;
        case "translate":
          suggestion = "Translation completed! Here's your content in the selected language...";
          break;
        case "improve":
          suggestion = "Here are some suggestions to enhance your writing...";
          break;
        default:
          suggestion = "AI processing completed!";
      }
      
      setAiSuggestion(suggestion);
      setIsAIHelperOpen(true);
    } catch (error) {
      alert("AI helper is currently unavailable. Please try again later.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const applyAISuggestion = () => {
    // In a real implementation, this would apply the AI suggestion to the content
    setNewContent(prev => prev + "\n\n[AI suggestion applied]");
    setIsAIHelperOpen(false);
    setAiSuggestion("");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200">
          <IoHeart className="w-16 h-16 mx-auto mb-4 text-blue-300" />
          <p className="text-blue-600 text-lg">Please log in to create entries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Notebook Paper Background */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 31px,
            #e2e8f0 31px,
            #e2e8f0 32px
          )`
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <IoArrowBack className="w-5 h-5" />
              Back to Diary
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-blue-600">Words: {wordCount}</div>
                <div className="text-xs text-blue-400">
                  {Math.ceil(wordCount / 200)} min read
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-900 mb-3">
              Create New Entry
            </h1>
            <p className="text-blue-600 text-lg">
              Your safe space to express thoughts, feelings, and memories
            </p>
          </div>
        </div>

        {/* Main Entry Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-blue-200 shadow-2xl shadow-blue-100/50 overflow-hidden">
          {/* Notebook Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IoDocument className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Private Entry</h3>
                  <p className="text-sm text-blue-600">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAIHelperOpen(true)}
                  disabled={isProcessingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                >
                  <IoSparkles className="w-4 h-4" />
                  AI Helper
                  {isProcessingAI && <IoRefresh className="w-4 h-4 animate-spin" />}
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => addEntry(e, false)} className="p-8">
            {/* Entry Title */}
            <div className="mb-8">
              <input
                type="text"
                placeholder="What's on your mind today?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full text-3xl font-bold text-blue-900 bg-transparent border-none outline-none placeholder-blue-300 font-serif"
                style={{ 
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 47px,
                    #e2e8f0 47px,
                    #e2e8f0 48px
                  )`
                }}
              />
            </div>

            {/* Content Area */}
            <div className="mb-8">
              <textarea
                placeholder="Pour your heart out... Your thoughts are safe here."
                value={newContent}
                onChange={(e) => handleContentChange(e.target.value)}
                required
                rows={15}
                className="w-full text-lg text-blue-900 bg-transparent border-none outline-none placeholder-blue-300 leading-8 font-serif resize-none"
                style={{ 
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 31px,
                    #e2e8f0 31px,
                    #e2e8f0 32px
                  )`
                }}
              />
            </div>

            {/* Media Upload Section */}
            <div className="mb-8">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                <IoImage className="w-5 h-5" />
                Capture the Moment
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
                  <label className="flex flex-col items-center gap-3 cursor-pointer">
                    <IoCloudUpload className="w-8 h-8 text-blue-400" />
                    <div className="text-center">
                      <span className="font-medium text-blue-700">Upload Images</span>
                      <p className="text-sm text-blue-500 mt-1">
                        Add photos to your memory
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <IoImage className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium truncate">
                            {image.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <IoClose className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags Section */}
            <div className="mb-8">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                <IoTag className="w-5 h-5" />
                Tags & Labels
              </h4>
              <input
                type="text"
                placeholder="Add tags separated by commas (e.g., reflection, gratitude, dreams)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="w-full px-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
              />
            </div>

            {/* Mood Selector */}
            <div className="mb-8">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-6">
                <IoHeart className="w-5 h-5" />
                How are you feeling?
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4">
                {[
                  { emoji: "😊", value: "happy", label: "Happy" },
                  { emoji: "😐", value: "neutral", label: "Neutral" },
                  { emoji: "😕", value: "sad", label: "Sad" },
                  { emoji: "😤", value: "angry", label: "Angry" },
                  { emoji: "😢", value: "crying", label: "Crying" },
                  { emoji: "🤩", value: "excited", label: "Excited" },
                  { emoji: "😌", value: "calm", label: "Calm" },
                  { emoji: "😰", value: "anxious", label: "Anxious" },
                  { emoji: "🙏", value: "grateful", label: "Grateful" },
                  { emoji: "❤️", value: "love", label: "Love" },
                ].map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setNewMood(mood.value)}
                    className={`flex flex-col items-center p-4 rounded-2xl transition-all transform hover:scale-105 ${
                      newMood === mood.value
                        ? "bg-blue-100 scale-110 shadow-lg border-2 border-blue-300 ring-2 ring-blue-200"
                        : "bg-white/70 hover:bg-white hover:shadow-md border-2 border-blue-100"
                    }`}
                  >
                    <span className="text-3xl mb-2">{mood.emoji}</span>
                    <span className="text-xs font-medium text-blue-700 text-center">
                      {mood.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-blue-100">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                <IoClose className="w-5 h-5" />
                Cancel
              </button>
              
              <button
                type="button"
                onClick={(e) => addEntry(e, true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-colors"
              >
                <IoDocument className="w-5 h-5" />
                Save Draft
              </button>
              
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <IoSave className="w-5 h-5" />
                Publish Entry
              </button>
            </div>
          </form>
        </div>

        {/* AI Helper Modal */}
        {isAIHelperOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IoSparkles className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold text-blue-900">AI Writing Helper</h3>
                </div>
                <button
                  onClick={() => setIsAIHelperOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <IoClose className="w-5 h-5" />
                </button>
              </div>

              <p className="text-blue-600 mb-6">
                Enhance your writing with AI assistance
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleAIHelper('grammar')}
                  disabled={isProcessingAI}
                  className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  <IoCheckmark className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Fix Grammar</div>
                    <div className="text-sm opacity-80">Correct spelling and grammar</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAIHelper('translate')}
                  disabled={isProcessingAI}
                  className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  <IoLanguage className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Translate</div>
                    <div className="text-sm opacity-80">Translate to another language</div>
                  </div>
                </button>

                <button
                  onClick={() => handleAIHelper('improve')}
                  disabled={isProcessingAI}
                  className="w-full flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  <IoText className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Suggest Improvements</div>
                    <div className="text-sm opacity-80">Enhance clarity and flow</div>
                  </div>
                </button>
              </div>

              {aiSuggestion && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-blue-900 mb-3">{aiSuggestion}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={applyAISuggestion}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setAiSuggestion("")}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
