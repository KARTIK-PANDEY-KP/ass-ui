"use client";

import { useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { create } from "zustand";

// Create a store for web search state
interface WebSearchStore {
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  searchResults: string;
  setSearchResults: (results: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
}

export const useWebSearchStore = create<WebSearchStore>((set) => ({
  webSearchEnabled: false,
  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
  searchResults: "",
  setSearchResults: (results) => set({ searchResults: results }),
  isSearching: false,
  setIsSearching: (isSearching) => set({ isSearching: isSearching }),
}));

// Create a custom adapter for our FastAPI backend
export const useFastAPIRuntime = () => {
  const adapter: ChatModelAdapter = {
    async *run({ messages, abortSignal }) {
      try {
        // Format messages for our API
        const formattedMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content.filter(c => c.type === "text").map(c => (c as any).text).join("\n")
        }));

        // Get web search state
        const webSearchEnabled = useWebSearchStore.getState().webSearchEnabled;
        
        // Reset and update search state
        if (webSearchEnabled) {
          useWebSearchStore.getState().setSearchResults("");
          useWebSearchStore.getState().setIsSearching(true);
        }

        // Call our FastAPI endpoint with streaming enabled
        const response = await fetch("http://localhost:8000/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: formattedMessages,
            stream: true,
            web_search: webSearchEnabled
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Get response as a ReadableStream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get response reader");

        let text = "";
        let decoder = new TextDecoder();
        let searchResultsReceived = false;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          console.log("Raw chunk:", chunk);
          
          // Look for SSE lines with data
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                // Extract the data part
                const jsonStr = line.substring(6);
                const data = JSON.parse(jsonStr);
                
                // Check for search results in the response
                if (webSearchEnabled && !searchResultsReceived && data.search_results) {
                  searchResultsReceived = true;
                  useWebSearchStore.getState().setSearchResults(data.search_results);
                }
                
                // If data contains text, update our accumulated text
                if (data && data.content && data.content[0] && data.content[0].text) {
                  text = data.content[0].text;
                  // Yield the accumulated text
                  yield {
                    content: [{ type: "text", text }],
                  };
                }
              } catch (e) {
                console.error("Error parsing SSE:", e, line);
              }
            }
          }
        }
        
        // Search completed
        if (webSearchEnabled) {
          useWebSearchStore.getState().setIsSearching(false);
        }
      } catch (error) {
        console.error("Error in streaming:", error);
        // Reset search state in case of error
        if (useWebSearchStore.getState().isSearching) {
          useWebSearchStore.getState().setIsSearching(false);
        }
        
        yield {
          content: [
            {
              type: "text",
              text: `Error: ${(error as Error).message || "Unknown error"}`,
            },
          ],
        };
      }
    },
  };

  return useLocalRuntime(adapter);
}; 