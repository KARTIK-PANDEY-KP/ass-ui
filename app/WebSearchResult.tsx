"use client";

import { useState, useEffect } from "react";

interface WebSearchResultProps {
  isLoading: boolean;
  results: string;
  isStreaming?: boolean;
}

export const WebSearchResult = ({ isLoading, results }: WebSearchResultProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  useEffect(() => {
    if (results && !isLoading) {
      setHasResults(true);
    }
  }, [results, isLoading]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isLoading && !hasResults) return null;

  return (
    <div className="mb-4 rounded-lg border border-purple-200 overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 bg-purple-50 cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 text-purple-600" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span className="font-medium text-purple-800">
            {isLoading ? "Searching the web..." : "Perplexity Search Results"}
          </span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-purple-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-white">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
              <span className="text-gray-600">Fetching search results...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(results) }}></div>
          )}
        </div>
      )}
    </div>
  );
};

// Simple markdown formatting function
function formatMarkdown(markdown: string): string {
  // Handle empty input
  if (!markdown) return '';
  
  // Extract reference URLs ([1]: https://example.com)
  const referenceLinks: {[key: string]: string} = {};
  const referenceRegex = /\[(\d+)\]: (https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = referenceRegex.exec(markdown)) !== null) {
    referenceLinks[match[1]] = match[2];
  }
  
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-3 mb-1">$1</h2>')
    
    // Links - standard markdown links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gm, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Citation links [1], [2], etc. - use actual URLs when available
    .replace(/\[(\d+)\](?!\:)/g, (match, num) => {
      const url = referenceLinks[num];
      if (url) {
        return `<a href="${url}" class="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">[${num}]</a>`;
      }
      return `<span class="text-blue-600 font-medium">[${num}]</span>`;
    })
    
    // Lists
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    
    // Format reference links as actual links
    .replace(/\[(\d+)\]: (https?:\/\/[^\s]+)/g, 
      '<div class="citation"><span class="text-blue-600 font-medium">[⁠$1]:</span> ' + 
      '<a href="$2" class="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer">$2</a></div>')
    
    // Paragraphs
    .replace(/^(?!<[hdl])(.+)/gm, '<p class="mb-2">$1</p>');

  return html;
} 