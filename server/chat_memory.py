from langchain.memory import ConversationBufferMemory
from langchain.memory.chat_memory import HumanMessage, AIMessage

# Initialize memory
memory = ConversationBufferMemory()

# Export HumanMessage and AIMessage for use in other modules
__all__ = ["memory", "HumanMessage", "AIMessage"]
