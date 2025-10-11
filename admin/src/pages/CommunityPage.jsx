import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { FiTrash2, FiSearch, FiFilter } from "react-icons/fi";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const filterOptions = [
  { label: "All posts", value: "all" },
  { label: "Images", value: "images" },
  { label: "Text", value: "text" },
  { label: "Following", value: "following" },
];

const CommunityPage = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAdminSession();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["community", "feed", filter, search],
    queryFn: () =>
      apiClient.get(
        `/community/feed?limit=20&filter=${filter}${
          search ? `&q=${encodeURIComponent(search)}` : ""
        }`
      ),
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId) => apiClient.delete(`/community/post/${postId}`),
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
    },
    onError: (error) => {
      toast.error(error.payload?.message || "Failed to delete post");
    },
  });

  const handleDelete = (postId) => {
    if (!postId) return;
    // Optimistic confirmation prompt remains client-side for safety
    if (window.confirm("Delete this post? This action cannot be undone.")) {
      deleteMutation.mutate(postId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Community Moderation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review community activity and moderate posts in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search posts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-64"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm">
            <FiFilter className="h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="bg-transparent text-sm text-slate-600 focus:outline-none"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loader label="Loading community feed" />
      ) : (
        <div className="space-y-4">
          {(data?.posts || []).map((post) => (
            <article
              key={post._id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        post.author?.profileImage?.url || "/avatar-fallback.png"
                      }
                      alt={post.author?.displayName || post.author?.username}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {post.author?.displayName || post.author?.username}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(post.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                    {post.postType}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(post._id)}
                  disabled={deleteMutation.isLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Delete post
                </button>
              </header>

              <div className="mt-6 space-y-3">
                {post.title && (
                  <h2 className="text-lg font-semibold text-slate-900">
                    {post.title}
                  </h2>
                )}
                {post.content && (
                  <p className="text-sm leading-relaxed text-slate-600">
                    {post.content.slice(0, 240)}
                    {post.content.length > 240 && "…"}
                  </p>
                )}
                {post.media?.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {post.media.slice(0, 4).map((item) => (
                      <img
                        key={item._id}
                        src={item.url}
                        alt="Post media"
                        className="h-48 w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              <footer className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                <span>{post.likesCount || 0} likes</span>
                <span>{post.commentsCount || 0} comments</span>
                <span>{post.sharesCount || 0} shares</span>
                <span className="inline-flex items-center gap-2">
                  Visibility:
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {post.visibility}
                  </span>
                </span>
              </footer>
            </article>
          ))}
          {!data?.posts?.length && (
            <p className="py-6 text-center text-sm text-slate-400">
              No posts found.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
