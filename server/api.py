import os
import uuid
import logging
import traceback
from datetime import datetime
from typing import List


from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationSummaryMemory
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

from langchain_community.chat_message_histories import PostgresChatMessageHistory

from .database import supabase
from .schemas import Message, chat_schema, Session
from .utils import simulate_ai_processing_time

# Initialize logging
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# Load environment variables
from dotenv import load_dotenv

load_dotenv()

# Get the Google API key
google_api_key = os.getenv("GOOGLE_API_KEY")

# Initialize the language model with a valid API key
llm = ChatGoogleGenerativeAI(model="models/gemini-pro", google_api_key=google_api_key)

# Define the prompt template
prompt = PromptTemplate(
    input_variables=["human_message"], template="Human: {human_message}\nAI:"
)

# Setup PostgresChatMessageHistory
connection_string = os.getenv("POSTGRES_CONNECTION_STRING")


def get_summary_memory(llm, chat_memory, memory_key="history", input_key="question"):
    return ConversationSummaryMemory(
        llm=llm, memory_key=memory_key, input_key=input_key, chat_memory=chat_memory
    )


def get_llm_chain(llm, memory, prompt, verbose=False):
    return LLMChain(llm=llm, memory=memory, verbose=verbose, prompt=prompt)


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

        new_session = {
            "session_id": session_id,
            "email_id": email_id,
            "started_at": timestamp,
        }

        return JSONResponse(content=new_session, status_code=200)
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{email_id}", response_model=List[Session])
async def get_sessions(email_id: str):
    try:
        response = (
            supabase.table("sessions").select("*").eq("email_id", email_id).execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="No sessions found.")

        return JSONResponse(content=response.data, status_code=200)
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
        # await simulate_ai_processing_time()

        # Initialize PostgresChatMessageHistory
        # make it a function
        chat_history = PostgresChatMessageHistory(
            connection_string=connection_string, session_id=session_id
        )

        # Initialize ConversationSummaryMemory with the LLM
        memory = get_summary_memory(llm=llm, chat_memory=chat_history)

        # Add the user message to memory
        memory.chat_memory.add_user_message(request.text)

        # Create an LLMChain with the memory and prompt
        chain = get_llm_chain(llm=llm, memory=memory, prompt=prompt)

        # Generate a response from the language model
        result = chain.invoke({"human_message": request.text, "question": request.text})
        ai_response = result["text"] if isinstance(result, dict) else result
        logging.info(f"Model response: {ai_response}")

        # Add the AI's response to memory
        memory.chat_memory.add_ai_message(ai_response)

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
        # summary = memory.load_memory_variables({"input": ""})["history"]

        # Store the summary in Supabase
        # summary_response = (
        #     supabase.table("summaries")
        #     .upsert(
        #         {
        #             "session_id": session_id,
        #             "summary": summary,
        #         }
        #     )
        #     .execute()
        # )
        # logging.info(f"Summary store response: {summary_response}")

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


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    try:
        logging.info(f"Fetching history for session_id: {session_id}")
        response = (
            supabase.table("chat_history")
            .select("*")
            .eq("session_id", session_id)
            .order("timestamp")
            .execute()
        )

        if not response.data:
            logging.warning(f"No chat history found for session ID: {session_id}")
            raise HTTPException(
                status_code=404, detail="No chat history found for this session ID."
            )

        logging.info(f"History data: {response.data}")
        return response.data
    except Exception as e:
        logging.error(f"An error occurred: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, detail="An internal server error occurred."
        )
