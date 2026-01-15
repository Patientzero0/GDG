from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import numpy as np
import base64
import json
import os
from datetime import datetime
from typing import Optional, List, Any

from app.rag.embedder import embedder
from app.rag.retriever import retriever
from app.llm.groq_client import get_groq_response, get_sentiment, get_recommendation
from app.speech.tts_client import text_to_speech
from app.config.settings import settings, BASE_DIR

CHAT_HISTORY_FILE = "backend/chat_history.json"

def append_chat_history(entry: dict):
    """Appends a new chat entry to the chat history JSON file."""
    history = []
    chat_history_path = os.path.join(BASE_DIR, CHAT_HISTORY_FILE)
    if os.path.exists(chat_history_path):
        with open(chat_history_path, 'r', encoding='utf-8') as f:
            try:
                history = json.load(f)
            except json.JSONDecodeError:
                history = []
    
    history.append(entry)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(chat_history_path), exist_ok=True)
    
    with open(chat_history_path, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4, ensure_ascii=False)

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sentiment_score: float
    avatar_state: str
    memory_update: List[Any]
    next_topic: Optional[str] = None
    audio: Optional[str] = None # Keep audio for frontend playback if needed

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    question = request.question
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    print(f"\nUser Question: {question}")

    try:
        # 1. Sentiment Analysis
        print("Analyzing sentiment...")
        sentiment_category, sentiment_score = get_sentiment(question)
        print(f"Sentiment: {sentiment_category} (Score: {sentiment_score})")

        # Map to Avatar State
        avatar_state = "neutral"
        if sentiment_score > 0.3:
            avatar_state = "happy"
        elif sentiment_score < -0.3:
            avatar_state = "concerned"
        
        # 2. RAG Pipeline
        print("Running RAG pipeline...")
        query_embedding = embedder.generate_embeddings([question])
        retrieved_chunks = retriever.retrieve(query_embedding)
        
        # 3. Generate Answer
        print("Generating answer...")
        llm_answer = get_groq_response(question, retrieved_chunks)
        
        # 4. Generate Audio (Optional but good for avatar)
        # print("Generating audio...")
        # audio_content = text_to_speech(llm_answer)
        # audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        audio_base64 = None # Skip for now to speed up, or uncomment if needed

        # 5. Recommendation (Next Topic)
        print("Generating recommendation...")
        # Load history for context
        chat_history_path = os.path.join(BASE_DIR, CHAT_HISTORY_FILE)
        current_chat_history = []
        if os.path.exists(chat_history_path):
            with open(chat_history_path, 'r', encoding='utf-8') as f:
                try:
                    current_chat_history = json.load(f)
                except:
                    current_chat_history = []
        
        next_topic = get_recommendation(current_chat_history, llm_answer)

        # 6. Memory Update
        chat_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_prompt": question,
            "ai_response": llm_answer,
            "sentiment_score": sentiment_score,
            "avatar_state": avatar_state
        }
        append_chat_history(chat_entry)
        
        # Return unified response
        return ChatResponse(
            answer=llm_answer,
            sentiment_score=sentiment_score,
            avatar_state=avatar_state,
            memory_update=[chat_entry], # Return the new entry as update
            next_topic=next_topic,
            audio=audio_base64
        )

    except Exception as e:
        print(f"Error in /chat endpoint: {e}")
        # Fallback response if RAG fails (e.g. index not found)
        # The user asked to trigger search against sample_transcript.txt if YouTube fails.
        # Since ingestion happens at startup, if we are here, it means retrieval failed or something else.
        # We'll return a safe error response or try a direct LLM answer without context.
        return ChatResponse(
            answer="I'm having trouble accessing my knowledge base right now. Could you try again?",
            sentiment_score=0.0,
            avatar_state="concerned",
            memory_update=[],
            next_topic=None
        )