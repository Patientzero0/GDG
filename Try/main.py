from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import uuid
from agent import RefundAgent, AgentState
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FastAPIServer")

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage (in-memory with proper initialization)
sessions = {}

# Agent instance
agent = RefundAgent()

# Ensure directories exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("data", exist_ok=True)

def initialize_session(session_id: str) -> AgentState:
    """Initialize a new session with proper defaults"""
    return {
        "session_id": session_id,
        "user_message": "",
        "sentiment_score": 5,
        "intent": "",
        "language": "en",
        "order_id": None,
        "complaint": None,
        "image_path": None,
        "image_verdict": None,
        "refund_status": "",
        "email": None,
        "current_node": "",
        "response_message": "",
        "needs_input": True,
        "conversation_history": []
    }

@app.post("/chat")
async def chat(
    session_id: str = Form(...),
    message: str = Form(None),
    image: UploadFile = File(None),
    email: str = Form(None)
):
    """Main chat endpoint with enhanced session management"""
    
    try:
        # Initialize or retrieve session
        if session_id not in sessions:
            logger.info(f"New session created: {session_id}")
            sessions[session_id] = initialize_session(session_id)
        
        # Get existing state - THIS IS CRITICAL
        state = sessions[session_id].copy()
        
        logger.info(f"[{session_id}] Loaded state - Intent: {state.get('intent')}, OrderID: {state.get('order_id')}, Status: {state.get('refund_status')}")
        
        # Update ONLY the new user message
        if message:
            state["user_message"] = message.strip()
            logger.info(f"[{session_id}] User: {message[:50]}...")
            
            # Extract XRD order ID if present and we don't have one yet
            import re
            xrd_match = re.search(r'\bXRD\d{4,6}\b', message, re.IGNORECASE)
            if xrd_match:
                detected_id = xrd_match.group(0).upper()
                if not state.get("order_id"):
                    state["order_id"] = detected_id
                    logger.info(f"Order ID detected: {state['order_id']}")
                elif state.get("order_id") != detected_id:
                    # User mentioned a different order ID
                    logger.info(f"New order ID detected: {detected_id} (previous: {state.get('order_id')})")
                    state["order_id"] = detected_id
        
        if email:
            state["email"] = email.strip()
            logger.info(f"Email provided: {state['email']}")
        
        if image:
            # Save uploaded image with unique filename
            filename = f"{session_id}_{uuid.uuid4().hex[:8]}_{image.filename}"
            image_path = f"uploads/{filename}"
            
            with open(image_path, "wb") as f:
                content = await image.read()
                f.write(content)
            
            state["image_path"] = image_path
            logger.info(f"Image saved: {image_path}")
        
        # Run agent workflow with PRESERVED state
        logger.info(f"Running agent for session {session_id} with preserved context")
        result = agent.graph.invoke(state)
        
        # CRITICAL: Update session with COMPLETE result
        sessions[session_id] = result
        
        logger.info(f"[{session_id}] New state - Intent: {result.get('intent')}, OrderID: {result.get('order_id')}, Status: {result.get('refund_status')}")
        
        # Build response
        response = {
            "session_id": result["session_id"],
            "message": result["response_message"],
            "sentiment_score": result.get("sentiment_score", 5),
            "current_node": result["current_node"],
            "refund_status": result.get("refund_status", ""),
            "needs_input": result.get("needs_input", True),
            "order_id": result.get("order_id"),
            "intent": result.get("intent"),
            "conversation_history": result.get("conversation_history", [])
        }
        
        logger.info(f"[{session_id}] Assistant: {result['response_message'][:50]}...")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve session state"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return sessions[session_id]

@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Clear session data"""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session cleared"}
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/sessions")
async def list_sessions():
    """List all active sessions (for debugging)"""
    return {
        "active_sessions": len(sessions),
        "session_ids": list(sessions.keys())
    }

@app.get("/")
async def root():
    """Serve the UI"""
    if os.path.exists("ui.html"):
        return FileResponse("ui.html")
    return {"message": "Refund Agent API is running. UI not found."}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_sessions": len(sessions)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)