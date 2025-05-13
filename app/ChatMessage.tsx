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
  const [formattedContent, setFormattedContent] = useState("");
  
  // When a new message is displayed and search results are available, show the search component
  useEffect(() => {
    if (role === "assistant" && searchResults) {
      setShowSearch(true);
    }
  }, [role, searchResults]);

  // Format the content to render links
  useEffect(() => {
    if (content) {
      setFormattedContent(formatMessageContent(content));
    }
  }, [content]);

  const isUser = role === "user";
  
  // Handle link clicks
  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const link = target.getAttribute('href');
      if (link && !link.startsWith('#')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };
  
  return (
    <div className="py-3">
      {/* Search Results (only shown for assistant messages) */}
      {!isUser && showSearch && (
        <WebSearchResult 
          isLoading={isSearching} 
          results={searchResults}
          isStreaming={isSearching && searchResults.length > 0} 
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
          {isUser ? (
            content
          ) : (
            <div 
              dangerouslySetInnerHTML={{ __html: formattedContent }} 
              onClick={handleLinkClick}
              className="message-content"
            />
          )}
          {isStreaming && (
            <span className="ml-1 inline-block w-1.5 h-3.5 bg-current animate-pulse rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
};

// Function to format message content with clickable links
function formatMessageContent(content: string): string {
  if (!content) return '';
  
  // Extract reference URLs ([1]: https://example.com)
  const referenceLinks: {[key: string]: string} = {};
  const referenceRegex = /\[(\d+)\]: (https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = referenceRegex.exec(content)) !== null) {
    referenceLinks[match[1]] = match[2];
  }
  
  // Replace markdown links with HTML links
  let formatted = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
    '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Handle citation links like [1], [2], etc.
  formatted = formatted.replace(/\[(\d+)\](?!\:)/g, (match, num) => {
    const url = referenceLinks[num];
    if (url) {
      return `<a href="${url}" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">[${num}]</a>`;
    }
    return `<span class="text-blue-600 font-medium">[${num}]</span>`;
  });
  
  // Format reference links as actual links
  formatted = formatted.replace(/\[(\d+)\]: (https?:\/\/[^\s]+)/g, 
    '<div class="citation"><span class="text-blue-600 font-medium">[⁠$1]:</span> ' + 
    '<a href="$2" class="text-blue-600 underline hover:text-blue-800 break-all" target="_blank" rel="noopener noreferrer">$2</a></div>');
  
  // Convert line breaks to <br> tags
  return formatted.replace(/\n/g, '<br>');
} 