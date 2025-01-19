"use client";

import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { ChatMessageContent } from "./chat-message-content";
import { ChatStarter } from "./chat-starter";
import { MessageCircle } from "lucide-react";

export default function CustomChatMessages() {
  const { messages } = useChatUI();
  return (
    <ChatMessages>
      <ChatMessages.List className="w-full h-full max-w-[1200px] mx-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="p-4 rounded-full bg-blue-50">
              <MessageCircle className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Welcome to the Chat!</h3>
              <p className="text-sm text-gray-500 mt-1">Ask me anything about your documents or start a conversation.</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <ChatMessage
                key={index}
                message={message}
                isLast={index === messages.length - 1}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[80%]">
                  <ChatMessageContent 
                    className={`px-4 py-2.5 rounded-2xl ${
                      isUser 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100"
                    }`}
                  />
                </div>
              </ChatMessage>
            );
          })
        )}
        <ChatMessages.Loading />
      </ChatMessages.List>
      <ChatStarter />
    </ChatMessages>
  );
}
