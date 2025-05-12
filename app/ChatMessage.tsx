"use client";

import { useState, useEffect } from "react";
import { WebSearchResult } from "./WebSearchResult";
import { useWebSearchStore } from "./custom-runtime";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming }: ChatMessageProps) => {
  const { isSearching, searchResults } = useWebSearchStore();
  const [showSearch, setShowSearch] = useState(false);
  
  // When a new message is displayed and search results are available, show the search component
  useEffect(() => {
    if (role === "assistant" && searchResults) {
      setShowSearch(true);
    }
  }, [role, searchResults]);

  const isUser = role === "user";
  
  return (
    <div className="py-3">
      {/* Search Results (only shown for assistant messages) */}
      {!isUser && showSearch && (
        <WebSearchResult 
          isLoading={isSearching} 
          results={searchResults} 
        />
      )}
      
      {/* Message */}
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`rounded-lg px-4 py-2.5 max-w-[85%] ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {content}
          {isStreaming && (
            <span className="ml-1 inline-block w-1.5 h-3.5 bg-current animate-pulse rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}; 