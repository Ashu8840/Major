import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import CommentItem from "./CommentItem";
import {
  IoHeart,
  IoHeartOutline,
  IoChatbubbleOutline,
  IoRepeat,
  IoSend,
  IoEllipsisHorizontal,
  IoShare,
  IoBookmark,
  IoBookmarkOutline,
  IoTrash,
  IoEye,
} from "react-icons/io5";

export default function PostCard({ post }) {
  const { user } = useContext(AuthContext);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const handleLike = () => {
    if (liked) {
      setLikesCount((prev) => prev - 1);
    } else {
      setLikesCount((prev) => prev + 1);
    }
    setLiked(!liked);
  };

  const handleComment = () => {
    setShowComments(!showComments);
  };

  const formatDate = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));

    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return `${Math.floor(diffInHours / 168)}w`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-blue-100 mb-6 overflow-hidden">
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-blue-600">
                {post.author?.username?.[0]?.toUpperCase() ||
                  post.author?.name?.[0]?.toUpperCase() ||
                  "U"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-blue-900">
                  {post.author?.username || post.author?.name || "Unknown User"}
                </h3>
                <span className="text-blue-600 text-sm">• Follow</span>
              </div>
              <p className="text-sm text-blue-600">
                {post.author?.title || "Community Member"}
              </p>
              <p className="text-xs text-blue-500 flex items-center gap-1">
                {formatDate(post.createdAt)} • 🌍
              </p>
            </div>
          </div>
          <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg">
            <IoEllipsisHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-6 pb-4">
        <h4 className="font-medium text-blue-900 mb-2">{post.title}</h4>
        <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="text-blue-600 hover:underline cursor-pointer text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Post Image */}
        {post.media && post.media.length > 0 && (
          <div className="mt-4">
            <img
              src={post.media[0].url}
              alt="Post content"
              className="w-full max-h-96 object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      {(likesCount > 0 || post.comments?.length > 0) && (
        <div className="px-6 py-2 border-t border-blue-100">
          <div className="flex items-center justify-between text-sm text-blue-600">
            <div className="flex items-center gap-4">
              {likesCount > 0 && (
                <span className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <IoHeart className="w-2 h-2 text-white" />
                    </div>
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">👍</span>
                    </div>
                  </div>
                  {likesCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {post.comments?.length > 0 && (
                <span>{post.comments.length} comments</span>
              )}
              <span>• 1 repost</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-3 border-t border-blue-100">
        <div className="flex items-center justify-around">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-blue-50 ${
              liked ? "text-red-500" : "text-blue-600"
            }`}
          >
            {liked ? (
              <IoHeart className="w-5 h-5" />
            ) : (
              <IoHeartOutline className="w-5 h-5" />
            )}
            <span className="font-medium">Like</span>
          </button>

          <button
            onClick={handleComment}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
          >
            <IoChatbubbleOutline className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all">
            <IoRepeat className="w-5 h-5" />
            <span className="font-medium">Repost</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all">
            <IoSend className="w-5 h-5" />
            <span className="font-medium">Send</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-blue-100 bg-blue-50">
          <div className="p-6">
            {/* Add Comment */}
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.displayName || user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-blue-600">
                    {user?.displayName?.[0]?.toUpperCase() ||
                      user?.username?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 bg-white border border-blue-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoSend className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Existing Comments */}
            {post.comments && post.comments.length > 0 && (
              <div className="space-y-4">
                {post.comments.map((comment) => (
                  <CommentItem 
                    key={comment._id} 
                    comment={comment} 
                    postId={post._id}
                    onAddReply={onComment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
