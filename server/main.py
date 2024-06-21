from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import List
import logging
import asyncio

app = FastAPI()

# Allow CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the language model with a valid API key
llm = ChatGoogleGenerativeAI(model="models/gemini-pro", google_api_key='AIzaSyB3oBBRVbI1cw9Aj0tF_hlK5hJzKkp4EmU')

# Data model for messages
class Message(BaseModel):
    text: str

class Response(BaseModel):
    reply: str

# In-memory storage for conversation context
conversation_history = []

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Chat API. Use the /chat endpoint to interact with the chatbot."}

@app.post("/chat", response_model=Response)
async def chat(message: Message):
    try:
        logging.info(f"Received message: {message.text}")

        # Add user message to the conversation history
        conversation_history.append({"role": "user", "content": message.text})

        # Simulate "typing..." or "waiting..." indicator
        await asyncio.sleep(1)  # Simulating AI processing time

        # Generate a response from the language model
        prompt = "\n".join([msg["content"] for msg in conversation_history])
        logging.info(f"Generated prompt: {prompt}")

        result = llm.invoke(prompt)
        logging.info(f"Model response: {result.content}")

        # Add the model's response to the conversation history
        conversation_history.append({"role": "bot", "content": result.content})

        # Return the response as a plain string
        return Response(reply=result.content)
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    logging.info("Shutting down the application...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
