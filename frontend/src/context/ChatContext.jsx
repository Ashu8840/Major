import React, { createContext, useState } from "react";
import io from "socket.io-client";
import { SOCKET_BASE_URL } from "../utils/api";

export const ChatContext = createContext();

const socket = io(SOCKET_BASE_URL); // Adjusted for shared backend URL

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
