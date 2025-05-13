"use client";

import { useThreadRuntime, useThread } from "@assistant-ui/react";
import { ChatMessage } from "./ChatMessage";
import { useState, useRef, useEffect } from "react";

interface MessageContent {
  type: string;
  text?: string;
}

interface Message {
  id: string;
  role: string;
  content: MessageContent[];
}

export const CustomThread = () => {
  const threadRuntime = useThreadRuntime();
  const thread = useThread();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      threadRuntime.append({
        role: "user",
        content: [{ type: "text", text: inputValue }],
      });
      setInputValue("");
    }
  };

  // Use type assertion to fix the TypeScript error
  const isRunning = (thread as any).status === "running";
  const messages = thread.messages || [];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-2">
          {messages.map((message: any) => {
            // Extract text content
            const content = message.content
              .filter((item: {type: string}) => item.type === "text")
              .map((item: {text?: string}) => item.text || "")
              .join("\n");

            return (
              <ChatMessage
                key={message.id}
                role={message.role as "user" | "assistant"}
                content={content}
                isStreaming={
                  isRunning &&
                  message.id === messages[messages.length - 1].id
                }
              />
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isRunning}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              isRunning ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isRunning}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}; 