import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getTrendingPosts,
  isUnauthorizedError,
  likePost,
  stripHtml,
} from "@/services/api";

type CommunityPost = {
  id: string;
  author: string;
  title: string;
  summary: string;
  likes: number;
  isLiked?: boolean;
  createdAt?: string;
};

export const useCommunityFeed = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTrendingPosts().catch((err) => {
        if (isUnauthorizedError(err)) return { posts: [] };
        throw err;
      });
      const payload = Array.isArray(response?.posts)
        ? response.posts
        : Array.isArray(response)
        ? response
        : [];
      setPosts(
        payload.map((post: any) => ({
          id: post?._id ?? post?.id ?? Math.random().toString(36).slice(2),
          author:
            post?.author?.displayName ||
            post?.author?.username ||
            post?.author?.name ||
            "Community member",
          title:
            post?.title ||
            stripHtml(post?.content || "").slice(0, 60) ||
            "Untitled post",
          summary: stripHtml(post?.content || post?.summary || ""),
          likes: Array.isArray(post?.likes)
            ? post.likes.length
            : Number(post?.likes ?? 0),
          isLiked: Boolean(post?.isLiked),
          createdAt: post?.createdAt,
        }))
      );
    } catch (err) {
      console.error("Community feed failed", err);
      setError(
        "Unable to load community highlights right now. Pull to refresh soon."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleLike = useCallback(async (postId: string) => {
    try {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked
                  ? Math.max(0, post.likes - 1)
                  : post.likes + 1,
              }
            : post
        )
      );
      await likePost(postId);
    } catch (error) {
      console.error("Failed to toggle like", error);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return useMemo(
    () => ({ posts, loading, error, refresh: fetchPosts, toggleLike }),
    [posts, loading, error, fetchPosts, toggleLike]
  );
};
