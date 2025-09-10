import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import {
  IoCloudUpload,
  IoImageOutline,
  IoVideocamOutline,
} from "react-icons/io5";

export default function NewPost() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [tags, setTags] = useState("");

  const handlePost = async (e) => {
    e.preventDefault();
    try {
      // Prepare form data for file upload
      const formData = new FormData();
      formData.append("title", title || content.slice(0, 50));
      formData.append("content", content);
      if (tags) formData.append("tags", tags);
      if (selectedImage) formData.append("image", selectedImage);

      const { data } = await api.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Redirect to community page after successful post
      navigate("/community");
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  const handleCancel = () => {
    navigate("/community");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please log in to create posts.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">
          Create Post
        </h1>
        <p className="text-blue-700">Share your thoughts with the community</p>
      </div>

      {/* Post Form Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-6">
        <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handlePost} className="space-y-6 lg:space-y-8">
            {/* User Info */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-blue-600">
                  {user?.username?.[0]?.toUpperCase() ||
                    user?.name?.[0]?.toUpperCase() ||
                    "U"}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-blue-900">
                  {user?.username || user?.name || "User"}
                </h3>
                <p className="text-blue-600">Posting to Community</p>
              </div>
            </div>

            {/* Post Title */}
            <div>
              <input
                type="text"
                placeholder="Post title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 border-b-2 border-gray-200 px-0 py-4 text-xl placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-0 bg-transparent font-medium"
              />
            </div>

            {/* Content Area */}
            <div>
              <textarea
                placeholder="What do you want to talk about?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={6}
                className="w-full border-0 border-b-2 border-gray-200 px-0 py-4 text-base sm:text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-0 resize-none bg-transparent leading-relaxed min-h-[120px]"
              />
            </div>

            {/* Media Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Upload */}
              <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <label className="flex flex-col items-center gap-3 cursor-pointer text-blue-600 hover:text-blue-700">
                  <IoImageOutline className="w-8 h-8" />
                  <div className="text-center">
                    <span className="font-medium">Add Photo</span>
                    <p className="text-sm text-gray-500 mt-1">
                      JPG, PNG, GIF up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedImage(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {selectedImage && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">
                      Selected: {selectedImage.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Video Upload (Placeholder) */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 opacity-50">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <IoVideocamOutline className="w-8 h-8" />
                  <div className="text-center">
                    <span className="font-medium">Add Video</span>
                    <p className="text-sm mt-1">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <input
                type="text"
                placeholder="Add hashtags (e.g., #motivation #life)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full border-0 border-b-2 border-gray-200 px-0 py-4 text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-0 bg-transparent"
              />
            </div>

            {/* Post Options */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Who can see your post?
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    defaultChecked
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">🌍 Anyone</p>
                    <p className="text-sm text-gray-600">
                      Anyone on or off DiaryApp
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="connections"
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      👥 Connections only
                    </p>
                    <p className="text-sm text-gray-600">
                      Only your connections
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 sm:py-4 rounded-xl font-medium text-base sm:text-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim()}
                className={`flex-1 py-3 sm:py-4 rounded-xl font-medium text-base sm:text-lg transition-colors shadow-lg ${
                  content.trim()
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
