import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SOCKET_BASE_URL, api } from "@/services/api";
import {
  buildDisplayName,
  formatRelativeTime,
  normaliseId,
  getInitials,
  resolveAvatarUrl,
} from "@/utils/socialHelpers";

interface Message {
  id: string;
  text: string;
  createdAt: string;
  sender: any;
  senderId: string;
  senderName: string;
  attachments?: any[];
}

interface Circle {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  memberCount: number;
}

const UserAvatar: React.FC<{ user: any; size?: number }> = ({
  user,
  size = 32,
}) => {
  const avatarUrl = resolveAvatarUrl(user?.avatar);
  const initials = getInitials(buildDisplayName(user));

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatarImage,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.avatarText, { fontSize: size / 2.5 }]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function CircleChatScreen() {
  const params = useLocalSearchParams();
  const circleId = params.circleId as string;
  const { user } = useAuth();
  const selfId = user?._id || user?.id;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Define transform and handle functions first
  const transformMessage = useCallback(
    (message: any): Message => ({
      id: message.id || message._id,
      text: message.text || "",
      createdAt: message.createdAt,
      sender: message.sender,
      senderId: normaliseId(message.sender?.id || message.sender?._id) || "",
      senderName: buildDisplayName(message.sender),
      attachments: message.attachments || [],
    }),
    []
  );

  const handleNewMessage = useCallback(
    (message: any) => {
      if (!message) return;

      const messageId = message.id || message._id;

      // Check if message already exists
      if (messageIdsRef.current.has(messageId)) {
        console.log("Message already exists, skipping:", messageId);
        return;
      }

      console.log("Adding new message:", messageId);
      messageIdsRef.current.add(messageId);

      const transformed = transformMessage(message);

      setMessages((prev) => {
        // Double-check before adding
        const exists = prev.some((m) => m.id === messageId);
        if (exists) {
          console.log("Message already in state, skipping:", messageId);
          return prev;
        }
        return [...prev, transformed];
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [transformMessage]
  );

  const initializeSocket = useCallback(() => {
    if (!selfId || !circleId) return;

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      query: { userId: selfId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket connected for circle chat");
      // Register user first
      socket.emit("user:register", selfId);

      // Then join the circle room
      socket.emit("circle:join", { circleId });
      console.log("Joined circle room:", circleId);
    });

    socket.on("circle:message", (payload: any) => {
      console.log("Received circle message via socket:", payload);
      // Only handle messages for this circle
      if (payload.circleId === circleId) {
        handleNewMessage(payload);
      }
    });

    socket.on("disconnect", (reason: string) => {
      console.log("Socket disconnected from circle chat:", reason);
    });

    socket.on("reconnect", (attemptNumber: number) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      // Rejoin circle room on reconnect
      socket.emit("user:register", selfId);
      socket.emit("circle:join", { circleId });
      console.log("Rejoined circle room after reconnect:", circleId);
    });

    socket.on("error", (error: any) => {
      console.error("Socket error:", error);
    });

    socketRef.current = socket;
  }, [selfId, circleId, handleNewMessage]);

  useEffect(() => {
    if (circleId && selfId) {
      loadCircleDetails();
      loadMessages();
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        // Leave the circle room before disconnecting
        if (circleId) {
          socketRef.current.emit("circle:leave", { circleId });
          console.log("Left circle room on cleanup:", circleId);
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [circleId, selfId, initializeSocket]);

  const loadCircleDetails = async () => {
    try {
      const response = await api.get(`/social/circles/${circleId}`);
      setCircle(response.data.circle);
    } catch (error: any) {
      console.error("Failed to load circle details", error);
      Alert.alert("Error", "Failed to load circle details");
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/social/circles/${circleId}/messages`);
      const messageList = response.data.messages || [];

      messageIdsRef.current.clear();
      const transformed = messageList.map((msg: any) => {
        const messageId = msg.id || msg._id;
        messageIdsRef.current.add(messageId);
        return transformMessage(msg);
      });

      setMessages(transformed);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error: any) {
      console.error("Failed to load messages", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    const tempId = `temp-${Date.now()}`;

    // Clear input immediately for better UX
    setMessageText("");
    setSending(true);

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      text,
      createdAt: new Date().toISOString(),
      sender: user || {},
      senderId: (selfId as string) || "",
      senderName: user?.displayName || user?.username || "You",
      attachments: [],
    };

    // Add to message IDs to prevent duplicate from socket
    messageIdsRef.current.add(tempId);

    // Add optimistic message to UI
    setMessages((prev) => [...prev, optimisticMessage]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const response = await api.post(`/social/circles/${circleId}/messages`, {
        text,
      });

      const serverMessage = response.data.message;

      // Remove temp message and add real message with server ID
      messageIdsRef.current.delete(tempId);
      messageIdsRef.current.add(serverMessage.id);

      setMessages((prev) => {
        // Replace temp message with server message
        return prev.map((m) =>
          m.id === tempId ? transformMessage(serverMessage) : m
        );
      });

      console.log("Message sent successfully:", serverMessage.id);
    } catch (error: any) {
      console.error("Failed to send message", error);

      // Remove optimistic message on error
      messageIdsRef.current.delete(tempId);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      Alert.alert("Error", "Failed to send message");
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === selfId;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwn && (
          <View style={styles.messageHeader}>
            <UserAvatar user={item.sender} size={24} />
            <Text style={styles.senderName}>{item.senderName}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.ownText : styles.otherText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwn ? styles.ownTime : styles.otherTime,
            ]}
          >
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
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
          <Text style={styles.headerTitle}>Circle Chat</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3142C6" />
        </View>
      </View>
    );
  }

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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {circle?.name || "Circle Chat"}
          </Text>
          {circle?.memberCount && (
            <Text style={styles.headerSubtitle}>
              {circle.memberCount} members
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#93c5fd" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navbarWrapper: {
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    height: 64,
    backgroundColor: "#3142C6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F4F6FE",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: "#3142C6",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: "#FFFFFF",
  },
  otherText: {
    color: "#1A224A",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTime: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "right",
  },
  otherTime: {
    color: "#8B92C9",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E8FF",
    gap: 12,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: "#F4F6FE",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1A224A",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3142C6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e3a8a",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#60a5fa",
    marginTop: 8,
  },
  avatar: {
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "600",
    color: "#2563eb",
  },
});
