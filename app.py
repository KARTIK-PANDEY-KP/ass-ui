from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, validator
from typing import List, Optional, AsyncGenerator, Union, Dict, Any
import os
import json
import asyncio
import requests
from openai import OpenAI
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Perplexity API key from environment variables
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
if not PERPLEXITY_API_KEY:
    print("Warning: PERPLEXITY_API_KEY not found in environment variables")

class ContentItem(BaseModel):
    type: str
    text: str

class Message(BaseModel):
    role: str
    content: Union[str, List[Dict[str, Any]]]
    
    @validator('content')
    def extract_content(cls, v):
        # If content is already a string, return it
        if isinstance(v, str):
            return v
        
        # If content is a list of objects, extract text and join
        if isinstance(v, list):
            # Extract text from each content item
            texts = []
            for item in v:
                if isinstance(item, dict) and 'type' in item and item['type'] == 'text' and 'text' in item:
                    texts.append(item['text'])
            
            # Join all text items into a single string
            if texts:
                return ' '.join(texts)
        
        # Default fallback
        return str(v)

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "gpt-4o"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000
    stream: Optional[bool] = False
    web_search: Optional[bool] = False

# Perplexity API search function
async def perplexity_search(query: str) -> str:
    """
    Uses the Perplexity API to search for information about the query.
    """
    if not PERPLEXITY_API_KEY:
        # Fallback if API key is not available
        return f"Error: Perplexity API key not configured. Please add PERPLEXITY_API_KEY to your .env file."
    
    try:
        print(f"Querying Perplexity API for: {query}")
        
        # Perplexity API endpoint
        url = "https://api.perplexity.ai/chat/completions"
        
        # Request payload
        payload = {
            "model": "sonar-reasoning-pro",  # Use Perplexity's advanced Sonar Pro model with reasoning capabilities
            "messages": [
                {
                    "role": "system",
                    "content": """You are a helpful research assistant. Cite sources using [number](url) markdown. When citing information, use BOTH approaches together: 
1. Use numbered references in square brackets like [1], [2], etc. 
2. ALSO make the first mention of each source a clickable link using markdown format. For example: '[Salesforce Press Release](https://example.com)'. 
This ensures the information is both properly cited AND immediately accessible. 
At the end of your message, include the corresponding URLs for each citation in this exact format: 
[1]: https://example.com 
[2]: https://another-example.com 
Always include one URL per line. This ensures all citations are properly clickable. 
Do not use footnote-style citations like [^1^]."""
                },
                {
                    "role": "user",
                    "content": f"Search: {query}\nReturn relevant links and a summary."
                }
            ],
            "temperature": 0.3,  # Lower temperature for more focused reasoning
            "max_tokens": 2000,   # Significantly increased token limit for more detailed results
            "presence_penalty": 0.1 # Slight penalty to prevent repetition
            # Removed frequency_penalty as it conflicts with presence_penalty
        }
        
        # Headers including API key
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Make the request
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            result = data['choices'][0]['message']['content']
            
            # Format the response with sources if available
            formatted_result = f"# Perplexity Sonar Pro Search Results\n\n{result}"
            
            # Add citation/source information if available
            if 'sources' in data:
                formatted_result += "\n\n## Sources\n"
                for i, source in enumerate(data.get('sources', [])):
                    formatted_result += f"{i+1}. [{source.get('title', 'Source')}]({source.get('url', '#')})\n"
            
            print(f"Perplexity search completed successfully")
            return formatted_result
        else:
            error_msg = f"Perplexity API error: {response.status_code} - {response.text}"
            print(error_msg)
            return f"Error: {error_msg}"
            
    except Exception as e:
        error_msg = f"Perplexity search error: {str(e)}"
        print(error_msg)
        return f"Error performing search: {str(e)}"

async def generate_stream(response, search_results=None):
    """Generate streaming response in the format that assistant-ui expects"""
    full_text = ""
    
    try:
        # First, send the search results if available
        if search_results:
            search_data = {
                "content": [
                    {
                        "type": "text",
                        "text": ""  # Empty text for now
                    }
                ],
                "search_results": search_results
            }
            yield f"data: {json.dumps(search_data)}\n\n"
        
        # Then stream the model response
        for chunk in response:
            if chunk.choices and hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                content = chunk.choices[0].delta.content
                if content:
                    full_text += content
                    # Format compatible with the custom frontend adapter
                    data = {
                        "content": [
                            {
                                "type": "text",
                                "text": full_text
                            }
                        ]
                    }
                    yield f"data: {json.dumps(data)}\n\n"
        
        # End the stream
        yield "data: [DONE]\n\n"
    except Exception as e:
        print(f"Streaming error: {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Extract the last user message for web search
        last_user_message = None
        for msg in reversed(request.messages):
            if msg.role == "user":
                last_user_message = msg.content
                break
        
        # Get Perplexity search results if enabled
        search_results = ""
        if request.web_search and last_user_message:
            print(f"Perplexity search enabled for query: {last_user_message}")
            search_results = await perplexity_search(last_user_message)
            print("Search results obtained", search_results)
        
        # Convert our Pydantic models to dict for OpenAI
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Add search results as a system message if available
        if not request.stream and search_results and isinstance(search_results, str):
            print(search_results)
            messages.insert(0, {
                "role": "system",
                "content": f"""Use the following Perplexity search results to answer the user's query:

{search_results}

You are a helpful AI assistant with access to web search results. 
If search results are provided, you MUST use them to provide the most accurate and up-to-date information. 
When citing information, use BOTH approaches together: 
1. Use numbered references in square brackets like [1], [2], etc. 
2. ALSO make the first mention of each source a clickable link using markdown format. For example: '[Salesforce Press Release](https://example.com)'. 
This ensures the information is both properly cited AND immediately accessible. 
At the end of your message, include the corresponding URLs for each citation in this exact format: 
[1]: https://example.com 
[2]: https://another-example.com 
Always include one URL per line. This ensures all citations are properly clickable. 
Do not use footnote-style citations like [^1^]. 
If search results don't contain the answer, clearly state that and provide your best knowledge.
Always mention that information comes from Perplexity Sonar Pro search.
If information appears outdated, acknowledge that in your response.
"""
            })
        # For streaming mode, just give instructions since search results will be streamed separately
        elif request.stream and request.web_search:
            messages.insert(0, {
                "role": "system",
                "content": f"""Use the following Perplexity search results to answer the user's query:

{search_results}

You are a helpful AI assistant with access to web search results. 
If search results are provided, you MUST use them to provide the most accurate and up-to-date information. 
When citing information, use BOTH approaches together: 
1. Use numbered references in square brackets like [1], [2], etc. 
2. ALSO make the first mention of each source a clickable link using markdown format. For example: '[Salesforce Press Release](https://example.com)'. 
This ensures the information is both properly cited AND immediately accessible. 
At the end of your message, include the corresponding URLs for each citation in this exact format: 
[1]: https://example.com 
[2]: https://another-example.com 
Always include one URL per line. This ensures all citations are properly clickable. 
Do not use footnote-style citations like [^1^]. 
If search results don't contain the answer, clearly state that and provide your best knowledge.
Always mention that information comes from Perplexity Sonar Pro search.
If information appears outdated, acknowledge that in your response.
"""
            })
        
        print(f"Sending messages to OpenAI: {len(messages)} messages")
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=request.stream
        )
        
        # If streaming is enabled, return a streaming response
        if request.stream:
            print("Streaming mode enabled")
            return StreamingResponse(
                generate_stream(response, search_results if request.web_search else None),
                media_type="text/event-stream"
            )
        
        # Non-streaming mode
        print("Non-streaming mode")
        response_text = response.choices[0].message.content
        print(f"Response generated: {len(response_text)} characters")
        
        # Format response for assistant-ui with search results included
        formatted_response = {
            "content": [
                {
                    "type": "text",
                    "text": response_text
                }
            ]
        }
        
        # Also include search results if web search was enabled
        if request.web_search:
            formatted_response["search_results"] = search_results
        
        return JSONResponse(content=formatted_response)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 