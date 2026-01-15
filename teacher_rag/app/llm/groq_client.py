import re # NEW: Import re for regex parsing
from groq import Groq
from app.config.settings import settings

def get_groq_response(question: str, context: list[dict]) -> str:
    """
    Generates a response from the Groq API based on a question and context.
    Context is a list of dictionaries, so we extract the 'text' from each.
    """
    client = Groq(api_key=settings.GROQ_API_KEY)
    
    # Extract only the text from the context dictionaries
    context_texts = [c['text'] for c in context if 'text' in c]
    context_str = "\n".join(context_texts)
    
    prompt = f"""
    You are a helpful teaching assistant. Provide a clear and concise explanation to answer the user's question.
    Ensure the explanation is easy to understand for someone new to the topic, using simple language and avoiding jargon where possible, or explaining it clearly.
    If relevant context from a lecture transcript is provided below, prioritize using that information.
    If the context is not relevant or insufficient, use your general knowledge to answer.
    Under no circumstances should you mention whether you are using the provided context or your general knowledge in your answer.
    Present the answer in a teaching style, similar to how a teacher would explain a concept to a student,
    but be direct and avoid conversational filler, direct questions to the student, or explicit pauses for response.
    Focus solely on explaining the concept effectively without asking questions or prompting for interaction.
    If the question is in hindi, please provide the answer in hindi.
    Context:
    ---
    {context_str}
    ---
    
    Question: {question}
    
    Answer:
    """
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant", # Or another suitable model on Groq
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return "I'm sorry, I encountered an error while trying to generate a response."

def get_sentiment(text: str) -> tuple[str, float]:
    """
    Determines the sentiment of the given text using the Groq API.
    Returns a tuple: (category: 'Positive'|'Neutral'|'Negative', score: float between -1.0 and 1.0).
    """
    client = Groq(api_key=settings.GROQ_API_KEY)

    prompt = f"""
    Analyze the sentiment of the following text. Provide two pieces of information:
    1. A categorical label: 'Positive', 'Neutral', or 'Negative'.
    2. A numerical score representing the sentiment intensity, ranging from -1.0 (most negative) to 1.0 (most positive).
    
    Format your response as "Category: [LABEL], Score: [SCORE]".

    Text: "{text}"

    Sentiment:
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant", # Or another suitable model on Groq
            temperature=0.0 # Set temperature to 0 for more deterministic output
        )
        response_content = chat_completion.choices[0].message.content.strip()
        
        # Parse the response: "Category: [LABEL], Score: [SCORE]"
        category_match = re.search(r"Category:\s*(\w+)", response_content)
        score_match = re.search(r"Score:\s*([-+]?\d*\.?\d+)", response_content)

        category = "Neutral"
        score = 0.0

        if category_match:
            parsed_category = category_match.group(1)
            if parsed_category in ['Positive', 'Neutral', 'Negative']:
                category = parsed_category

        if score_match:
            try:
                parsed_score = float(score_match.group(1))
                if -1.0 <= parsed_score <= 1.0:
                    score = parsed_score
            except ValueError:
                pass # Fallback to default score if parsing fails
        
        # Ensure consistency between category and score (optional, but good for robustness)
        if category == "Positive" and score < 0: score = abs(score)
        if category == "Negative" and score > 0: score = -abs(score)
        if category == "Neutral" and score != 0: score = 0.0 # If neutral, score should be 0

        return category, score
        
    except Exception as e:
        print(f"Error calling Groq API for sentiment analysis: {e}")
        return "Neutral", 0.0 # Default to neutral if an error occurs

def get_recommendation(chat_history: list[dict], current_ai_answer: str) -> str | None:
    """
    Generates a learning recommendation based on the chat history and the current AI answer.
    Returns a string recommendation or None if no suitable recommendation can be made.
    """
    client = Groq(api_key=settings.GROQ_API_KEY)

    # Construct a concise summary of the recent conversation
    conversation_summary = ""
    if chat_history:
        for entry in chat_history[-5:]: # Look at the last 5 entries for context
            conversation_summary += f"User: {entry.get('user_prompt', 'N/A')}\n"
            conversation_summary += f"AI: {entry.get('ai_response', 'N/A')}\n"
    
    prompt = f"""
    You are an intelligent teaching assistant specialized in suggesting next learning steps.
    Based on the following recent conversation history and the AI's last explanation,
    recommend a logical next topic or concept for the user to explore.
    Assume the user has just understood the last concept (the current AI answer).
    Make the recommendation concise (1-2 sentences) and encouraging.
    Do not repeat the last explained concept.

    Recent Conversation History:
    ---
    {conversation_summary if conversation_summary else "No recent conversation history."}
    ---

    Current AI Answer (User just understood this):
    ---
    {current_ai_answer}
    ---

    Recommendation for next learning step:
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant", # Use the same model as others
            temperature=0.7 # Allow some creativity for recommendations
        )
        recommendation = chat_completion.choices[0].message.content.strip()
        # Basic check to ensure it's not just an empty or generic response
        if recommendation and len(recommendation.split()) > 5:
            return recommendation
        else:
            return None
    except Exception as e:
        print(f"Error calling Groq API for recommendation: {e}")
        return None