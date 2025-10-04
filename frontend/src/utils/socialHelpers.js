export const normaliseId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return `${value}`;
  if (value._id) return normaliseId(value._id);
  if (value.id) return normaliseId(value.id);
  if (typeof value.toString === "function") return value.toString();
  return `${value}`;
};

export const resolveAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (typeof avatar === "object" && avatar.url) return avatar.url;
  return null;
};

export const buildDisplayName = (entity) =>
  entity?.displayName || entity?.username || "Unknown user";

export const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return "Just now";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};
