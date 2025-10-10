import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CommentItem from "./CommentItem";
import api from "../utils/api";
import toast from "react-hot-toast";
import { buildDisplayName, resolveAvatarUrl } from "../utils/socialHelpers";
import {
  IoHeart,
  IoHeartOutline,
  IoChatbubbleOutline,
  IoShareSocialOutline,
  IoSend,
  IoEllipsisHorizontal,
  IoBookmarkOutline,
  IoBookmark,
  IoEye,
  IoTimeOutline,
  IoPersonCircleOutline,
  IoChevronDown,
  IoChevronUp,
  IoTrashOutline,
  IoClose,
  IoStatsChart,
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoLocationOutline,
  IoPeopleCircleOutline,
  IoCheckmarkCircleOutline,
  IoImageOutline,
} from "react-icons/io5";

const COMMENTS_PAGE_LIMIT = 20;

export default function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onDelete,
  onSave,
  onPollVote,
  onAuthorClick,
  isSaved = false,
  isHighlighted = false,
}) {
  const { user, userProfile } = useContext(AuthContext);
  const [liked, setLiked] = useState(Boolean(post.isLikedByUser));
  const [likesCount, setLikesCount] = useState(
    typeof post.likesCount === "number"
      ? post.likesCount
      : Array.isArray(post.likes)
      ? post.likes.length
      : 0
  );
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(
    Array.isArray(post.comments) ? [...post.comments] : []
  );
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [saved, setSaved] = useState(Boolean(isSaved));
  const [pollState, setPollState] = useState(
    post.postType === "poll" ? post.poll || null : null
  );
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [showFullArticle, setShowFullArticle] = useState(false);
  const optionsMenuRef = useRef(null);
  const commentsContainerRef = useRef(null);
  const navigate = useNavigate();

  const [commentsMeta, setCommentsMeta] = useState({
    currentPage: 0,
    totalPages: 1,
    hasNext: false,
    totalTopLevel:
      typeof post.commentsCount === "number"
        ? post.commentsCount
        : Array.isArray(post.comments)
        ? post.comments.length
        : 0,
    totalWithReplies: null,
  });
  const authorDisplayName = buildDisplayName(post.author);
  const authorAvatarUrl =
    resolveAvatarUrl(post.author?.profileImage) ||
    resolveAvatarUrl(post.author?.avatar) ||
    post.author?.profileImageUrl ||
    post.author?.avatarUrl ||
    null;
  const authorInitial = authorDisplayName
    ? authorDisplayName.charAt(0).toUpperCase()
    : "U";

  // Sync state with prop changes (important for refresh)
  useEffect(() => {
    setLiked(Boolean(post.isLikedByUser));
    setLikesCount(
      typeof post.likesCount === "number"
        ? post.likesCount
        : Array.isArray(post.likes)
        ? post.likes.length
        : 0
    );
  }, [post.isLikedByUser, post.likes, post.likesCount]);

  useEffect(() => {
    setSaved(Boolean(isSaved));
  }, [isSaved]);

  useEffect(() => {
    if (post.postType === "poll" && post.poll) {
      setPollState(post.poll);
    } else {
      setPollState(null);
    }
  }, [post.poll, post.postType, post._id]);

  useEffect(() => {
    setShowFullArticle(false);
  }, [post._id]);

  useEffect(() => {
    if (Array.isArray(post.comments)) {
      setComments(post.comments);
      setCommentsMeta((prev) => ({
        ...prev,
        totalTopLevel: post.comments.length,
      }));
    }
  }, [post.comments, post._id]);

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
    if (likePending) return;

    // Optimistic UI update
    const previousLiked = liked;
    const previousCount = likesCount;

    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);

    try {
      setLikePending(true);
      const response = await api.post(`/community/post/${post._id}/like`);
      // Update with server response
      setLiked(Boolean(response.data.isLiked));
      setLikesCount(
        typeof response.data.likesCount === "number"
          ? response.data.likesCount
          : Array.isArray(response.data.likes)
          ? response.data.likes.length
          : 0
      );

      if (onLike) onLike(post._id, response.data);

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
    } finally {
      setLikePending(false);
    }
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const shareUrl = `${window.location.origin}/community/post/${post._id}`;
    const shareTitle = `Check out this post from ${authorDisplayName}`;
    const shareText = post.content
      ? `${post.content.substring(0, 140)}${
          post.content.length > 140 ? "…" : ""
        }`
      : shareTitle;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Share sheet opened");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.top = "-1000px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Link copied to clipboard");
      }

      if (onShare) onShare(post._id, shareUrl);
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Failed to share post");
    }
  };

  const handlePollVote = async (optionId) => {
    if (!pollState || pollSubmitting) return;

    if (pollState.isExpired) {
      toast.error("This poll has already closed");
      return;
    }

    try {
      setPollSubmitting(true);
      const response = await api.post(`/community/post/${post._id}/poll/vote`, {
        optionId,
      });

      const nextPoll = response.data?.poll;
      if (nextPoll) {
        setPollState(nextPoll);
        if (onPollVote) {
          onPollVote(post._id, nextPoll);
        }

        const updatedOption = nextPoll.options?.find(
          (option) => option.id === optionId
        );
        const votedMessage = nextPoll.allowMultiple
          ? updatedOption?.isVotedByCurrentUser
            ? "Choice added"
            : "Choice removed"
          : "Vote submitted";
        toast.success(votedMessage);
      } else {
        toast.success("Vote submitted");
      }
    } catch (error) {
      console.error("Error voting on poll:", error);
      toast.error(
        error.response?.data?.message || "Unable to record your vote"
      );
    } finally {
      setPollSubmitting(false);
    }
  };

  const handleSave = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);

    try {
      if (onSave) {
        await Promise.resolve(onSave(post, nextSaved));
      }

      toast.success(nextSaved ? "Post saved" : "Removed from saved");
    } catch (error) {
      console.error("Error saving post:", error);
      setSaved(!nextSaved);
      toast.error("Failed to update saved posts");
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

  const getCommentId = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return value._id || value.id || value.commentId || value.toString?.();
    }
    return value?.toString?.() || null;
  };

  const applyCreatedComment = (createdComment) => {
    const parentId = getCommentId(createdComment.parentComment);

    if (!parentId) {
      setComments((prev) => [createdComment, ...prev]);
      setCommentsMeta((prevMeta) => ({
        ...prevMeta,
        totalTopLevel: (prevMeta.totalTopLevel || 0) + 1,
        totalWithReplies:
          typeof prevMeta.totalWithReplies === "number"
            ? prevMeta.totalWithReplies + 1
            : prevMeta.totalWithReplies,
      }));
      return;
    }

    let inserted = false;
    const parentIdString = parentId.toString();

    setComments((prev) => {
      const traverse = (nodes) =>
        nodes.map((node) => {
          if (!node) return node;
          const nodeId = getCommentId(node);

          if (nodeId && nodeId.toString() === parentIdString) {
            inserted = true;
            const repliesArray = Array.isArray(node.replies)
              ? [...node.replies, createdComment]
              : [createdComment];
            return { ...node, replies: repliesArray };
          }

          if (node.replies?.length) {
            const updatedReplies = traverse(node.replies);
            if (updatedReplies !== node.replies) {
              return { ...node, replies: updatedReplies };
            }
          }

          return node;
        });

      const updated = traverse(prev);
      return inserted ? updated : prev;
    });

    setCommentsMeta((prevMeta) => ({
      ...prevMeta,
      totalWithReplies:
        typeof prevMeta.totalWithReplies === "number"
          ? prevMeta.totalWithReplies + 1
          : prevMeta.totalWithReplies,
    }));

    if (!inserted) {
      fetchComments(1, true);
    }
  };

  const fetchComments = async (page = 1, reveal = false) => {
    const isInitialPage = page === 1;

    if (isInitialPage) {
      setCommentsLoading(true);
    } else {
      setLoadingMoreComments(true);
    }

    try {
      const response = await api.get(`/community/post/${post._id}/comments`, {
        params: { page, limit: COMMENTS_PAGE_LIMIT },
      });

      const fetchedComments = response.data?.comments || [];

      setComments((prev) =>
        isInitialPage ? fetchedComments : [...prev, ...fetchedComments]
      );

      const pagination = response.data?.pagination || {};

      setCommentsMeta((prevMeta) => ({
        currentPage: pagination.currentPage || page,
        totalPages: pagination.totalPages || prevMeta.totalPages,
        hasNext: Boolean(pagination.hasNext),
        totalTopLevel:
          typeof pagination.totalComments === "number"
            ? pagination.totalComments
            : isInitialPage
            ? fetchedComments.length
            : prevMeta.totalTopLevel,
        totalWithReplies:
          typeof pagination.totalWithReplies === "number"
            ? pagination.totalWithReplies
            : prevMeta.totalWithReplies,
      }));

      if (reveal) {
        setShowComments(true);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      if (isInitialPage) {
        setCommentsLoading(false);
      } else {
        setLoadingMoreComments(false);
      }
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    if (comments.length > 0 && commentsMeta.currentPage > 0) {
      setShowComments(true);
      return;
    }

    await fetchComments(1, true);
  };

  const loadMoreComments = async () => {
    if (commentsLoading || loadingMoreComments || !commentsMeta.hasNext) return;
    await fetchComments(commentsMeta.currentPage + 1);
  };

  useEffect(() => {
    const container = commentsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!commentsMeta.hasNext || commentsLoading || loadingMoreComments) {
        return;
      }

      const threshold = 120;
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - threshold
      ) {
        loadMoreComments();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [
    commentsMeta.hasNext,
    commentsLoading,
    loadingMoreComments,
    loadMoreComments,
  ]);

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentSubmitting(true);
      const response = await api.post(`/community/post/${post._id}/comments`, {
        text: newComment,
      });

      const createdComment = response.data;
      applyCreatedComment(createdComment);
      setNewComment("");
      setShowComments(true);
      toast.success("Comment added!");
      if (onComment) onComment(post._id);
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAddReply = async (_postId, text, parentCommentId) => {
    if (!text.trim()) return;

    try {
      const response = await api.post(`/community/post/${post._id}/comments`, {
        text,
        parentCommentId,
      });

      const createdReply = response.data;
      applyCreatedComment(createdReply);
      toast.success("Reply added!");
      return createdReply;
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
      throw error;
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

  const formatDateTime = (value) => {
    if (!value) return "TBD";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "TBD";
    return `${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} • ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const formatEventDateRange = (start, end) => {
    if (!start) return "Date coming soon";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (Number.isNaN(startDate.getTime())) return "Date coming soon";
    if (!endDate || Number.isNaN(endDate.getTime())) {
      return formatDateTime(startDate);
    }

    const sameDay = startDate.toDateString() === endDate.toDateString();

    if (sameDay) {
      const dateLabel = startDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return `${dateLabel} • ${startDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })} – ${endDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    return `${formatDateTime(startDate)} → ${formatDateTime(endDate)}`;
  };

  const formatPollDeadline = (expiresAt, isExpired) => {
    if (!expiresAt) return isExpired ? "Poll closed" : "Open ended poll";
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return "Open ended poll";
    if (isExpired) {
      return `Closed on ${date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`;
    }
    return `Closes on ${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} at ${date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const shouldTruncateContent = post.content && post.content.length > 300;
  const displayContent =
    shouldTruncateContent && !showFullContent
      ? post.content.substring(0, 300) + "..."
      : post.content;

  const postTypeLabels = {
    text: "Update",
    image: "Photo",
    poll: "Poll",
    article: "Article",
    event: "Event",
  };

  const postTypeAccentClasses = {
    image: "bg-blue-50 text-blue-600",
    poll: "bg-green-50 text-green-600",
    article: "bg-orange-50 text-orange-600",
    event: "bg-purple-50 text-purple-600",
  };

  const shouldShowTypeBadge =
    post.postType && post.postType !== "text" && postTypeLabels[post.postType];

  const shouldShowGenericMedia =
    post.media &&
    post.media.length > 0 &&
    !["article", "event"].includes(post.postType);

  const totalCommentCount =
    typeof commentsMeta.totalTopLevel === "number"
      ? commentsMeta.totalTopLevel
      : comments.length;

  const renderPollCard = () => {
    if (post.postType !== "poll" || !pollState) return null;

    const pollQuestion =
      pollState.question ||
      pollState.title ||
      post.pollQuestion ||
      post.poll?.question ||
      "Poll";
    const pollTitle = pollState.title || post.poll?.title || null;
    const pollOptions = Array.isArray(pollState.options)
      ? pollState.options
      : [];
    const totalVotes = pollOptions.reduce(
      (total, option) => total + (option.votes || 0),
      0
    );
    const pollStartTime = pollState.startsAt || post.poll?.startsAt;
    const pollCreatedAt = pollStartTime || post.createdAt;

    return (
      <div className="px-4 pb-4">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 shadow-inner space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {pollTitle && (
                <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                  {pollTitle}
                </p>
              )}
              <h4 className="text-base font-semibold text-green-900">
                {pollQuestion}
              </h4>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-green-700">
                <span>Started {formatDateTime(pollCreatedAt)}</span>
                <span className="text-green-500">•</span>
                <span>
                  {formatPollDeadline(pollState.expiresAt, pollState.isExpired)}
                </span>
              </div>
            </div>
            {pollState.hasVoted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-white/70 px-2 py-1 rounded-full">
                <IoCheckmarkCircleOutline className="w-3.5 h-3.5" />
                Voted
              </span>
            )}
          </div>

          <div className="space-y-3">
            {pollOptions.map((option) => {
              const optionId = option.id || option._id || option.value;
              const optionLabel = option.text || option.label || option.title;
              const optionVotes = option.votes || 0;
              const percent = totalVotes
                ? Math.round(
                    option.percentage || (optionVotes / totalVotes) * 100
                  )
                : 0;
              const widthPercent = totalVotes ? Math.max(percent, 6) : 6;
              const isSelected = Boolean(option.isVotedByCurrentUser);

              return (
                <button
                  key={optionId || optionLabel}
                  type="button"
                  disabled={!optionId || pollSubmitting || pollState.isExpired}
                  onClick={() => optionId && handlePollVote(optionId)}
                  className={`relative w-full overflow-hidden rounded-2xl border transition-all duration-200 text-left ${
                    isSelected
                      ? "border-green-400 shadow-lg"
                      : "border-green-100 hover:border-green-300"
                  } ${
                    pollState.isExpired
                      ? "cursor-not-allowed opacity-80"
                      : "cursor-pointer"
                  }`}
                >
                  <div className="absolute inset-0">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isSelected ? "bg-green-300/60" : "bg-green-200/40"
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    ></div>
                  </div>
                  <div className="relative flex items-center justify-between gap-3 px-4 py-3">
                    <span className="font-medium text-green-900">
                      {optionLabel}
                    </span>
                    <div className="flex items-center gap-3 text-sm text-green-800">
                      <span className="font-semibold">{percent}%</span>
                      <span className="text-xs text-green-700">
                        {optionVotes} vote
                        {optionVotes === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-green-700">
            <span>
              {totalVotes} vote
              {totalVotes === 1 ? "" : "s"}
            </span>
            <span>
              {pollState.allowMultiple
                ? "Multiple choice enabled"
                : "Single choice poll"}
            </span>
            {pollSubmitting && (
              <span className="inline-flex items-center gap-2 text-green-600">
                <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                Updating…
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderArticleCard = () => {
    if (post.postType !== "article" || !post.article) return null;

    return (
      <div className="px-4 pb-4">
        <div className="border border-orange-100 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50/40 shadow-sm">
          {post.article.coverImage?.url && (
            <img
              src={post.article.coverImage.url}
              alt={post.article.title}
              className="w-full h-52 object-cover"
              loading="lazy"
            />
          )}
          <div className="p-4 space-y-3">
            <h4 className="text-xl font-semibold text-orange-900">
              {post.article.title}
            </h4>
            {post.article.summary && (
              <p className="text-sm text-orange-700 leading-relaxed">
                {post.article.summary}
              </p>
            )}
            {post.article.body && (
              <div className="text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">
                {showFullArticle
                  ? post.article.body
                  : `${post.article.body.slice(0, 480)}${
                      post.article.body.length > 480 ? "…" : ""
                    }`}
              </div>
            )}
            {post.article.body && post.article.body.length > 480 && (
              <button
                type="button"
                onClick={() => setShowFullArticle((prev) => !prev)}
                className="text-sm font-semibold text-orange-700 hover:text-orange-800"
              >
                {showFullArticle ? "Show less" : "Read full article"}
              </button>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-orange-600 pt-2 border-t border-orange-100">
              <span className="inline-flex items-center gap-1">
                <IoTimeOutline className="w-3.5 h-3.5" />
                {post.article.readTimeMinutes || 1} min read
              </span>
              <span className="inline-flex items-center gap-1">
                <IoDocumentTextOutline className="w-3.5 h-3.5" />
                Full article included
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEventCard = () => {
    if (post.postType !== "event" || !post.event) return null;

    return (
      <div className="px-4 pb-4">
        <div className="border border-purple-100 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50/50 shadow-sm">
          {post.event.banner?.url && (
            <img
              src={post.event.banner.url}
              alt={post.event.title}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
          )}
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h4 className="text-xl font-semibold text-purple-900">
                {post.event.title}
              </h4>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  post.event.isLive
                    ? "bg-green-100 text-green-700"
                    : post.event.isPast
                    ? "bg-gray-100 text-gray-600"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {post.event.isLive
                  ? "Happening now"
                  : post.event.isPast
                  ? "Event ended"
                  : "Upcoming event"}
              </span>
            </div>
            {post.event.description && (
              <p className="text-sm text-purple-800 leading-relaxed">
                {post.event.description}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-purple-800">
              <div className="flex items-start gap-2">
                <IoCalendarOutline className="w-5 h-5 text-purple-600 mt-0.5" />
                <span>
                  {formatEventDateRange(post.event.start, post.event.end)}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <IoLocationOutline className="w-5 h-5 text-purple-600 mt-0.5" />
                <span>
                  {post.event.isVirtual
                    ? "Virtual event"
                    : post.event.location || "Location TBA"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <IoPeopleCircleOutline className="w-5 h-5 text-purple-600 mt-0.5" />
                <span>
                  {post.event.attendeesCount || 0} attending
                  {post.event.availableSpots != null && (
                    <>
                      {" "}
                      • {post.event.availableSpots} spot
                      {post.event.availableSpots === 1 ? "" : "s"} left
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-purple-700 pt-2 border-t border-purple-100">
              <span>
                {post.event.isAttending
                  ? "You're marked as attending"
                  : "Tap to RSVP in the event hub"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const containerClasses = `bg-white rounded-2xl border mb-6 overflow-hidden transition-all duration-200 ${
    isHighlighted
      ? "border-blue-500 shadow-xl ring-2 ring-blue-100/80 bg-gradient-to-br from-blue-50/70 to-white"
      : "border-gray-200 shadow-sm hover:shadow-md"
  }`;

  return (
    <div className={containerClasses} data-post-id={post?._id || ""}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm overflow-hidden">
              {authorAvatarUrl ? (
                <img
                  src={authorAvatarUrl}
                  alt={authorDisplayName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                authorInitial
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer focus:outline-none focus-visible:ring focus-visible:ring-blue-200 rounded"
                  role="button"
                  tabIndex={0}
                  onClick={() => onAuthorClick && onAuthorClick(post.author)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onAuthorClick && onAuthorClick(post.author);
                    }
                  }}
                >
                  {authorDisplayName}
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
              {shouldShowTypeBadge && (
                <div
                  className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    postTypeAccentClasses[post.postType] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {post.postType === "poll" && (
                    <IoStatsChart className="w-3.5 h-3.5" />
                  )}
                  {post.postType === "article" && (
                    <IoDocumentTextOutline className="w-3.5 h-3.5" />
                  )}
                  {post.postType === "event" && (
                    <IoCalendarOutline className="w-3.5 h-3.5" />
                  )}
                  {post.postType === "image" && (
                    <IoImageOutline className="w-3.5 h-3.5" />
                  )}
                  <span>{postTypeLabels[post.postType]}</span>
                </div>
              )}
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
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[170px]">
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    navigate(`/community?highlight=${post._id}`);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-lg transition-colors"
                >
                  <IoEye className="w-4 h-4" />
                  View Post
                </button>
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

      {renderPollCard()}
      {renderArticleCard()}
      {renderEventCard()}

      {/* Media */}
      {shouldShowGenericMedia && (
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
      {(likesCount > 0 || comments.length > 0 || post.shares?.length > 0) && (
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
              {totalCommentCount > 0 && (
                <span>
                  {totalCommentCount} comment
                  {totalCommentCount !== 1 ? "s" : ""}
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
      <div className="border-t border-gray-100 px-2 sm:px-4 py-2">
        <div className="flex flex-wrap items-center justify-between sm:justify-around gap-2 sm:gap-3 text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 ${
              liked
                ? "text-red-600 bg-red-50 hover:bg-red-100"
                : "text-gray-600 hover:text-red-600 hover:bg-gray-50"
            }`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            {liked ? (
              <IoHeart className="w-5 h-5 text-red-600" />
            ) : (
              <IoHeartOutline className="w-5 h-5" />
            )}
            <span className="hidden sm:inline font-medium text-sm">
              {likesCount > 0
                ? `${likesCount} Like${likesCount !== 1 ? "s" : ""}`
                : "Like"}
            </span>
            <span className="sm:hidden text-xs font-medium">
              {likesCount > 0 ? likesCount : ""}
            </span>
          </button>

          <button
            onClick={loadComments}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            aria-label="Comments"
          >
            <IoChatbubbleOutline className="w-5 h-5" />
            <span className="hidden sm:inline font-medium text-sm">
              Comment
            </span>
            <span className="sm:hidden text-xs font-medium">
              {totalCommentCount ? totalCommentCount : ""}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-gray-50 transition-colors"
            aria-label="Share"
          >
            <IoShareSocialOutline className="w-5 h-5" />
            <span className="hidden sm:inline font-medium text-sm">Share</span>
            <span className="sm:hidden text-xs font-medium">Send</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors ${
              saved
                ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                : "text-gray-600 hover:text-yellow-600 hover:bg-gray-50"
            }`}
            aria-label={saved ? "Unsave" : "Save"}
          >
            {saved ? (
              <IoBookmark className="w-5 h-5" />
            ) : (
              <IoBookmarkOutline className="w-5 h-5" />
            )}
            <span className="hidden sm:inline font-medium text-sm">
              {saved ? "Saved" : "Save"}
            </span>
            <span className="sm:hidden text-xs font-medium">
              {saved ? "✓" : "+"}
            </span>
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
          <div
            ref={commentsContainerRef}
            className="max-h-[60vh] overflow-y-auto pr-1"
          >
            {commentsLoading && comments.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2">Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
              <>
                <div className="divide-y divide-gray-100">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment._id || comment.id}
                      comment={comment}
                      postId={post._id}
                      onAddReply={handleAddReply}
                    />
                  ))}
                </div>

                {loadingMoreComments && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading more comments...
                  </div>
                )}

                {commentsMeta.hasNext && !loadingMoreComments && (
                  <div className="p-4 text-center">
                    <button
                      type="button"
                      onClick={loadMoreComments}
                      className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      Load more comments
                    </button>
                  </div>
                )}
              </>
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
