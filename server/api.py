import os
import tempfile
import uuid
import logging
import traceback
from datetime import datetime
from typing import List
import json

from fastapi import APIRouter, HTTPException, Body, File, UploadFile
from fastapi.responses import JSONResponse

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.memory import ConversationSummaryMemory
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.chat_message_histories import PostgresChatMessageHistory

from .database import supabase
from .schemas import Message, chat_schema, Session
from .utils import simulate_ai_processing_time

# Initialize logging
logging.basicConfig(level=logging.INFO)

router: APIRouter = APIRouter()

# Load environment variables
from dotenv import load_dotenv

load_dotenv()

# Get the Google API key
google_api_key: str = os.getenv("GOOGLE_API_KEY")

# Initialize the language model with a valid API key
llm: ChatGoogleGenerativeAI = ChatGoogleGenerativeAI(
    model="models/gemini-pro", google_api_key=google_api_key
)

# Define the prompt template
prompt: PromptTemplate = PromptTemplate(
    input_variables=["human_message"], template="Human: {human_message}\nAI:"
)

# Setup PostgresChatMessageHistory
connection_string: str = os.getenv("POSTGRES_CONNECTION_STRING")

embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")


def get_summary_memory(
    llm: ChatGoogleGenerativeAI,
    chat_memory: PostgresChatMessageHistory,
    memory_key: str = "history",
    input_key: str = "question",
) -> ConversationSummaryMemory:
    """Returns a ConversationSummaryMemory instance."""
    return ConversationSummaryMemory(
        llm=llm, memory_key=memory_key, input_key=input_key, chat_memory=chat_memory
    )


def get_llm_chain(
    llm: ChatGoogleGenerativeAI,
    memory: ConversationSummaryMemory,
    prompt: PromptTemplate,
    verbose: bool = False,
) -> LLMChain:
    """Returns an LLMChain instance."""
    return LLMChain(llm=llm, memory=memory, verbose=verbose, prompt=prompt)


def should_query_pdfs(message: str) -> bool:
    """Determines if the message requires querying PDFs."""
    # Define a list of keywords or phrases that might indicate the need to query PDFs
    keywords = ["document", "PDF", "file", "report"]
    # Check if any keyword is present in the message
    return any(keyword in message.lower() for keyword in keywords)


@router.get("/")
async def read_root() -> dict:
    """Root endpoint that provides a welcome message."""
    return {
        "message": "Welcome to the Chat API. Use the /chat endpoint to interact with the chatbot."
    }


@router.post("/session", response_model=Session)
async def create_session(email_id: str = Body(..., embed=True)) -> JSONResponse:
    """Creates a new chat session."""
    try:
        session_id: str = str(uuid.uuid4())
        timestamp: str = datetime.utcnow().isoformat()

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

        new_session: dict = {
            "session_id": session_id,
            "email_id": email_id,
            "started_at": timestamp,
        }

        return JSONResponse(content=new_session, status_code=200)
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{email_id}", response_model=List[Session])
async def get_sessions(email_id: str) -> JSONResponse:
    """Fetches all sessions for a given email ID."""
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
async def chat(request: chat_schema) -> dict:
    """Handles chat requests and generates responses from the language model."""
    try:
        logging.info(f"Received message: {request.text}")

        session_id: str = request.session_id
        logging.info(f"Using session ID: {session_id}")

        # Simulate "typing..." or "waiting..." indicator
        # await simulate_ai_processing_time()

        # Initialize PostgresChatMessageHistory
        chat_history: PostgresChatMessageHistory = PostgresChatMessageHistory(
            connection_string=connection_string, session_id=session_id
        )

        # Initialize ConversationSummaryMemory with the LLM
        memory: ConversationSummaryMemory = get_summary_memory(
            llm=llm, chat_memory=chat_history
        )

        # Add the user message to memory
        memory.chat_memory.add_user_message(request.text)

        # Create an LLMChain with the memory and prompt
        chain: LLMChain = get_llm_chain(llm=llm, memory=memory, prompt=prompt)

        # Generate a response from the language model
        result = chain.invoke({"human_message": request.text, "question": request.text})
        ai_response: str = result["text"] if isinstance(result, dict) else result
        logging.info(f"Model response: {ai_response}")

        # Check if the message requires querying PDFs
        vector_store_used = False
        if should_query_pdfs(request.text):
            # Query the vector store for related documents
            pdf_responses = await query_pdf(request.text)

            # If there are relevant PDFs, add them to the response
            if pdf_responses:
                vector_store_used = True
                ai_response += "\n\nI found some relevant information in the following documents:\n"
                for response in pdf_responses:
                    ai_response += f"- {response}\n"

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

        # Update session last updated timestamp
        update_response = (
            supabase.table("sessions")
            .update({"last_updated": datetime.utcnow().isoformat()})
            .eq("session_id", session_id)
            .execute()
        )
        logging.info(f"Session update response: {update_response}")

        return {"reply": ai_response, "vector_store_used": vector_store_used}
    except Exception as e:
        traceback.print_exc()
        error_message = {"detail": f"An error occurred: {str(e)}"}
        logging.critical(error_message)
        return JSONResponse(content=error_message, status_code=500)


@router.get("/history/{session_id}")
async def get_history(session_id: str) -> list:
    """Fetches the chat history for a given session ID."""
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
            logging.warning(f"No chat history found for session_id: {session_id}")
            raise HTTPException(status_code=404, detail="Chat history not found.")

        return response.data
    except Exception as e:
        error_message = {"detail": f"An error occurred: {str(e)}"}
        logging.error(error_message)
        return JSONResponse(content=error_message, status_code=500)


# def get_embedding(document_content: str) -> List[float]:
#     """Generate embeddings using Google Generative AI Embeddings."""
#     # Initialize embeddings model
#     embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

#     # Generate embeddings for the document content
#     embedding = embeddings_model.embed([document_content])[0]

#     return embedding


@router.post("/add_pdf")
async def add_pdf(file: UploadFile = File(...)) -> dict:
    """Adds a PDF to the document store and generates embeddings."""
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(file.file.read())

        # Load the document
        loader = PyPDFLoader(file_path=temp_file_path, extract_images=True)
        pages = loader.load_and_split()

        # Initialize an empty list to store documents data
        documents_to_insert = []

        # Process each page in the PDF
        for page in pages:
            document_id = str(uuid.uuid4())
            document_content = page.page_content
            document_metadata = json.dumps(page.metadata)

            # Generate embeddings for the document content
            embedding = embeddings_model.embed_documents([document_content])[0]

            # Prepare document data for insertion
            document_data = {
                "id": document_id,
                "content": document_content,
                "metadata": document_metadata,
                "embedding": embedding,
            }

            # Append document data to the list
            documents_to_insert.append(document_data)

        # Insert all documents in one batch operation
        response = supabase.table("documents").insert(documents_to_insert).execute()

        # Check if insertion was successful
        if not response.data:
            logging.error("Error inserting documents")
            raise HTTPException(status_code=500, detail="Error inserting documents.")

        return {"status": "PDF added successfully"}

    except Exception as e:
        logging.error(f"An error occurred: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, detail="An error occurred while adding the PDF."
        )

    finally:
        # Clean up the temporary file
        if temp_file_path:
            os.remove(temp_file_path)


async def query_pdf(query: str) -> list:
    """Query the vector store for relevant documents."""
    try:
        query_embedding = embeddings_model.embed([query])[0]  # Use the embed method

        response = supabase.rpc(
            "match_documents", {"query_embedding": query_embedding}
        ).execute()

        if not response.data:
            return []

        return [doc["content"] for doc in response.data]
    except Exception as e:
        logging.error(f"Error querying PDFs: {traceback.format_exc()}")
        return []
