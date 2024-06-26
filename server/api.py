import uuid
import logging
import traceback
from datetime import datetime

from fastapi.responses import JSONResponse
from fastapi import APIRouter, HTTPException, Request, Body

from langchain_google_genai import ChatGoogleGenerativeAI

from .chat_memory import memory, HumanMessage, AIMessage
from .database import supabase
from .schemas import Message, chat_schema, Session
from .utils import simulate_ai_processing_time
from .summarizer import generate_summary  # Import the summarizer

# Initialize logging
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# Load environment variables
import os
from dotenv import load_dotenv

load_dotenv()

# Get the Google API key
google_api_key = os.getenv("GOOGLE_API_KEY")

# Initialize the language model with a valid API key
llm = ChatGoogleGenerativeAI(model="models/gemini-pro", google_api_key=google_api_key)


@router.get("/")
async def read_root():
    return {
        "message": "Welcome to the Chat API. Use the /chat endpoint to interact with the chatbot."
    }


@router.post("/session", response_model=Session)
async def create_session(email_id: str = Body(..., embed=True)):
    try:
        session_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        response = (
            supabase.table("sessions")
            .insert(
                {
                    "session_id": session_id,
                    "started_at": timestamp,
                    "last_updated": timestamp,
                    "email_id": email_id,
                }
            )
            .execute()
        )

        logging.info(f"Supabase response: {response}")

        if not response.data:
            logging.error(f"Failed to create session: {response}")
            raise HTTPException(status_code=500, detail="Failed to create session.")

        return Session(session_id=session_id, email_id=email_id)
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: chat_schema):
    try:
        logging.info(f"Received message: {request.text}")

        session_id = request.session_id
        logging.info(f"Using session ID: {session_id}")

        # Simulate "typing..." or "waiting..." indicator
        await simulate_ai_processing_time()

        # Add the user message to memory
        human_message = HumanMessage(content=request.text)
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
        response = (
            supabase.table("chat_history")
            .insert(
                [
                    {
                        "session_id": session_id,
                        "message": request.text,
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

        logging.info(f"Supabase response: {response}")

        if not response.data:
            logging.error(f"Failed to store chat history: {response}")
            raise HTTPException(status_code=500, detail="Failed to store chat history.")

        # Generate a summary for the session
        summary = generate_summary(memory.chat_memory.messages)

        # Store the summary in Supabase
        summary_response = (
            supabase.table("summaries")
            .upsert(
                {
                    "session_id": session_id,
                    "summary": summary,
                }
            )
            .execute()
        )
        logging.info(f"Summary store response: {summary_response}")

        # Update session last updated timestamp
        update_response = (
            supabase.table("sessions")
            .update({"last_updated": datetime.utcnow().isoformat()})
            .eq("session_id", session_id)
            .execute()
        )
        logging.info(f"Session update response: {update_response}")

        return {"reply": ai_response}
    except Exception as e:
        traceback.print_exc()
        error_message = {"detail": f"An error occurred: {str(e)}"}
        logging.critical(error_message)
        return JSONResponse(content=error_message, status_code=500)
