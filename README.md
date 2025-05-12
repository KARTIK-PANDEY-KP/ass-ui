# GPT-4 Chat with FastAPI and assistant-ui

This project integrates FastAPI with assistant-ui to create a chat interface for OpenAI's GPT-4 model.

## Project Structure

- `app.py` - FastAPI backend that communicates with OpenAI
- `frontend/` - Next.js frontend using assistant-ui components

## Setup Instructions

### Backend Setup

1. Make sure you have Python 3.8+ installed

2. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the FastAPI server:
   ```
   python app.py
   ```
   The server will run at http://localhost:8000

### Frontend Setup

1. Make sure you have Node.js (16+) installed

2. Navigate to the frontend directory:
   ```
   cd frontend
   ```

3. Install frontend dependencies:
   ```
   npm install
   ```

4. Start the Next.js development server:
   ```
   npm run dev
   ```
   The frontend will run at http://localhost:3000

## API Endpoints

- `POST /api/chat` - Send messages to GPT-4
  - Request body:
    ```json
    {
      "messages": [
        {"role": "user", "content": "Hello!"}
      ],
      "model": "gpt-4o", 
      "temperature": 0.7,
      "max_tokens": 1000,
      "stream": false
    }
    ```

## Integration with assistant-ui

The frontend uses assistant-ui components to create an interactive chat interface. The integration is achieved through a custom runtime provider in `frontend/src/MyRuntimeProvider.tsx` that communicates with the FastAPI backend.
