from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import numpy as np
import os

from app.api import ask
from app.rag.retriever import retriever
from app.rag.embedder import embedder
from app.ingest.youtube_transcript import get_youtube_transcripts, chunk_text
from app.config.settings import settings
from app.api.ask import CHAT_HISTORY_FILE # Import CHAT_HISTORY_FILE

def auto_ingest_if_needed():
    """Auto-run ingestion if vector store doesn't exist"""
    if os.path.exists(settings.VECTOR_STORE_PATH):
        return  # Already ingested
    
    print("\n🔄 Auto-ingesting data (first run)..\n")
    
    # 1. Fetch transcripts
    transcripts = get_youtube_transcripts(settings.YOUTUBE_VIDEO_IDS)
    
    # Fallback to sample data
    if not transcripts:
        print("Loading sample data...")
        sample_file = os.path.join(os.path.dirname(__file__), "data", "sample_transcripts.json")
        if os.path.exists(sample_file):
            with open(sample_file, 'r', encoding='utf-8') as f:
                sample_data = json.load(f)
                transcripts = sample_data.get('transcripts', [])
    
    if not transcripts:
        print("⚠️ No transcripts available for ingestion")
        return
    
    # 2. Process
    full_text = " ".join(transcripts)
    chunks = chunk_text(full_text)
    
    if not chunks:
        print("⚠️ No chunks created")
        return
    
    # 3. Generate embeddings & save
    print(f"Generating embeddings for {len(chunks)} chunks...")
    embeddings = embedder.generate_embeddings(chunks)
    retriever.build_and_save_index(np.array(embeddings), chunks)
    print("✅ Data ingestion complete!\n")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-ingest on startup if needed
    auto_ingest_if_needed() 
    
    # Load the RAG model on startup
    print("Loading RAG model...")
    try:
        # DEBUG: Log path and existence just before loading
        print(f"DEBUG: Checking for vector store at: {settings.VECTOR_STORE_PATH}")
        print(f"DEBUG: Vector store exists: {os.path.exists(settings.VECTOR_STORE_PATH)}")

        if not os.path.exists(settings.VECTOR_STORE_PATH):
            print("WARNING: Vector store not found. Please run the ingestion script 'ingest_data.py'.")
            app.state.rag_ready = False
        else:
            retriever.load_index()
            app.state.rag_ready = True
            print("RAG model loaded successfully.")
    except Exception as e:
        print(f"Failed to load RAG model: {e}")
        app.state.rag_ready = False
    yield
    # Clean up resources if needed on shutdown
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ask.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Teacher RAG API"}

@app.get("/health")
def health_check():
    return {"status": "ok", "rag_ready": app.state.rag_ready}
