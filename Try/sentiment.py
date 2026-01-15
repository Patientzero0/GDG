import os
import json
import logging
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SentimentAnalyzer")

class SentimentIntentAnalyzer:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.error("GROQ_API_KEY not found in environment")
            raise ValueError("GROQ_API_KEY is required")
        
        self.client = Groq(api_key=api_key)

    def analyze(self, message: str) -> dict:
        """Analyze customer message for intent, sentiment, and language"""
        
        prompt = f"""Analyze this customer message and extract key information:

Message: "{message}"

Provide analysis in the following format (JSON only, no other text):

{{
  "intent": "refund" | "quality_complaint" | "general",
  "sentiment_score": 0-10,
  "language": "en" | "hi"
}}

Intent Guidelines:
- "refund": Customer explicitly wants money back or mentions refund/return
- "quality_complaint": Customer reports issues with food quality, damage, missing items, wrong order
- "general": Greetings, questions, or unclear intent

Sentiment Scale:
- 0-3: Angry/Frustrated (harsh words, complaints, demanding tone)
- 4-6: Neutral (factual, calm reporting)
- 7-10: Happy/Satisfied (positive words, grateful tone)

Language:
- "en": English
- "hi": Hindi

Examples:
"I want my money back" → {{"intent": "refund", "sentiment_score": 3, "language": "en"}}
"The pizza was burnt" → {{"intent": "quality_complaint", "sentiment_score": 4, "language": "en"}}
"Hello" → {{"intent": "general", "sentiment_score": 6, "language": "en"}}
"Order XRD123 has missing items" → {{"intent": "quality_complaint", "sentiment_score": 4, "language": "en"}}

Respond with ONLY the JSON object."""

        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="openai/gpt-oss-120b",
                temperature=0.1
            )
            
            content = response.choices[0].message.content.strip()
            logger.info(f"Raw sentiment response: {content[:100]}")
            
            # Extract JSON from response
            if "{" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                json_str = content[start:end]
                result = json.loads(json_str)
                
                # Validate and set defaults
                if "intent" not in result:
                    result["intent"] = "general"
                if "sentiment_score" not in result:
                    result["sentiment_score"] = 5
                if "language" not in result:
                    result["language"] = "en"
                
                # Ensure sentiment is in valid range
                result["sentiment_score"] = max(0, min(10, result["sentiment_score"]))
                
                logger.info(f"Parsed analysis: {result}")
                return result
            else:
                raise ValueError("No JSON found in response")
                
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            # Safe fallback
            return {
                "intent": "general",
                "sentiment_score": 5,
                "language": "en"
            }