from youtube_transcript_api import YouTubeTranscriptApi
import re

def get_youtube_transcripts(video_ids: list[str]) -> list[dict]:
    """
    Fetches and cleans transcripts for a list of YouTube video IDs.
    Returns a list of dictionaries, each containing 'video_id' and 'transcript'.
    """
    transcripts_data = []
    for video_id in video_ids:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
            full_transcript = " ".join([d['text'] for d in transcript_list])
            cleaned_transcript = re.sub(r'\[.*?\]', '', full_transcript) # Remove timestamps and other bracketed text
            cleaned_transcript = re.sub(r'\s+', ' ', cleaned_transcript).strip() # Normalize whitespace
            transcripts_data.append({'video_id': video_id, 'transcript': cleaned_transcript})
        except Exception as e:
            print(f"Could not retrieve transcript for video {video_id}: {e}")
    return transcripts_data

def chunk_text(video_id: str, text: str, min_tokens: int = 200, max_tokens: int = 500) -> list[dict]:
    """
    Splits a text into chunks of a specified token range, associating each chunk with a video_id.
    Each chunk is a dictionary containing 'video_id', 'chunk_id', and 'text'.
    """
    words = text.split()
    chunks_data = []
    current_chunk_words = []
    
    for i, word in enumerate(words):
        current_chunk_words.append(word)
        # Check if the current chunk is within the desired length
        if len(current_chunk_words) >= min_tokens:
            if len(current_chunk_words) > max_tokens:
                chunk_text_content = " ".join(current_chunk_words)
                chunks_data.append({
                    'video_id': video_id,
                    'chunk_id': f"{video_id}-{len(chunks_data)}",
                    'text': chunk_text_content
                })
                current_chunk_words = []
            elif word.endswith(('.', '?', '!')) or i == len(words) - 1: # End of sentence or end of text
                chunk_text_content = " ".join(current_chunk_words)
                chunks_data.append({
                    'video_id': video_id,
                    'chunk_id': f"{video_id}-{len(chunks_data)}",
                    'text': chunk_text_content
                })
                current_chunk_words = []

    # Add the last remaining chunk if it's not empty
    if current_chunk_words:
        chunk_text_content = " ".join(current_chunk_words)
        chunks_data.append({
            'video_id': video_id,
            'chunk_id': f"{video_id}-{len(chunks_data)}",
            'text': chunk_text_content
        })
        
    # Filter out any very short chunks that might have been created
    return [chunk for chunk in chunks_data if len(chunk['text'].split()) > 5]

