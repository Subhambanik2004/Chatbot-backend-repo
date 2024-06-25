from pydantic import BaseModel


class Message(BaseModel):
    text: str


class chat_schema(BaseModel):
    text: str
    session_id: str


class Session(BaseModel):
    session_id: str
