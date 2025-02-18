"use client";

import { ChatMessage, ChatMessages, useChatUI } from "@llamaindex/chat-ui";
import { ChatMessageContent } from "./chat-message-content";
import { ChatStarter } from "./chat-starter";
import { MessageCircle, Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { LoadingDots } from "./loading-dots";

export default function CustomChatMessages() {
  const { messages, isLoading } = useChatUI();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll whenever messages change

  return (
    <ChatMessages>
      <ChatMessages.List className="w-full h-full max-w-[1200px] mx-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900">
              <MessageCircle className="w-8 h-8 text-blue-500 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Welcome to the Chat!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ask me anything about your documents or start a conversation.</p>
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
                className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isUser ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                }`}>
                  {isUser ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  )}
                </div>
                <div className={`max-w-[85%] ${!isUser ? 'w-full' : ''}`}>
                  <ChatMessageContent 
                    className={`px-4 py-3 rounded-2xl ${
                      isUser 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    } ${
                      !isUser ? 'prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-em:text-gray-700 dark:prose-em:text-gray-300' : ''
                    }`}
                  />
                </div>
              </ChatMessage>
            );
          })
        )}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
              <Bot className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ChatMessages.List>
      <ChatStarter />
    </ChatMessages>
  );
}
