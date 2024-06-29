import asyncio
import uuid


async def simulate_ai_processing_time():
    await asyncio.sleep(1)  # Simulating AI processing time


def generate_unique_session_id() -> str:
    return str(uuid.uuid4())


# def get_session_id(request: Request) -> str:
#     session_id = request.headers.get("session_id")
#     if not session_id:
#         raise HTTPException(status_code=400, detail="Session ID is required")
#     return session_id
