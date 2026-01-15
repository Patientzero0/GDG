import os
from pydantic_settings import BaseSettings
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# Corrected BASE_DIR to point to the project root (teacher_rag)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Debugging .env file loading
env_file_path = os.path.join(BASE_DIR, ".env")
print(f"DEBUG: Attempting to load .env from: {env_file_path}")
print(f"DEBUG: .env file exists: {os.path.exists(env_file_path)}")

class Settings(BaseSettings):
    GROQ_API_KEY: str
    YOUTUBE_API_KEY: str
    
    # Paths
    VECTOR_STORE_PATH: str = os.path.join(BASE_DIR, "app", "data", "vector_store", "faiss_index.bin")
    CHUNKS_PATH: str = os.path.join(BASE_DIR, "app", "data", "vector_store", "chunks.json")
    
    # Embedding model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # RAG settings
    NUM_RETRIEVED_DOCS: int = 3
    
    # YouTube video whitelist for ingestion
    YOUTUBE_VIDEO_IDS: list[str] = [
        "Mvsse13F2_g", # Example video: 3Blue1Brown on Neural Networks
        "C_zFhWdM4_c" # Example video: StatQuest on PCA
    ]

    class Config:
        env_file = env_file_path
        env_file_encoding = 'utf-8'

settings = Settings()
