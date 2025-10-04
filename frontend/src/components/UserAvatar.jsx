import PropTypes from "prop-types";
import {
  buildDisplayName,
  getInitials,
  resolveAvatarUrl,
} from "../utils/socialHelpers";

const SIZE_CLASS = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const UserAvatar = ({ user, size = "md", className = "" }) => {
  const avatarUrl = resolveAvatarUrl(user?.profileImage);
  const initials = getInitials(buildDisplayName(user));
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  if (avatarUrl) {
    const classes =
      `${sizeClass} rounded-full object-cover border-2 border-white shadow-sm ${className}`.trim();
    return (
      <img src={avatarUrl} alt={buildDisplayName(user)} className={classes} />
    );
  }

  const classes =
    `${sizeClass} rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold border-2 border-white ${className}`.trim();
  return <div className={classes}>{initials}</div>;
};

UserAvatar.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string,
    username: PropTypes.string,
    profileImage: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({ url: PropTypes.string }),
    ]),
  }),
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  className: PropTypes.string,
};

export default UserAvatar;
