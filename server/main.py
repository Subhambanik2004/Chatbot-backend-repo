from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from langchain.memory.chat_memory import HumanMessage, AIMessage
from dotenv import load_dotenv
from supabase import create_client, Client
import os
import logging
import asyncio
import uuid
from datetime import datetime

# Initialize logging
logging.basicConfig(level=logging.INFO)

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

# Get the Google API key and Supabase URL and Key from environment variables
google_api_key = os.getenv("GOOGLE_API_KEY")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

# Initialize the language model with a valid API key
llm = ChatGoogleGenerativeAI(model="models/gemini-pro", google_api_key=google_api_key)

# Initialize memory
memory = ConversationBufferMemory()

# Initialize Supabase client
supabase: Client = create_client(supabase_url, supabase_key)


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


async def simulate_ai_processing_time():
    await asyncio.sleep(1)  # Simulating AI processing time


@app.post("/chat", response_model=Response)
async def chat(message: Message):
    try:
        logging.info(f"Received message: {message.text}")

        # Simulate "typing..." or "waiting..." indicator
        await simulate_ai_processing_time()  # Simulating AI processing time

        # Add the user message to memory
        human_message = HumanMessage(content=message.text)
        memory.chat_memory.add_message(human_message)

        # Construct the prompt for the language model
        prompt = "\n".join(
            [
                (
                    f"Human: {msg.content}"
                    if isinstance(msg, HumanMessage)
                    else f"AI: {msg.content}"
                )
                for msg in memory.chat_memory.messages
            ]
        )
        logging.info(f"Generated prompt: {prompt}")

        # Generate a response from the language model
        result = llm.invoke(prompt)
        logging.info(f"Model response: {result.content}")

        # Remove the "AI:" prefix if it exists
        ai_response = result.content.replace("AI: ", "", 1)

        # Add the AI's response to memory
        ai_message = AIMessage(content=ai_response)
        memory.chat_memory.add_message(ai_message)

        # Store chat history in Supabase
        session_id = str(uuid.uuid4())
        response = (
            supabase.table("chat_history")
            .insert(
                [
                    {
                        "session_id": session_id,
                        "message": message.text,
                        "role": "human",
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    {
                        "session_id": session_id,
                        "message": ai_response,
                        "role": "ai",
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                ]
            )
            .execute()
        )

        # Inspect the structure of the response object
        logging.info(f"Supabase response: {response}")

        if "error" in response:
            logging.error(f"Failed to store chat history: {response['error']}")
            raise HTTPException(status_code=500, detail="Failed to store chat history.")

        # Return the response as a plain string
        return Response(reply=ai_response)
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("shutdown")
async def shutdown_event():
    logging.info("Shutting down the application...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
