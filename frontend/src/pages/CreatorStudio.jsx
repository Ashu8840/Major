import { useState, useContext, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import {
  IoCreate,
  IoImage,
  IoCloudUpload,
  IoDocumentText as IoText,
  IoSave,
  IoEye,
  IoSparkles,
  IoLanguage,
  IoCheckmarkCircle,
  IoBrush,
  IoDownload,
  IoAdd,
  IoChevronDown,
  IoChevronUp,
  IoTrash,
} from "react-icons/io5";

export default function CreatorStudio() {
  const { user } = useContext(AuthContext);

  // Accordion section states (only one can be open at a time)
  const [activeSection, setActiveSection] = useState("write");

  // General states
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [coverElements, setCoverElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Rich editor states
  const [editorContent, setEditorContent] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [grammarSuggestions, setGrammarSuggestions] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedStory, setGeneratedStory] = useState("");

  // Cover editor states
  const [canvasBackground, setCanvasBackground] = useState("#ffffff");
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [textColor, setTextColor] = useState("#1e40af");
  const [drawingTool, setDrawingTool] = useState("pen");
  const [brushSize, setBrushSize] = useState(5);
  const [drawingColor, setDrawingColor] = useState("#000000");

  // Mock data
  const coverTemplates = [
    {
      id: 1,
      name: "Minimalist",
      preview: "🎨",
      description: "Clean and simple design",
    },
    {
      id: 2,
      name: "Nature",
      preview: "🌿",
      description: "Forest and nature theme",
    },
    {
      id: 3,
      name: "Cyberpunk",
      preview: "⚡",
      description: "Futuristic neon style",
    },
    {
      id: 4,
      name: "Romance",
      preview: "💕",
      description: "Romantic and elegant",
    },
    {
      id: 5,
      name: "Adventure",
      preview: "🗺️",
      description: "Explorer and journey theme",
    },
    {
      id: 6,
      name: "Abstract",
      preview: "🌈",
      description: "Colorful abstract patterns",
    },
  ];

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
  ];

  // Section management - only one section open at a time
  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newElement = {
            id: Date.now() + Math.random(),
            type: "image",
            src: event.target.result,
            x: e.nativeEvent.offsetX || 50,
            y: e.nativeEvent.offsetY || 50,
            width: 200,
            height: 200,
          };
          setCoverElements((prev) => [...prev, newElement]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newElement = {
          id: Date.now(),
          type: "image",
          src: e.target.result,
          x: 50,
          y: 50,
          width: 200,
          height: 200,
        };
        setCoverElements([...coverElements, newElement]);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTextElement = () => {
    const newElement = {
      id: Date.now(),
      type: "text",
      content: "Your Title Here",
      x: 100,
      y: 100,
      fontSize: 24,
      color: textColor,
      fontFamily: selectedFont,
    };
    setCoverElements([...coverElements, newElement]);
  };

  const deleteElement = (elementId) => {
    setCoverElements((prev) => prev.filter((el) => el.id !== elementId));
    setSelectedElement(null);
  };

  const duplicateElement = (element) => {
    const newElement = {
      ...element,
      id: Date.now(),
      x: element.x + 20,
      y: element.y + 20,
    };
    setCoverElements((prev) => [...prev, newElement]);
  };

  const handleAIPrompt = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratedImage("🎨 Generated artwork based on your prompt");
    setGeneratedStory(
      `Here's a story starter based on "${aiPrompt}": In a world where creativity knows no bounds, your journey begins...`
    );
  };

  const handleGrammarCheck = () => {
    setGrammarSuggestions([
      { text: "Consider using 'However' instead of 'But'", position: 45 },
      { text: "Check spelling: 'recieve' should be 'receive'", position: 120 },
    ]);
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      toast.success(
        `Content translated to ${
          languages.find((l) => l.code === selectedLanguage)?.name
        }`
      );
    }, 2000);
  };

  // Text formatting functions
  const applyFormat = (format) => {
    document.execCommand(format, false, null);
  };

  const insertList = (type) => {
    document.execCommand(
      type === "ordered" ? "insertOrderedList" : "insertUnorderedList",
      false,
      null
    );
  };

  const changeTextColor = (color) => {
    document.execCommand("foreColor", false, color);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      document.execCommand("createLink", false, url);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">
          Please log in to access Creator's Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <IoCreate className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-900">
              Creator's Studio
            </h1>
          </div>
          <p className="text-blue-600">
            Design covers, write stories, and bring your creativity to life
          </p>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* Writing Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => toggleSection("write")}
              className="w-full flex items-center justify-between p-6 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <IoCreate className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-blue-900">
                    ✍️ Rich Text Editor
                  </h3>
                  <p className="text-blue-600">
                    Write with advanced formatting and AI assistance
                  </p>
                </div>
              </div>
              {activeSection === "write" ? (
                <IoChevronUp className="w-5 h-5 text-blue-600" />
              ) : (
                <IoChevronDown className="w-5 h-5 text-blue-600" />
              )}
            </button>

            {activeSection === "write" && (
              <div className="p-6 border-t border-blue-100">
                <div className="grid lg:grid-cols-4 gap-6">
                  {/* Writing Tools */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">
                        AI Assistant
                      </h4>
                      <div className="space-y-3">
                        <button
                          onClick={handleGrammarCheck}
                          className="w-full flex items-center space-x-2 p-2 bg-white hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                        >
                          <IoCheckmarkCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Grammar Check</span>
                        </button>

                        <div className="flex space-x-2">
                          <select
                            value={selectedLanguage}
                            onChange={(e) =>
                              setSelectedLanguage(e.target.value)
                            }
                            className="flex-1 p-2 border border-blue-200 rounded-lg text-sm"
                          >
                            {languages.map((lang) => (
                              <option key={lang.code} value={lang.code}>
                                {lang.flag} {lang.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleTranslate}
                            disabled={isTranslating}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                          >
                            <IoLanguage className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Grammar Suggestions */}
                    {grammarSuggestions.length > 0 && (
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h5 className="font-medium text-yellow-900 mb-2">
                          Suggestions
                        </h5>
                        <div className="space-y-2">
                          {grammarSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="text-sm text-yellow-800 p-2 bg-white rounded border"
                            >
                              {suggestion.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rich Text Editor */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                      {/* Custom Toolbar */}
                      <div className="border-b border-blue-200 p-3 bg-gray-50">
                        <div className="flex flex-wrap gap-2">
                          {/* Text Formatting */}
                          <div className="flex space-x-1 border-r border-gray-300 pr-2">
                            <button
                              onClick={() => applyFormat("bold")}
                              className="p-2 hover:bg-blue-100 rounded text-sm font-bold"
                              title="Bold"
                            >
                              B
                            </button>
                            <button
                              onClick={() => applyFormat("italic")}
                              className="p-2 hover:bg-blue-100 rounded text-sm italic"
                              title="Italic"
                            >
                              I
                            </button>
                            <button
                              onClick={() => applyFormat("underline")}
                              className="p-2 hover:bg-blue-100 rounded text-sm underline"
                              title="Underline"
                            >
                              U
                            </button>
                          </div>

                          {/* Headers */}
                          <div className="flex space-x-1 border-r border-gray-300 pr-2">
                            <button
                              onClick={() =>
                                document.execCommand("formatBlock", false, "h1")
                              }
                              className="p-2 hover:bg-blue-100 rounded text-sm font-bold"
                              title="Header 1"
                            >
                              H1
                            </button>
                            <button
                              onClick={() =>
                                document.execCommand("formatBlock", false, "h2")
                              }
                              className="p-2 hover:bg-blue-100 rounded text-sm font-bold"
                              title="Header 2"
                            >
                              H2
                            </button>
                            <button
                              onClick={() =>
                                document.execCommand("formatBlock", false, "h3")
                              }
                              className="p-2 hover:bg-blue-100 rounded text-sm font-bold"
                              title="Header 3"
                            >
                              H3
                            </button>
                          </div>

                          {/* Lists */}
                          <div className="flex space-x-1 border-r border-gray-300 pr-2">
                            <button
                              onClick={() => insertList("unordered")}
                              className="p-2 hover:bg-blue-100 rounded text-sm"
                              title="Bullet List"
                            >
                              • List
                            </button>
                            <button
                              onClick={() => insertList("ordered")}
                              className="p-2 hover:bg-blue-100 rounded text-sm"
                              title="Numbered List"
                            >
                              1. List
                            </button>
                          </div>

                          {/* Alignment */}
                          <div className="flex space-x-1 border-r border-gray-300 pr-2">
                            <button
                              onClick={() => applyFormat("justifyLeft")}
                              className="p-2 hover:bg-blue-100 rounded text-sm"
                              title="Align Left"
                            >
                              ⬅
                            </button>
                            <button
                              onClick={() => applyFormat("justifyCenter")}
                              className="p-2 hover:bg-blue-100 rounded text-sm"
                              title="Align Center"
                            >
                              ↔
                            </button>
                            <button
                              onClick={() => applyFormat("justifyRight")}
                              className="p-2 hover:bg-blue-100 rounded text-sm"
                              title="Align Right"
                            >
                              ➡
                            </button>
                          </div>

                          {/* Text Color */}
                          <div className="flex space-x-1 border-r border-gray-300 pr-2">
                            <input
                              type="color"
                              onChange={(e) => changeTextColor(e.target.value)}
                              className="w-8 h-8 rounded border border-gray-300"
                              title="Text Color"
                            />
                          </div>

                          {/* Link */}
                          <div className="flex space-x-1">
                            <button
                              onClick={insertLink}
                              className="p-2 hover:bg-blue-100 rounded text-sm"
                              title="Insert Link"
                            >
                              🔗
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Editor Area */}
                      <div className="relative">
                        <div
                          contentEditable
                          onInput={(e) => setEditorContent(e.target.innerHTML)}
                          className="min-h-[400px] p-4 focus:outline-none leading-relaxed"
                          style={{ minHeight: "400px" }}
                          suppressContentEditableWarning={true}
                          dangerouslySetInnerHTML={{ __html: editorContent }}
                        />
                        {!editorContent && (
                          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                            Start writing your story...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-blue-600">
                        Words:{" "}
                        {
                          editorContent
                            .replace(/<[^>]*>/g, "")
                            .split(" ")
                            .filter((word) => word.length > 0).length
                        }
                      </div>
                      <div className="flex space-x-2">
                        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          <IoSave className="w-4 h-4" />
                          <span>Save Draft</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                          <IoEye className="w-4 h-4" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => toggleSection("prompt")}
              className="w-full flex items-center justify-between p-6 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <IoSparkles className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-purple-900">
                    🎨 AI Prompt Generator
                  </h3>
                  <p className="text-purple-600">
                    Generate stories and artwork with AI
                  </p>
                </div>
              </div>
              {activeSection === "prompt" ? (
                <IoChevronUp className="w-5 h-5 text-purple-600" />
              ) : (
                <IoChevronDown className="w-5 h-5 text-purple-600" />
              )}
            </button>

            {activeSection === "prompt" && (
              <div className="p-6 border-t border-purple-100">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Prompt Input */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-900 mb-2">
                        Describe your vision
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="A mystical forest with glowing flowers under moonlight..."
                        className="w-full h-32 p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={handleAIPrompt}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <IoSparkles className="w-5 h-5" />
                      <span>Generate Content</span>
                    </button>
                  </div>

                  {/* Generated Content */}
                  <div className="space-y-4">
                    {generatedImage && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h5 className="font-medium text-purple-900 mb-2">
                          Generated Artwork
                        </h5>
                        <div className="text-4xl text-center p-8 bg-white rounded border-2 border-dashed border-purple-300">
                          {generatedImage}
                        </div>
                      </div>
                    )}

                    {generatedStory && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h5 className="font-medium text-purple-900 mb-2">
                          Generated Story
                        </h5>
                        <div className="text-sm text-purple-800 p-3 bg-white rounded border">
                          {generatedStory}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cover Designer Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => toggleSection("cover")}
              className="w-full flex items-center justify-between p-6 hover:bg-green-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <IoBrush className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-green-900">
                    📚 Advanced Cover Designer
                  </h3>
                  <p className="text-green-600">
                    Create stunning covers with drag & drop, drawing tools
                  </p>
                </div>
              </div>
              {activeSection === "cover" ? (
                <IoChevronUp className="w-5 h-5 text-green-600" />
              ) : (
                <IoChevronDown className="w-5 h-5 text-green-600" />
              )}
            </button>

            {activeSection === "cover" && (
              <div className="p-6 border-t border-green-100">
                <div className="grid lg:grid-cols-4 gap-6">
                  {/* Tools Panel */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Templates */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">
                        Templates
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {coverTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(template.id)}
                            className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                              selectedTemplate === template.id
                                ? "border-green-500 bg-green-100"
                                : "border-green-200 hover:border-green-400"
                            }`}
                          >
                            <div className="text-2xl mb-1">
                              {template.preview}
                            </div>
                            <p className="text-xs font-medium text-green-900">
                              {template.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Drawing Tools */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">
                        Drawing Tools
                      </h4>
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setDrawingTool("pen")}
                            className={`flex-1 p-2 rounded-lg ${
                              drawingTool === "pen"
                                ? "bg-green-600 text-white"
                                : "bg-white border border-green-300"
                            }`}
                          >
                            <IoCreate className="w-4 h-4 mx-auto" />
                          </button>
                          <button
                            onClick={() => setDrawingTool("eraser")}
                            className={`flex-1 p-2 rounded-lg ${
                              drawingTool === "eraser"
                                ? "bg-green-600 text-white"
                                : "bg-white border border-green-300"
                            }`}
                          >
                            <IoTrash className="w-4 h-4 mx-auto" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">
                            Brush Size
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={brushSize}
                            onChange={(e) => setBrushSize(e.target.value)}
                            className="w-full"
                          />
                          <span className="text-xs text-green-700">
                            {brushSize}px
                          </span>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={drawingColor}
                            onChange={(e) => setDrawingColor(e.target.value)}
                            className="w-full h-8 rounded border border-green-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element Tools */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">
                        Elements
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={addTextElement}
                          className="w-full flex items-center space-x-2 p-2 bg-white hover:bg-green-100 rounded-lg border border-green-300 transition-colors"
                        >
                          <IoText className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Add Text</span>
                        </button>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center space-x-2 p-2 bg-white hover:bg-green-100 rounded-lg border border-green-300 transition-colors"
                        >
                          <IoImage className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Add Image</span>
                        </button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Background Tools */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">
                        Background
                      </h4>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-green-900">
                          Color
                        </label>
                        <input
                          type="color"
                          value={canvasBackground}
                          onChange={(e) => setCanvasBackground(e.target.value)}
                          className="w-full h-8 rounded border border-green-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Canvas Area */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-100 rounded-xl p-4">
                      <div
                        ref={canvasRef}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="relative bg-white rounded-lg shadow-inner border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors"
                        style={{
                          aspectRatio: "3/4",
                          minHeight: "500px",
                          backgroundColor: canvasBackground,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                          <div className="text-center">
                            <IoCloudUpload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Drag & drop images here</p>
                            <p className="text-xs">or use drawing tools</p>
                          </div>
                        </div>

                        {/* Render Elements */}
                        {coverElements.map((element) => (
                          <div
                            key={element.id}
                            className={`absolute cursor-move border-2 hover:border-green-500 ${
                              selectedElement === element.id
                                ? "border-green-500 shadow-lg"
                                : "border-transparent"
                            }`}
                            style={{
                              left: `${element.x}px`,
                              top: `${element.y}px`,
                              width:
                                element.type === "text"
                                  ? "auto"
                                  : `${element.width}px`,
                              height:
                                element.type === "text"
                                  ? "auto"
                                  : `${element.height}px`,
                            }}
                            onClick={() => setSelectedElement(element.id)}
                          >
                            {element.type === "image" ? (
                              <img
                                src={element.src}
                                alt="Cover element"
                                className="w-full h-full object-cover rounded"
                                draggable={false}
                              />
                            ) : (
                              <div
                                style={{
                                  fontSize: `${element.fontSize}px`,
                                  color: element.color,
                                  fontFamily: element.fontFamily,
                                }}
                                className="p-2 bg-white/80 rounded"
                              >
                                {element.content}
                              </div>
                            )}

                            {/* Element Controls */}
                            {selectedElement === element.id && (
                              <div className="absolute -top-8 right-0 flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateElement(element);
                                  }}
                                  className="p-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                >
                                  <IoAdd className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteElement(element.id);
                                  }}
                                  className="p-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                >
                                  <IoTrash className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Canvas Controls */}
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-green-600">
                        Elements: {coverElements.length}
                      </div>
                      <div className="flex space-x-2">
                        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                          <IoDownload className="w-4 h-4" />
                          <span>Export</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          <IoSave className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Properties Panel */}
                  <div className="lg:col-span-1">
                    {selectedElement && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-3">
                          Properties
                        </h4>
                        {(() => {
                          const element = coverElements.find(
                            (el) => el.id === selectedElement
                          );
                          if (!element) return null;

                          return (
                            <div className="space-y-3">
                              {element.type === "text" && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">
                                      Text
                                    </label>
                                    <input
                                      type="text"
                                      value={element.content}
                                      onChange={(e) => {
                                        setCoverElements((prev) =>
                                          prev.map((el) =>
                                            el.id === selectedElement
                                              ? {
                                                  ...el,
                                                  content: e.target.value,
                                                }
                                              : el
                                          )
                                        );
                                      }}
                                      className="w-full p-2 border border-green-300 rounded text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">
                                      Font Size
                                    </label>
                                    <input
                                      type="range"
                                      min="12"
                                      max="72"
                                      value={element.fontSize}
                                      onChange={(e) => {
                                        setCoverElements((prev) =>
                                          prev.map((el) =>
                                            el.id === selectedElement
                                              ? {
                                                  ...el,
                                                  fontSize: parseInt(
                                                    e.target.value
                                                  ),
                                                }
                                              : el
                                          )
                                        );
                                      }}
                                      className="w-full"
                                    />
                                    <span className="text-xs text-green-700">
                                      {element.fontSize}px
                                    </span>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">
                                      Color
                                    </label>
                                    <input
                                      type="color"
                                      value={element.color}
                                      onChange={(e) => {
                                        setCoverElements((prev) =>
                                          prev.map((el) =>
                                            el.id === selectedElement
                                              ? { ...el, color: e.target.value }
                                              : el
                                          )
                                        );
                                      }}
                                      className="w-full h-8 rounded border border-green-300"
                                    />
                                  </div>
                                </>
                              )}

                              {element.type === "image" && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">
                                      Width
                                    </label>
                                    <input
                                      type="range"
                                      min="50"
                                      max="400"
                                      value={element.width}
                                      onChange={(e) => {
                                        setCoverElements((prev) =>
                                          prev.map((el) =>
                                            el.id === selectedElement
                                              ? {
                                                  ...el,
                                                  width: parseInt(
                                                    e.target.value
                                                  ),
                                                }
                                              : el
                                          )
                                        );
                                      }}
                                      className="w-full"
                                    />
                                    <span className="text-xs text-green-700">
                                      {element.width}px
                                    </span>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-green-900 mb-1">
                                      Height
                                    </label>
                                    <input
                                      type="range"
                                      min="50"
                                      max="400"
                                      value={element.height}
                                      onChange={(e) => {
                                        setCoverElements((prev) =>
                                          prev.map((el) =>
                                            el.id === selectedElement
                                              ? {
                                                  ...el,
                                                  height: parseInt(
                                                    e.target.value
                                                  ),
                                                }
                                              : el
                                          )
                                        );
                                      }}
                                      className="w-full"
                                    />
                                    <span className="text-xs text-green-700">
                                      {element.height}px
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
