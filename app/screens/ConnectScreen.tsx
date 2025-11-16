import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { io, Socket } from "socket.io-client";

import { Navbar } from "@/components/layout/Navbar";
import { CallScreen } from "@/components/CallScreen";
import { useAuth } from "@/context/AuthContext";
import { api, SOCKET_BASE_URL } from "@/services/api";
import { platformShadow } from "@/utils/shadow";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

interface ChatSummary {
  chatId: string;
  targetUser: {
    _id: string;
    username: string;
    displayName?: string;
    profileImage?: {
      url?: string;
    };
    isVerified?: boolean;
  };
  lastMessage?: {
    messageId?: string;
    sender?: string;
    text?: string;
    mediaType?: string;
    previewUrl?: string;
    createdAt?: string;
  };
  lastMessageAt: string;
  unreadCount?: number;
  isBlocked?: boolean;
  blockedBy?: string[];
  canMessage?: boolean;
}

interface Message {
  _id: string;
  senderId: string;
  text?: string;
  media?: {
    url: string;
    type: string;
    name?: string;
  }[];
  mediaType?: string;
  mediaUrl?: string;
  createdAt: string;
  readBy?: string[];
}

const SOCKET_URL = SOCKET_BASE_URL || "http://localhost:5000";

export const ConnectScreen: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesByPartner, setMessagesByPartner] = useState<
    Record<string, Message[]>
  >({});
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Call State (UI-ready, WebRTC implementation requires custom build)
  const [callSession, setCallSession] = useState<{
    inCall: boolean;
    type: "audio" | "video";
    status: "calling" | "incoming" | "active" | "connecting";
    isCaller: boolean;
    partnerId: string | null;
    partnerName: string;
    partnerAvatar?: string;
    incomingOffer?: any;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const selfId = profile?._id;

  // Hide tab bar when in active chat, show it when in chat list
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: activeChat
        ? { display: "none" } // Hide tab bar in chat detail view
        : {
            position: "absolute",
            bottom: 0,
            left: 10,
            right: 10,
            height: 64,
            marginTop: 10,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: "#E5E8FF",
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          },
    });
  }, [activeChat, navigation]);

  useEffect(() => {
    if (selfId) {
      loadChats();
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selfId]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const initializeSocket = () => {
    if (!selfId) return;

    const socket = io(SOCKET_URL, {
      transports: ["polling"],
      query: { userId: selfId },
    });

    socket.on("connect", () => {
      console.log("Socket connected");
      // Register user for WebRTC calls
      if (selfId) {
        socket.emit("user:register", selfId);
        console.log("User registered for calls:", selfId);
      }
    });

    socket.on("new-message", (message: Message) => {
      handleNewMessage(message);
    });

    socket.on(
      "message-read",
      ({ chatId, userId }: { chatId: string; userId: string }) => {
        // Mark messages as read
        setMessagesByPartner((prev) => {
          const updated = { ...prev };
          if (updated[chatId]) {
            updated[chatId] = updated[chatId].map((msg) => ({
              ...msg,
              readBy: msg.readBy ? [...msg.readBy, userId] : [userId],
            }));
          }
          return updated;
        });
      }
    );

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("webrtc-signal", handleWebRTCSignal);

    socket.on("call:error", (error: any) => {
      console.error("Call error:", error);
      let message = "Unable to start call";
      if (error.code === "blocked_by_target") {
        message = "This user has blocked you";
      } else if (error.code === "you_blocked_target") {
        message = "Unblock this user to make calls";
      } else if (error.code === "chat_not_found") {
        message = "Chat not found";
      }
      Alert.alert("Call Failed", message);
      cleanupCall();
    });

    socketRef.current = socket;
  };

  const handleWebRTCSignal = async ({ from, callType, signal }: any) => {
    if (!signal || from === selfId) return;

    console.log("Received WebRTC signal:", {
      from,
      callType,
      signalType: signal.type,
    });

    try {
      if (signal.type === "offer") {
        // Incoming call
        const partnerChat = chats.find((chat) => chat.targetUser._id === from);

        console.log(
          "Incoming call from:",
          from,
          partnerChat?.targetUser.displayName
        );

        setCallSession({
          inCall: true,
          type: callType || "audio",
          status: "incoming",
          isCaller: false,
          partnerId: from,
          partnerName:
            partnerChat?.targetUser.displayName ||
            partnerChat?.targetUser.username ||
            "Unknown",
          partnerAvatar: partnerChat?.targetUser.profileImage?.url,
          incomingOffer: signal,
        });
      } else if (signal.type === "answer") {
        // Answer received - call accepted
        console.log("Call accepted by:", from);
        setCallSession((prev) => (prev ? { ...prev, status: "active" } : null));
      } else if (signal.type === "candidate") {
        // ICE candidate - handled by WebRTC in custom build
        console.log("ICE candidate received");
      } else if (signal.type === "end") {
        // Call ended
        console.log("Call ended by:", from);
        Alert.alert("Call Ended", "The other user ended the call.");
        cleanupCall();
      }
    } catch (error) {
      console.error("WebRTC signal handling error:", error);
    }
  };

  const handleNewMessage = (message: Message) => {
    if (!message || !message.senderId) return;

    const partnerId =
      message.senderId === selfId
        ? activeChat?.targetUser?._id
        : message.senderId;

    if (!partnerId) return;

    setMessagesByPartner((prev) => ({
      ...prev,
      [partnerId]: [...(prev[partnerId] || []), message],
    }));

    if (activeChat?.targetUser?._id === partnerId) {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    // Update chat list
    loadChats({ silent: true });
  };

  const loadChats = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/chats");
      const chatList = response.data.chats || [];

      // Filter out any chats without valid targetUser data
      const validChats = chatList.filter((chat: any) => {
        return chat && chat.targetUser && chat.targetUser._id;
      });

      setChats(validChats);

      // Don't auto-select chat - let user choose
    } catch (error: any) {
      console.error("Error loading chats:", error);
      if (!silent) {
        Alert.alert(
          "Error",
          error.response?.data?.message || "Failed to load chats"
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMessages = async (targetUserId: string) => {
    setLoadingMessages(true);
    try {
      const response = await api.get(`/chats/${targetUserId}/messages`);
      const messageList = response.data.messages || [];

      setMessages(messageList);
      setMessagesByPartner((prev) => ({
        ...prev,
        [targetUserId]: messageList,
      }));

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load messages"
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleChatSelect = (chat: ChatSummary) => {
    if (!chat || !chat.targetUser || !chat.targetUser._id) {
      Alert.alert("Error", "Invalid chat data");
      return;
    }

    setActiveChat(chat);
    const cached = messagesByPartner[chat.targetUser._id];
    if (cached) {
      setMessages(cached);
    } else {
      loadMessages(chat.targetUser._id);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChat || !activeChat.targetUser?._id)
      return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("text", text);

      const response = await api.post(
        `/chats/${activeChat.targetUser._id}/messages`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newMessage = response.data.message;
      if (newMessage) {
        handleNewMessage(newMessage);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to send message"
      );
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = async () => {
    Alert.alert("Add Attachment", "Choose attachment type", [
      {
        text: "Photo",
        onPress: handleImagePicker,
      },
      {
        text: "Document",
        onPress: handleDocumentPicker,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await sendMediaMessage(result.assets[0].uri, "image");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await sendMediaMessage(result.assets[0].uri, "document");
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const sendMediaMessage = async (uri: string, type: string) => {
    if (!activeChat || !activeChat.targetUser?._id) {
      Alert.alert("Error", "No active chat");
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("attachment", {
        uri,
        type: type === "image" ? "image/jpeg" : "application/octet-stream",
        name: type === "image" ? "image.jpg" : "document",
      } as any);

      const response = await api.post(
        `/chats/${activeChat.targetUser._id}/messages`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newMessage = response.data.message;
      if (newMessage) {
        handleNewMessage(newMessage);
      }
    } catch (error: any) {
      console.error("Error sending media:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to send attachment"
      );
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => {
    if (!activeChat || !activeChat.targetUser?._id) {
      Alert.alert("Error", "No active chat");
      return;
    }

    Alert.alert(
      "Clear Chat",
      "Are you sure you want to delete all messages? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/chats/${activeChat.targetUser._id}/messages`);
              setMessages([]);
              setMessagesByPartner((prev) => ({
                ...prev,
                [activeChat.targetUser._id]: [],
              }));
              Alert.alert("Success", "Chat cleared");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to clear chat"
              );
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!activeChat || !activeChat.targetUser?._id) {
      Alert.alert("Error", "No active chat");
      return;
    }

    const isBlocked =
      activeChat.isBlocked && activeChat.blockedBy?.includes(selfId || "");

    Alert.alert(
      isBlocked ? "Unblock User" : "Block User",
      isBlocked
        ? "Are you sure you want to unblock this user?"
        : "Blocked users cannot send you messages. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock" : "Block",
          style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              if (isBlocked) {
                await api.delete(`/chats/${activeChat.targetUser._id}/block`);
                Alert.alert("Success", "User unblocked");
              } else {
                await api.post(`/chats/${activeChat.targetUser._id}/block`);
                Alert.alert("Success", "User blocked");
              }
              loadChats({ silent: true });
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Action failed"
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteChat = () => {
    if (!activeChat || !activeChat.targetUser?._id) {
      Alert.alert("Error", "No active chat");
      return;
    }

    Alert.alert(
      "Delete Chat",
      "This will permanently delete this conversation. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/chats/${activeChat.targetUser._id}`);
              setActiveChat(null);
              setMessages([]);
              loadChats();
              Alert.alert("Success", "Chat deleted");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete chat"
              );
            }
          },
        },
      ]
    );
  };

  const handleVoiceCall = async () => {
    if (!activeChat || !activeChat.targetUser?._id) {
      Alert.alert("Error", "No active chat");
      return;
    }

    if (isBlockedByTarget) {
      Alert.alert(
        "Call Disabled",
        "This user has blocked you. Calls are disabled."
      );
      return;
    }

    if (isBlocked) {
      Alert.alert("Call Disabled", "Unblock this user to start a call.");
      return;
    }

    await startCall("audio");
  };

  const handleVideoCall = async () => {
    if (!activeChat || !activeChat.targetUser?._id) {
      Alert.alert("Error", "No active chat");
      return;
    }

    if (isBlockedByTarget) {
      Alert.alert(
        "Call Disabled",
        "This user has blocked you. Calls are disabled."
      );
      return;
    }

    if (isBlocked) {
      Alert.alert("Call Disabled", "Unblock this user to start a call.");
      return;
    }

    await startCall("video");
  };

  // Call Functions (UI + Signaling ready, WebRTC requires custom Expo build)
  const startCall = async (callType: "audio" | "video") => {
    if (!activeChat) return;

    console.log("Starting call:", {
      type: callType,
      to: activeChat.targetUser._id,
      from: selfId,
    });

    setCallSession({
      inCall: true,
      type: callType,
      status: "calling",
      isCaller: true,
      partnerId: activeChat.targetUser._id,
      partnerName:
        activeChat.targetUser.displayName || activeChat.targetUser.username,
      partnerAvatar: activeChat.targetUser.profileImage?.url,
    });

    // Send call signal via Socket.IO
    if (socketRef.current?.connected) {
      socketRef.current.emit("webrtc-signal", {
        to: activeChat.targetUser._id,
        from: selfId,
        callType,
        signal: { type: "offer" },
      });
      console.log("Call signal sent to:", activeChat.targetUser._id);
    } else {
      console.error("Socket not connected");
      Alert.alert(
        "Connection Error",
        "Not connected to server. Please check your internet connection."
      );
      cleanupCall();
      return;
    }

    // Auto-end demo call after 30 seconds if not accepted
    setTimeout(() => {
      if (callSession?.status === "calling") {
        Alert.alert("Call Ended", "No answer from the other user.");
        cleanupCall();
      }
    }, 30000);
  };

  const acceptCall = async () => {
    if (!callSession?.partnerId) return;

    console.log("Accepting call from:", callSession.partnerId);

    setCallSession((prev) => (prev ? { ...prev, status: "connecting" } : null));

    // Send accept signal via Socket.IO
    if (socketRef.current?.connected) {
      socketRef.current.emit("webrtc-signal", {
        to: callSession.partnerId,
        from: selfId,
        signal: { type: "answer" },
      });
      console.log("Accept signal sent to:", callSession.partnerId);
    }

    // Simulate connection
    setTimeout(() => {
      setCallSession((prev) => (prev ? { ...prev, status: "active" } : null));
      console.log("Call connected");
    }, 1000);
  };

  const declineCall = () => {
    console.log("Declining call");
    if (callSession?.partnerId && socketRef.current) {
      socketRef.current.emit("webrtc-signal", {
        to: callSession.partnerId,
        from: selfId,
        signal: { type: "end" },
      });
    }
    cleanupCall();
  };

  const endCall = () => {
    console.log("Ending call");
    if (callSession?.partnerId && socketRef.current) {
      socketRef.current.emit("webrtc-signal", {
        to: callSession.partnerId,
        from: selfId,
        signal: { type: "end" },
      });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    setCallSession(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const switchCamera = () => {
    // Camera switch would work with real WebRTC
    Alert.alert(
      "Camera Switch",
      "Camera switching requires WebRTC implementation"
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats({ silent: true });
    if (activeChat && activeChat.targetUser?._id) {
      await loadMessages(activeChat.targetUser._id);
    }
    setRefreshing(false);
  }, [activeChat]);

  const formatMessagePreview = (message: any) => {
    if (!message) return "Start the conversation";

    if (message.media && message.media.length > 0) {
      const mediaType = message.media[0].type;
      if (mediaType === "image") return "📷 Photo";
      if (mediaType === "video") return "🎬 Video";
      if (mediaType === "audio") return "🎙️ Voice note";
      return "📎 Attachment";
    }

    if (message.mediaType) {
      if (message.mediaType === "image") return "📷 Photo";
      if (message.mediaType === "video") return "🎬 Video";
      if (message.mediaType === "audio") return "🎙️ Voice note";
      return "📎 Attachment";
    }

    return message.text || "New message";
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderChatItem = ({ item }: { item: ChatSummary }) => {
    const isActive = activeChat?.chatId === item.chatId;
    const participant = item.targetUser;

    if (!participant) return null;

    const profileImageUrl = participant.profileImage?.url;
    const displayName =
      participant.displayName || participant.username || "Unknown";
    const initials = displayName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={[styles.chatItem, isActive && styles.chatItemActive]}
        onPress={() => handleChatSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatar}>
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.chatAvatarImage}
            />
          ) : (
            <View style={styles.chatAvatarPlaceholder}>
              <Text style={styles.chatAvatarInitials}>{initials}</Text>
            </View>
          )}
          {participant.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#3142C6" />
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.lastMessage?.createdAt && (
              <Text style={styles.chatTime}>
                {formatTimestamp(
                  item.lastMessage.createdAt || item.lastMessageAt
                )}
              </Text>
            )}
          </View>
          <View style={styles.chatPreview}>
            <Text style={styles.chatMessage} numberOfLines={1}>
              {formatMessagePreview(item.lastMessage)}
            </Text>
            {item.unreadCount
              ? item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                  </View>
                )
              : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isSent = item.senderId === selfId;
    const showAvatar =
      index === 0 || messages[index - 1].senderId !== item.senderId;
    const participant = activeChat?.targetUser;
    const profileImageUrl = participant?.profileImage?.url;
    const initials = participant
      ? (participant.displayName || participant.username)
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "";

    return (
      <View style={[styles.messageRow, isSent && styles.messageRowSent]}>
        {!isSent && (
          <View style={styles.messageAvatarContainer}>
            {showAvatar ? (
              profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.messageAvatar}
                />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarInitials}>{initials}</Text>
                </View>
              )
            ) : (
              <View style={styles.messageAvatarSpacer} />
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isSent ? styles.messageBubbleSent : styles.messageBubbleReceived,
          ]}
        >
          {item.media && item.media.length > 0 && (
            <View style={styles.mediaContainer}>
              {item.media[0].type === "image" ? (
                <Image
                  source={{ uri: item.media[0].url }}
                  style={styles.mediaImage}
                />
              ) : (
                <View style={styles.mediaFile}>
                  <Ionicons name="document-outline" size={32} color="#3142C6" />
                  <Text style={styles.mediaFileName} numberOfLines={1}>
                    {item.media[0].name || "Document"}
                  </Text>
                </View>
              )}
            </View>
          )}
          {item.mediaUrl && (
            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.mediaImage}
              />
            </View>
          )}
          {item.text && (
            <Text
              style={[styles.messageText, isSent && styles.messageTextSent]}
            >
              {item.text}
            </Text>
          )}
          <Text style={[styles.messageTime, isSent && styles.messageTimeSent]}>
            {new Date(item.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        </View>
      </View>
    );
  };

  // Render Call Screen Overlay
  if (callSession?.inCall) {
    return (
      <CallScreen
        callType={callSession.type}
        callStatus={callSession.status}
        isCaller={callSession.isCaller}
        partnerName={callSession.partnerName}
        partnerAvatar={callSession.partnerAvatar}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3142C6" />
        </View>
      </View>
    );
  }

  // Mobile view (single column)
  if (!activeChat) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect</Text>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item, index) => item.chatId || `chat-${index}`}
          contentContainerStyle={styles.chatList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#C5CAE9" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start connecting with other users
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  // Chat view
  const participant = activeChat.targetUser;
  const profileImageUrl = participant.profileImage?.url;
  const displayName = participant.displayName || participant.username;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isBlocked =
    activeChat.isBlocked && activeChat.blockedBy?.includes(selfId || "");
  const isBlockedByTarget =
    activeChat.isBlocked && !activeChat.blockedBy?.includes(selfId || "");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => setActiveChat(null)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatHeaderInfo}
          onPress={() => router.push(`/profile/${participant.username}` as any)}
        >
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.chatHeaderAvatar}
            />
          ) : (
            <View style={styles.chatHeaderAvatarPlaceholder}>
              <Text style={styles.chatHeaderAvatarInitials}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.chatHeaderName}>{displayName}</Text>
            <Text style={styles.chatHeaderUsername}>
              @{participant.username}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.chatHeaderActions}>
          <TouchableOpacity
            onPress={handleVoiceCall}
            style={[
              styles.callButton,
              (isBlocked || isBlockedByTarget) && styles.callButtonDisabled,
            ]}
            disabled={isBlocked || isBlockedByTarget}
          >
            <Ionicons
              name="call"
              size={20}
              color={isBlocked || isBlockedByTarget ? "#C5CAE9" : "#FFFFFF"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleVideoCall}
            style={[
              styles.callButton,
              (isBlocked || isBlockedByTarget) && styles.callButtonDisabled,
            ]}
            disabled={isBlocked || isBlockedByTarget}
          >
            <Ionicons
              name="videocam"
              size={20}
              color={isBlocked || isBlockedByTarget ? "#C5CAE9" : "#FFFFFF"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Alert.alert("Chat Options", "", [
                { text: "Clear Chat", onPress: handleClearChat },
                {
                  text: isBlocked ? "Unblock User" : "Block User",
                  onPress: handleBlockUser,
                  style: isBlocked ? "default" : "destructive",
                },
                {
                  text: "Delete Chat",
                  onPress: handleDeleteChat,
                  style: "destructive",
                },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            style={styles.chatHeaderMenu}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {loadingMessages ? (
        <View style={styles.messagesLoader}>
          <ActivityIndicator size="large" color="#3142C6" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item._id || `message-${index}`}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Ionicons name="chatbubble-outline" size={48} color="#C5CAE9" />
                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                <Text style={styles.emptyMessagesSubtext}>
                  Send a message to start the conversation
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Message Input */}
      {!isBlockedByTarget && (
        <View style={styles.messageInputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            disabled={sending || isBlocked}
          >
            <Ionicons
              name="add-circle"
              size={32}
              color={isBlocked ? "#C5CAE9" : "#3142C6"}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.messageInput}
            placeholder={
              isBlocked ? "Unblock to send messages" : "Type a message..."
            }
            placeholderTextColor="#8892C0"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            editable={!sending && !isBlocked}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending || isBlocked) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending || isBlocked}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {isBlockedByTarget && (
        <View style={styles.blockedBanner}>
          <Ionicons name="ban-outline" size={20} color="#EF4444" />
          <Text style={styles.blockedText}>You cannot message this user</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    navbarWrapper: {
      position: "absolute" as "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: "transparent",
      paddingTop: 35,
      paddingBottom: 12,
      paddingHorizontal: 0,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
    },
    header: {
      height: 64,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      marginTop: 130,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 4,
        elevation: 4,
      }),
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    chatList: {
      padding: 16,
      gap: 10,
      backgroundColor: theme.colors.background,
      paddingBottom: 90,
    },
    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.06,
        radius: 8,
        elevation: 3,
      }),
    },
    chatItemActive: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    chatAvatar: {
      position: "relative",
    },
    chatAvatarImage: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    chatAvatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    chatAvatarInitials: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    verifiedBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    chatInfo: {
      flex: 1,
      gap: 6,
    },
    chatHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    chatName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flex: 1,
    },
    chatTime: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginLeft: 8,
    },
    chatPreview: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    chatMessage: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    unreadCount: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    chatHeader: {
      height: 72,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      marginTop: 130,
      gap: 12,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.15,
        radius: 6,
        elevation: 5,
      }),
    },
    chatHeaderInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    chatHeaderAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    chatHeaderAvatarPlaceholder: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    chatHeaderAvatarInitials: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    chatHeaderName: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    chatHeaderUsername: {
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: 2,
    },
    chatHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    callButton: {
      padding: 10,
      borderRadius: 20,
    },
    callButtonDisabled: {
      opacity: 0.4,
    },
    chatHeaderMenu: {
      padding: 8,
    },
    messagesLoader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    messagesList: {
      padding: 16,
      paddingTop: 20,
      paddingBottom: 120,
      backgroundColor: theme.colors.background,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    messageRowSent: {
      justifyContent: "flex-end",
    },
    messageAvatarContainer: {
      width: 32,
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    messageAvatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    messageAvatarInitials: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    messageAvatarSpacer: {
      width: 32,
    },
    messageBubble: {
      maxWidth: "75%",
      padding: 12,
      paddingHorizontal: 14,
      borderRadius: 18,
    },
    messageBubbleReceived: {
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomLeftRadius: 4,
    },
    messageBubbleSent: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    mediaContainer: {
      marginBottom: 8,
      borderRadius: 12,
      overflow: "hidden",
    },
    mediaImage: {
      width: 200,
      height: 200,
      borderRadius: 12,
    },
    mediaFile: {
      padding: 16,
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
    },
    mediaFileName: {
      fontSize: 12,
      color: theme.colors.textPrimary,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    messageTextSent: {
      color: theme.colors.onPrimary,
    },
    messageTime: {
      marginTop: 4,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    messageTimeSent: {
      color: "rgba(255, 255, 255, 0.75)",
    },
    messageInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...platformShadow({
        offsetY: -2,
        opacity: 0.08,
        radius: 4,
        elevation: 6,
      }),
    },
    attachButton: {
      padding: 4,
      paddingBottom: 6,
    },
    messageInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 100,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 22,
      fontSize: 15,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 4,
        elevation: 3,
      }),
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.6,
    },
    blockedBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 14,
      backgroundColor: theme.colors.dangerSoft,
      borderTopWidth: 1,
      borderTopColor: theme.colors.danger,
    },
    blockedText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.danger,
    },
    emptyState: {
      flex: 1,
      paddingVertical: 100,
      alignItems: "center",
      gap: 16,
      backgroundColor: theme.colors.background,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 40,
    },
    emptyMessages: {
      paddingVertical: 100,
      alignItems: "center",
      gap: 16,
    },
    emptyMessagesText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    emptyMessagesSubtext: {
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 40,
    },
  });
