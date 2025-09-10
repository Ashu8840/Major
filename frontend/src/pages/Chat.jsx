import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import ChatList from "../components/ChatList";
import ChatHeader from "../components/ChatHeader";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import { IoArrowBack, IoEllipsisVertical } from "react-icons/io5";

const socket = io("http://localhost:5000");

const Chat = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([
    {
      id: 1,
      name: "Yash User",
      avatar: null,
      lastMessage: "Ho aur login na ho to sign up kr lena",
      lastMessageTime: "22:50",
      unreadCount: 0,
      isOnline: false,
      lastSeen: "22:50",
    },
    {
      id: 2,
      name: "Aman",
      avatar: null,
      lastMessage: "Image",
      lastMessageTime: "21:52",
      unreadCount: 0,
      isOnline: false,
      lastSeen: "21:52",
    },
    {
      id: 3,
      name: "UCER IT 2026",
      avatar: null,
      lastMessage: "❤️ Dear students join for the class.",
      lastMessageTime: "20:03",
      unreadCount: 0,
      isOnline: false,
      lastSeen: "20:03",
    },
    {
      id: 4,
      name: "IT-7G(2022-26)",
      avatar: null,
      lastMessage: "~Abhishek Tiwari: NOTICE For Shantipurn...",
      lastMessageTime: "20:02",
      unreadCount: 0,
      isOnline: false,
      lastSeen: "20:02",
    },
    {
      id: 5,
      name: "Rituraj Dubey",
      avatar: null,
      lastMessage: "Aa jao jaldi se attendence ho rahi h",
      lastMessageTime: "12:09",
      unreadCount: 0,
      isOnline: true,
      lastSeen: "Online",
    },
  ]);

  useEffect(() => {
    if (activeChat) {
      socket.emit("joinChat", activeChat.id);
    }

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          id: Date.now(),
          senderId: msg.senderId || msg.userId,
          receiverId: msg.receiverId || activeChat?.id,
          status: "delivered",
        },
      ]);
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [activeChat]);

  const handleChatSelect = (chat) => {
    setActiveChat(chat);
    // Load messages for this chat (in real app, fetch from API)
    if (chat.id === 1) {
      setMessages([
        {
          id: 1,
          text: "Ho aur login na ho to sign up kr lena",
          senderId: chat.id,
          receiverId: user?.id,
          createdAt: new Date().toISOString(),
          status: "read",
        },
      ]);
    } else {
      setMessages([]);
    }
  };

  const handleSendMessage = (text) => {
    if (!activeChat || !text.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: text.trim(),
      senderId: user?.id,
      receiverId: activeChat.id,
      chatId: activeChat.id,
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    // Add message to local state
    setMessages((prev) => [...prev, newMessage]);

    // Emit to server
    socket.emit("sendMessage", newMessage);

    // Update last message in chat list
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? { ...chat, lastMessage: text.trim(), lastMessageTime: "Now" }
          : chat
      )
    );
  };

  return (
    <div
      className="bg-blue-50 dark:bg-gray-900 no-horizontal-scroll"
      style={{ height: "calc(100vh - 80px)" }}
    >
      {/* Desktop Layout */}
      <div
        className="hidden lg:flex no-horizontal-scroll"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {/* Custom Chat Header with Back Button - Desktop */}
        <div className="w-full flex flex-col">
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700 flex items-center justify-between px-4">
            {/* Left - Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <IoArrowBack className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Center - Connect Title */}
            <h1 className="text-xl font-semibold text-blue-900 dark:text-white">
              Connect
            </h1>

            {/* Right - Menu Button */}
            <button className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors">
              <IoEllipsisVertical className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </button>
          </div>

          {/* Chat Content Area - Desktop */}
          <div className="flex-1 flex no-horizontal-scroll">
            {/* Chat List */}
            <ChatList
              chats={chats}
              activeChat={activeChat}
              onChatSelect={handleChatSelect}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col no-horizontal-scroll">
              {/* Chat Header */}
              <ChatHeader chat={activeChat} />

              {/* Chat Messages */}
              <ChatWindow
                chat={activeChat}
                messages={messages}
                currentUserId={user?.id}
              />

              {/* Message Input */}
              {activeChat && (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  disabled={!activeChat}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - WhatsApp Style */}
      <div
        className="lg:hidden flex flex-col no-horizontal-scroll"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {!activeChat ? (
          // Chat List View - Mobile
          <>
            {/* Chat Header */}
            <div className="h-14 bg-blue-600 flex items-center justify-between px-4 text-white flex-shrink-0">
              <h1 className="text-xl font-medium">Connect</h1>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-blue-700 rounded-full transition-colors">
                  <IoEllipsisVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat List - Full Screen on Mobile */}
            <div className="flex-1 bg-white dark:bg-gray-800 no-horizontal-scroll">
              <ChatList
                chats={chats}
                activeChat={activeChat}
                onChatSelect={handleChatSelect}
              />
            </div>
          </>
        ) : (
          // Chat Window View - Mobile
          <div className="h-full flex flex-col no-scroll">
            {/* Chat Header */}
            <ChatHeader chat={activeChat} onBack={() => setActiveChat(null)} />

            {/* Chat Messages */}
            <ChatWindow
              chat={activeChat}
              messages={messages}
              currentUserId={user?.id}
            />

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!activeChat}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
