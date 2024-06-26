from typing import List, Union
from langchain.memory.chat_memory import HumanMessage, AIMessage


def generate_summary(messages: List[Union[HumanMessage, AIMessage]]) -> str:
    conversation = "\n".join(
        [
            (
                f"Human: {msg.content}"
                if isinstance(msg, HumanMessage)
                else f"AI: {msg.content}"
            )
            for msg in messages
        ]
    )
    # Implement a simple summary function. You can replace this with a more sophisticated algorithm.
    return f"Summary: {conversation[:200]}..."  # Truncate to the first 200 characters for brevity.
