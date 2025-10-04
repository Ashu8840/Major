import {
  IoCall,
  IoDocumentText,
  IoVideocam,
  IoMusicalNote,
  IoCloudUpload,
} from "react-icons/io5";

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const renderMedia = (mediaItem) => {
  if (!mediaItem) return null;

  if (mediaItem.isUploading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-blue-100">
        <IoCloudUpload className="w-4 h-4 animate-pulse" />
        <span>Uploading attachment…</span>
      </div>
    );
  }

  switch (mediaItem.type) {
    case "image":
      return (
        <a
          href={mediaItem.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={mediaItem.url}
            alt="Shared"
            className="max-w-full rounded-lg mt-2"
            loading="lazy"
          />
        </a>
      );
    case "video":
      return (
        <video
          controls
          className="max-w-full rounded-lg mt-2"
          src={mediaItem.url}
        />
      );
    case "audio":
      return (
        <div className="mt-2">
          <audio controls src={mediaItem.url} className="w-full" />
        </div>
      );
    default:
      return (
        <a
          href={mediaItem.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center space-x-2 text-sm underline"
        >
          <IoDocumentText className="w-5 h-5" />
          <span>{mediaItem.name || "Attachment"}</span>
        </a>
      );
  }
};

const renderStatusIcon = (status) => {
  if (status === "sent")
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );

  if (status === "delivered")
    return (
      <div className="flex">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <svg className="w-4 h-4 -ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );

  if (status === "read")
    return (
      <div className="flex text-blue-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <svg className="w-4 h-4 -ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );

  if (status === "sending")
    return <IoCloudUpload className="w-4 h-4 animate-pulse" />;

  return null;
};

const renderCallSummary = (message) => {
  if (!message.callType) return null;

  const Icon = message.callType === "video" ? IoVideocam : IoCall;
  const statusLabel = message.callStatus || "ongoing";
  const isMissed = statusLabel === "missed";
  const durationSeconds = Number(message.callDuration || 0);
  const durationLabel = durationSeconds
    ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
    : null;

  return (
    <div
      className={`flex items-center space-x-2 text-sm ${
        isMissed ? "text-red-200" : "text-blue-100"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>
        {isMissed ? "Missed" : "Completed"}{" "}
        {message.callType === "video" ? "video" : "voice"} call
        {durationLabel ? ` • ${durationLabel}` : ""}
      </span>
    </div>
  );
};

const renderVoiceNoteLabel = (media) => {
  if (media?.type !== "audio") return null;
  return (
    <div className="flex items-center space-x-1 text-xs text-blue-100 mt-1">
      <IoMusicalNote className="w-4 h-4" />
      <span>Voice note</span>
    </div>
  );
};

const MessageBubble = ({ message, isOwn }) => {
  const hasMedia = Array.isArray(message.media) && message.media.length > 0;
  const primaryMedia = hasMedia ? message.media[0] : null;

  return (
    <div className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg space-y-2 ${
          isOwn
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-white dark:bg-gray-700 text-blue-900 dark:text-white rounded-bl-none border border-blue-100 dark:border-gray-600"
        }`}
      >
        {message.callType ? (
          renderCallSummary(message)
        ) : (
          <>
            {message.text?.trim() && (
              <div className="break-words">
                <p className="text-sm whitespace-pre-line">{message.text}</p>
              </div>
            )}
            {hasMedia && (
              <>
                {renderMedia(primaryMedia)}
                {renderVoiceNoteLabel(primaryMedia)}
              </>
            )}
          </>
        )}

        <div
          className={`flex items-center justify-end space-x-2 ${
            isOwn ? "text-blue-100" : "text-blue-400"
          }`}
        >
          <span className="text-xs">{formatTime(message.createdAt)}</span>
          {isOwn && renderStatusIcon(message.status)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
