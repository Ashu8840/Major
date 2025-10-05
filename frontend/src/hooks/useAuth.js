import { useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";

const extractImageUrl = (imageLike) => {
  if (!imageLike) return null;
  if (typeof imageLike === "string") return imageLike;
  if (typeof imageLike?.url === "string") return imageLike.url;
  if (typeof imageLike?.secure_url === "string") return imageLike.secure_url;
  if (typeof imageLike?.path === "string") return imageLike.path;
  return null;
};

const getInitials = (name) => {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(
    0
  )}`.toUpperCase();
};

export const useCurrentUser = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useCurrentUser must be used within an AuthProvider");
  }

  const {
    user,
    userProfile,
    token,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    fetchUserProfile,
    setToken,
  } = context;

  const currentUser = useMemo(() => {
    const profile = userProfile || {};
    const fallbackName =
      profile.displayName ||
      profile.username ||
      profile.name ||
      user?.displayName ||
      user?.username ||
      user?.name ||
      "";

    const profileImageRaw =
      profile.profileImage || profile.avatar || profile.profilePicture;
    const profileImageUrl = extractImageUrl(profileImageRaw);
    const coverImageUrl = extractImageUrl(
      profile.coverPhoto || profile.coverImage
    );

    return {
      id: profile._id || profile.id || user?._id || user?.id || null,
      email: profile.email || user?.email || "",
      username: profile.username || user?.username || "",
      displayName: fallbackName,
      initials: getInitials(fallbackName) || getInitials(profile.email),
      profileImageUrl,
      profileImage:
        profileImageRaw || (profileImageUrl ? { url: profileImageUrl } : null),
      coverImageUrl,
      bio: profile.bio || "",
      stats: profile.stats || {},
      isVerified: Boolean(profile.isVerified || user?.isVerified),
      social: profile.social || {},
      rawProfile: profile,
    };
  }, [userProfile, user]);

  return {
    currentUser,
    user,
    userProfile,
    token,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    refreshProfile: fetchUserProfile,
    setToken,
  };
};

export default useCurrentUser;
