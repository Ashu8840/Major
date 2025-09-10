import React, { createContext, useState } from "react";
import io from "socket.io-client";

export const ChatContext = createContext();

const socket = io("http://localhost:5000"); // Adjust to your backend URL

export const ChatProvider = ({ children }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  // Implement chat logic here

  return (
    <ChatContext.Provider value={{ activeChat, messages, socket }}>
      {children}
    </ChatContext.Provider>
  );
};
