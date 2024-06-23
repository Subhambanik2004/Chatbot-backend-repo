from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from dotenv import load_dotenv
import os
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

# Load environment variables from .env file
load_dotenv()

# Get the Google API key from environment variables
google_api_key = os.getenv("GOOGLE_API_KEY")

# Initialize the language model with a valid API key
llm = ChatGoogleGenerativeAI(model="models/gemini-pro", google_api_key=google_api_key)

# Initialize memory
memory = ConversationBufferMemory()


# Data model for messages
class Message(BaseModel):
    text: str


class Response(BaseModel):
    reply: str


@app.get("/")
async def read_root():
    return {
        "message": "Welcome to the Chat API. Use the /chat endpoint to interact with the chatbot."
    }


@app.post("/chat", response_model=Response)
async def chat(message: Message):
    try:
        logging.info(f"Received message: {message.text}")

        # Simulate "typing..." or "waiting..." indicator
        await asyncio.sleep(1)  # Simulating AI processing time

        # Add the user message to memory
        memory.save_context({"input": message.text}, {"output": ""})

        # Construct the prompt for the language model
        prompt = "\n".join(
            [
                f"Human: {context['input']}\nAI: {context['output']}"
                for context in memory.chat_memory
            ]
        )
        logging.info(f"Generated prompt: {prompt}")

        # Generate a response from the language model
        result = llm.invoke(prompt)
        logging.info(f"Model response: {result.content}")

        # Update the last entry in memory with the actual response
        memory.chat_memory[-1] = {"input": message.text, "output": result.content}

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
