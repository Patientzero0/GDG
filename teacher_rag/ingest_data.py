import sys
import os
import json

# This is to ensure that the script can find the 'app' module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config.settings import settings
from app.ingest.youtube_transcript import get_youtube_transcripts, chunk_text
from app.rag.embedder import embedder
from app.rag.retriever import retriever
import numpy as np

def main():
    print("Starting offline data ingestion pipeline...")

    # 1. Fetch transcripts
    print(f"Fetching transcripts for video IDs: {settings.YOUTUBE_VIDEO_IDS}")
    transcripts_data = get_youtube_transcripts(settings.YOUTUBE_VIDEO_IDS)
    
    # If no transcripts fetched, use sample data
    if not transcripts_data:
        print("WARNING: Could not fetch YouTube transcripts. Using sample data instead...")
        sample_file = os.path.join(os.path.dirname(__file__), "app", "data", "sample_transcripts.json")
        if os.path.exists(sample_file):
            with open(sample_file, 'r', encoding='utf-8') as f:
                sample_data = json.load(f)
                transcripts_data = [{'video_id': 'sample', 'transcript': t} for t in sample_data.get('transcripts', [])] # Wrap sample transcripts in the new dict format
                print(f"Loaded {len(transcripts_data)} sample transcripts.")
        else:
            print("No transcripts were fetched and no sample data found. Exiting.")
            return
    
    all_chunks = []
    all_chunk_texts = []
    total_characters = 0

    print("Chunking transcripts...")
    for item in transcripts_data:
        video_id = item['video_id']
        transcript = item['transcript']
        total_characters += len(transcript)
        
        chunks_for_video = chunk_text(video_id=video_id, text=transcript)
        all_chunks.extend(chunks_for_video)
        all_chunk_texts.extend([chunk['text'] for chunk in chunks_for_video])

    print(f"Total characters in fetched transcripts: {total_characters}")
    print(f"Created {len(all_chunks)} chunks.")

    if not all_chunks:
        print("No chunks were created. Exiting.")
        return

    # 3. Generate embeddings
    print("Generating embeddings for chunks...")
    embeddings = embedder.generate_embeddings(all_chunk_texts)
    print(f"Embeddings generated with shape: {embeddings.shape}")

    # 4. Store chunks and embeddings
    print("Building and saving FAISS index and chunks...")
    retriever.build_and_save_index(np.array(embeddings), all_chunks)
    print("Ingestion complete.")
    print(f"FAISS index saved to: {settings.VECTOR_STORE_PATH}")
    print(f"Chunks saved to: {settings.CHUNKS_PATH}")


if __name__ == "__main__":
    main()