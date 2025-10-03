import { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import CommentItem from "./CommentItem";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  IoHeart,
  IoHeartOutline,
  IoChatbubbleOutline,
  IoShareSocialOutline,
  IoSend,
  IoEllipsisHorizontal,
  IoBookmarkOutline,
  IoEye,
  IoTimeOutline,
  IoPersonCircleOutline,
  IoChevronDown,
  IoChevronUp,
  IoTrashOutline,
  IoClose,
} from "react-icons/io5";

export default function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onDelete,
}) {
  const { user, userProfile } = useContext(AuthContext);
  const [liked, setLiked] = useState(post.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const optionsMenuRef = useRef(null);

  // Sync state with prop changes (important for refresh)
  useEffect(() => {
    setLiked(post.isLikedByUser || false);
    setLikesCount(post.likes?.length || 0);
  }, [post.isLikedByUser, post.likes]);

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        optionsMenuRef.current &&
        !optionsMenuRef.current.contains(event.target)
      ) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLike = async () => {
    // Optimistic UI update
    const previousLiked = liked;
    const previousCount = likesCount;

    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    try {
      const response = await api.post(`/community/post/${post._id}/like`);
      // Update with server response
      setLiked(response.data.isLiked);
      setLikesCount(response.data.likesCount);

      if (onLike) onLike(post._id);

      // Show success feedback
      if (response.data.isLiked) {
        toast.success("Post liked!", { duration: 1000 });
      } else {
        toast.success("Post unliked!", { duration: 1000 });
      }
    } catch (error) {
      // Revert optimistic updates on error
      setLiked(previousLiked);
      setLikesCount(previousCount);

      console.error("Error liking post:", error);
      toast.error("Failed to update like status");
    }
  };

  const handleShare = async () => {
    try {
      await api.post(`/community/post/${post._id}/share`);
      toast.success("Post shared successfully!");
      if (onShare) onShare(post._id);
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Failed to share post");
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/community/post/${post._id}`);
      toast.success("Post deleted successfully!");
      setShowDeleteConfirm(false);
      if (onDelete) onDelete(post._id);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error(error.response?.data?.message || "Failed to delete post");
    } finally {
      setDeleting(false);
    }
  };

  const isAuthor =
    user?._id === post.author?._id || user?.id === post.author?._id;

  const loadComments = async () => {
    if (comments.length > 0) {
      setShowComments(!showComments);
      return;
    }

    try {
      setCommentsLoading(true);
      const response = await api.get(`/community/post/${post._id}/comments`);
      setComments(response.data.comments || []);
      setShowComments(true);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentSubmitting(true);
      const response = await api.post(`/community/post/${post._id}/comments`, {
        text: newComment,
      });
      setComments([response.data, ...comments]);
      setNewComment("");
      toast.success("Comment added!");
      if (onComment) onComment(post._id);
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;

    return postDate.toLocaleDateString();
  };

  const shouldTruncateContent = post.content && post.content.length > 300;
  const displayContent =
    shouldTruncateContent && !showFullContent
      ? post.content.substring(0, 300) + "..."
      : post.content;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm">
              {post.author?.profileImage ? (
                <img
                  src={post.author.profileImage}
                  alt={post.author.displayName || post.author.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (post.author?.displayName || post.author?.username || "U")
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                  {post.author?.displayName ||
                    post.author?.username ||
                    "Unknown User"}
                </h3>
                {post.author?.isVerified && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {post.author?.bio || "Community member"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatDate(post.createdAt)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <IoEye className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{post.views || 0}</span>
              </div>
            </div>
          </div>
          <div className="relative" ref={optionsMenuRef}>
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <IoEllipsisHorizontal className="w-5 h-5" />
            </button>

            {/* Options Dropdown */}
            {showOptionsMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                {isAuthor && (
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg transition-colors"
                  >
                    <IoTrashOutline className="w-4 h-4" />
                    Delete Post
                  </button>
                )}
                <button
                  onClick={() => setShowOptionsMenu(false)}
                  className="w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Report Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {displayContent}
          {shouldTruncateContent && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-blue-600 hover:text-blue-700 font-medium ml-2 text-sm"
            >
              {showFullContent ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.hashtags.map((hashtag, index) => (
              <span
                key={index}
                className="text-blue-600 hover:text-blue-700 cursor-pointer text-sm font-medium"
              >
                #{hashtag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="w-full">
          <div className="w-full bg-gray-100">
            <img
              src={post.media[0].url || post.media[0]}
              alt="Post media"
              className="w-full h-auto object-contain max-h-[500px] sm:max-h-[600px] md:max-h-[700px]"
              style={{ display: "block" }}
            />
          </div>
        </div>
      )}

      {/* Engagement Summary */}
      {(likesCount > 0 ||
        post.comments?.length > 0 ||
        post.shares?.length > 0) && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              {likesCount > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <IoHeart className="w-2.5 h-2.5 text-white" />
                  </div>
                  {likesCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {post.comments?.length > 0 && (
                <span>
                  {post.comments.length} comment
                  {post.comments.length !== 1 ? "s" : ""}
                </span>
              )}
              {post.shares?.length > 0 && (
                <span>
                  {post.shares.length} share
                  {post.shares.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-100 px-4 py-2">
        <div className="flex items-center justify-around">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              liked
                ? "text-red-600 bg-red-50 hover:bg-red-100"
                : "text-gray-600 hover:text-red-600 hover:bg-gray-50"
            }`}
          >
            {liked ? (
              <IoHeart className="w-5 h-5 text-red-600" />
            ) : (
              <IoHeartOutline className="w-5 h-5" />
            )}
            <span className="font-medium text-sm">
              {likesCount > 0
                ? `${likesCount} Like${likesCount !== 1 ? "s" : ""}`
                : "Like"}
            </span>
          </button>

          <button
            onClick={loadComments}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
          >
            <IoChatbubbleOutline className="w-5 h-5" />
            <span className="font-medium text-sm">Comment</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-gray-50 transition-colors"
          >
            <IoShareSocialOutline className="w-5 h-5" />
            <span className="font-medium text-sm">Share</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-yellow-600 hover:bg-gray-50 transition-colors">
            <IoBookmarkOutline className="w-5 h-5" />
            <span className="font-medium text-sm">Save</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100">
          {/* Add Comment */}
          <div className="p-4 bg-gray-50">
            <form
              onSubmit={handleAddComment}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                {userProfile?.profileImage ? (
                  <img
                    src={userProfile.profileImage}
                    alt={
                      userProfile.displayName ||
                      userProfile.username ||
                      user?.username
                    }
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (
                    userProfile?.displayName ||
                    userProfile?.username ||
                    user?.username ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full focus:outline-none focus:border-blue-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || commentSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {commentSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <IoSend className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto">
            {commentsLoading ? (
              <div className="p-4 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 mt-2">Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    postId={post._id}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Post
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this post? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
