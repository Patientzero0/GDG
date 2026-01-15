from gtts import gTTS
import io

def text_to_speech(text: str) -> bytes:
    """
    Converts text to speech using gTTS and returns the audio content as bytes.
    """
    try:
        tts = gTTS(text=text, lang='en', slow=False)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        return audio_fp.read()
    except Exception as e:
        print(f"Error converting text to speech with gTTS: {e}")
        # Fallback for empty text or other gTTS issues
        fallback_text = "I'm sorry, I cannot generate speech for that response."
        tts_fallback = gTTS(text=fallback_text, lang='en', slow=False)
        audio_fp_fallback = io.BytesIO()
        tts_fallback.write_to_fp(audio_fp_fallback)
        audio_fp_fallback.seek(0)
        return audio_fp_fallback.read()

