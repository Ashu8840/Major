import { useContext, useMemo, useState } from "react";
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import { toggleCommunityCommentLike } from "../utils/api";
import { buildDisplayName, resolveAvatarUrl } from "../utils/socialHelpers";

export default function CommentItem({
  comment,
  postId,
  onAddReply,
  depth = 0,
}) {
  const { user } = useContext(AuthContext);
  const viewerId = user?._id || user?.id || null;

  const initialLikes = Array.isArray(comment.likes) ? comment.likes : [];
  const [liked, setLiked] = useState(
    initialLikes.some((like) => like?.toString() === viewerId)
  );
  const [likesCount, setLikesCount] = useState(initialLikes.length || 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);

  const commenterName = useMemo(
    () =>
      buildDisplayName(comment.author) || comment.author?.username || "User",
    [comment.author]
  );

  const commenterAvatar = useMemo(
    () =>
      resolveAvatarUrl(comment.author?.profileImage) ||
      resolveAvatarUrl(comment.author?.avatar) ||
      comment.author?.profileImageUrl ||
      null,
    [comment.author]
  );

  const handleLikeComment = async () => {
    try {
      const result = await toggleCommunityCommentLike(comment._id);
      setLiked(Boolean(result.isLiked));
      if (typeof result.likesCount === "number") {
        setLikesCount(result.likesCount);
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !onAddReply || replyPending) return;

    try {
      setReplyPending(true);
      await onAddReply(postId, replyText.trim(), comment._id);
      setReplyText("");
      setShowReplyInput(false);
    } catch (error) {
      console.error("Failed to add reply:", error);
    } finally {
      setReplyPending(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "now";
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInHours = Math.floor((now - commentDate) / (1000 * 60 * 60));

    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return `${Math.floor(diffInHours / 168)}w`;
  };

  return (
    <div
      className={depth > 0 ? "ml-8 border-l-2 border-blue-100 pl-4" : undefined}
    >
      <div className="flex gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
          {commenterAvatar ? (
            <img
              src={commenterAvatar}
              alt={commenterName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-medium text-blue-600">
              {commenterName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="bg-white rounded-lg px-4 py-2">
            <p className="font-medium text-sm text-blue-900">{commenterName}</p>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">
              {comment.text}
            </p>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <button
              type="button"
              onClick={handleLikeComment}
              className={`flex items-center gap-1 ${
                liked ? "text-red-500" : "text-blue-600"
              } hover:underline`}
            >
              {liked ? (
                <IoHeart className="w-3 h-3" />
              ) : (
                <IoHeartOutline className="w-3 h-3" />
              )}
              <span>{likesCount > 0 ? likesCount : "Like"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReplyInput((prev) => !prev)}
              className="text-blue-600 hover:underline"
            >
              Reply
            </button>
            <span className="text-blue-500">
              {formatDate(comment.createdAt)}
            </span>
          </div>

          {showReplyInput && (
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleReply();
                  }
                }}
                className="flex-1 bg-white border border-blue-200 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={handleReply}
                disabled={!replyText.trim() || replyPending}
                className="px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {replyPending ? "Posting..." : "Reply"}
              </button>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply._id || reply.id}
                  comment={reply}
                  postId={postId}
                  onAddReply={onAddReply}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
