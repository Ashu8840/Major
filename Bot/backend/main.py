"""
FastAPI Server - Chat API endpoint for the RAG assistant.

Endpoints:
  POST /chat         - Send a question, get an answer
  POST /chat/history - Get conversation history for a user
  POST /chat/reset   - Clear conversation history for a user
  GET  /health       - Health check endpoint
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add parent directory to path so backend module imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.rag_engine import RAGEngine, ConversationMemory

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Global instances
rag_engine = RAGEngine()
conversation_memory = ConversationMemory(max_history=20)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the RAG engine on startup."""
    logger.info("Starting RAG Engine initialization...")
    rag_engine.initialize()
    logger.info("RAG Engine ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="SoulSpace RAG Assistant",
    description="AI assistant that answers questions about SoulSpace using RAG",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - open to all origins (public RAG assistant API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---

class ChatRequest(BaseModel):
    question: str = Field(default=None)
    message: str = Field(default=None)
    userId: str = Field(default="anonymous")
    temperature: float = Field(default=0.7)
    maxLength: int = Field(default=150)


class ChatResponse(BaseModel):
    answer: str = Field(default=None)
    response: str = Field(default=None)
    sources: list = []
    confidence: float = 0.0


class HistoryRequest(BaseModel):
    userId: str = "anonymous"


class ResetRequest(BaseModel):
    userId: str = "anonymous"


# --- API Endpoints ---

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Send a question and get an AI-generated answer from the knowledge base.
    Supports both 'question' and 'message' fields for backwards compatibility.
    """
    # Support both field names from frontend
    user_question = request.question or request.message
    if not user_question or not user_question.strip():
        raise HTTPException(status_code=400, detail="Question/message is required.")

    user_question = user_question.strip()
    user_id = request.userId

    logger.info(f"Chat request from {user_id}: {user_question[:100]}")

    # Store user message in conversation memory
    conversation_memory.add_message(user_id, "user", user_question)

    # Generate answer using RAG pipeline
    result = rag_engine.generate_answer(user_question)

    # Store bot response in conversation memory
    conversation_memory.add_message(user_id, "bot", result["answer"])

    logger.info(f"Response confidence: {result['confidence']}")

    # Return both 'answer' and 'response' for frontend compatibility
    return {
        "answer": result["answer"],
        "response": result["answer"],
        "sources": result["sources"],
        "confidence": result["confidence"],
    }


@app.post("/chat/history")
async def get_history(request: HistoryRequest):
    """Get conversation history for a user."""
    history = conversation_memory.get_history(request.userId)
    return {
        "history": history,
        "count": len(history),
    }


@app.post("/chat/reset")
async def reset_conversation(request: ResetRequest):
    """Clear conversation history for a user."""
    conversation_memory.clear_history(request.userId)
    logger.info(f"Conversation reset for user: {request.userId}")
    return {"message": "Conversation reset successfully."}


@app.get("/health")
async def health_check():
    """Health check endpoint - reports if RAG engine is ready."""
    return {
        "status": "healthy" if rag_engine.is_ready else "initializing",
        "model_loaded": rag_engine.is_ready,
        "documents_loaded": len(rag_engine.documents),
        "index_size": rag_engine.vector_store.index.ntotal if rag_engine.vector_store.index else 0,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
