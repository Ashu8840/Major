import { useEffect, useRef, useState } from "react";
import { IoSend, IoAttach, IoHappy, IoMic, IoClose } from "react-icons/io5";
import toast from "react-hot-toast";

const MessageInput = ({ onSendMessage, disabled, sending = false }) => {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const shouldSendRecordingRef = useRef(true);
  const recordingIntervalRef = useRef(null);

  const resetRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingTime(0);
  };

  const startRecordingTimer = () => {
    resetRecordingTimer();
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    resetRecordingTimer();
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (disabled || sending) return;
    if (!trimmed && !attachment) return;

    try {
      await onSendMessage({ text: trimmed, attachment });
      setMessage("");
      setAttachment(null);
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSizeMB = 20;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMB}MB`);
      event.target.value = "";
      return;
    }
    setAttachment(file);
    event.target.value = "";
  };

  const clearAttachment = () => {
    setAttachment(null);
  };

  const stopRecording = ({ send = true } = {}) => {
    const recorderInfo = recorderRef.current;
    if (!recorderInfo) return;

    shouldSendRecordingRef.current = send;
    recorderInfo.recorder.stop();
    recorderInfo.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    setIsRecording(false);
    stopRecordingTimer();
  };

  const startRecording = async () => {
    if (disabled || sending || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (!shouldSendRecordingRef.current) {
          shouldSendRecordingRef.current = true;
          return;
        }

        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        try {
          await onSendMessage({ attachment: audioFile });
        } catch (error) {
          console.error("Failed to send voice note", error);
          toast.error("Failed to send voice note");
        }
      };

      recorder.start();
      recorderRef.current = { recorder, chunks, stream };
      setIsRecording(true);
      startRecordingTimer();
    } catch (error) {
      console.error("Microphone access denied", error);
      toast.error("Microphone access denied");
    }
  };

  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        stopRecording({ send: false });
      }
      stopRecordingTimer();
    };
  }, []);

  const renderAttachmentPreview = () => {
    if (!attachment) return null;
    return (
      <div className="flex items-center space-x-2 bg-blue-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm text-blue-800 dark:text-gray-200">
        <span className="truncate max-w-[160px]">{attachment.name}</span>
        <button
          type="button"
          onClick={clearAttachment}
          className="p-1 rounded-full hover:bg-blue-200 dark:hover:bg-gray-600"
        >
          <IoClose className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-blue-100 dark:border-gray-700 p-4 mb-2">
      <div className="flex flex-col space-y-3">
        {renderAttachmentPreview()}
        {isRecording && (
          <div className="flex items-center space-x-2 text-sm text-red-500">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span>Recording… {recordingTime}s</span>
            <button
              type="button"
              onClick={() => stopRecording({ send: true })}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded-full"
            >
              Stop & Send
            </button>
            <button
              type="button"
              onClick={() => stopRecording({ send: false })}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded-full"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
            disabled={disabled || sending}
            onClick={() => fileInputRef.current?.click()}
          >
            <IoAttach className="w-5 h-5 text-blue-600 dark:text-gray-300" />
          </button>

          <div className="flex-1 relative">
            <div className="flex items-end bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
              <button
                className="p-3 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-l-lg transition-colors"
                disabled={disabled}
              >
                <IoHappy className="w-5 h-5 text-blue-600 dark:text-gray-300" />
              </button>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message"
                disabled={disabled || sending}
                rows={1}
                className="flex-1 py-3 px-0 bg-transparent text-blue-900 dark:text-white placeholder-blue-500 dark:placeholder-gray-400 resize-none focus:outline-none max-h-32 min-h-[24px]"
                style={{
                  height: "auto",
                  minHeight: "24px",
                  maxHeight: "128px",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(
                    e.target.scrollHeight,
                    128
                  )}px`;
                }}
              />
            </div>
          </div>

          {message.trim() || attachment ? (
            <button
              onClick={handleSend}
              disabled={disabled || sending}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoSend className="w-5 h-5" />
            </button>
          ) : (
            <button
              className="p-3 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
              disabled={disabled || sending}
              onClick={
                isRecording
                  ? () => stopRecording({ send: true })
                  : startRecording
              }
            >
              <IoMic className="w-5 h-5 text-blue-600 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
