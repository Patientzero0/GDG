from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
import logging
from .agent import RefundAgent, AgentState
import re

logger = logging.getLogger("RefundAgentRouter")

router = APIRouter(prefix="/refund", tags=["Refund Agent"])

# Session storage (in-memory)
sessions = {}

# Agent instance
agent = RefundAgent()

# Ensure directories exist
os.makedirs("app/data/uploads", exist_ok=True)
os.makedirs("app/data", exist_ok=True)

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

@router.post("/chat")
async def chat(
    session_id: str = Form(...),
    message: str = Form(None),
    image: UploadFile = File(None),
    email: str = Form(None)
):
    """Main chat endpoint"""
    
    try:
        # Initialize or retrieve session
        if session_id not in sessions:
            logger.info(f"New session created: {session_id}")
            sessions[session_id] = initialize_session(session_id)
        
        # Get existing state
        state = sessions[session_id].copy()
        
        # Update ONLY the new user message
        if message:
            state["user_message"] = message.strip()
            
            # Extract XRD order ID if present and we don't have one yet
            xrd_match = re.search(r'\bXRD\d{4,6}\b', message, re.IGNORECASE)
            if xrd_match:
                detected_id = xrd_match.group(0).upper()
                if not state.get("order_id"):
                    state["order_id"] = detected_id
                elif state.get("order_id") != detected_id:
                    state["order_id"] = detected_id
        
        if email:
            state["email"] = email.strip()
        
        if image:
            # Save uploaded image with unique filename
            # Save to app/data/uploads
            filename = f"{session_id}_{uuid.uuid4().hex[:8]}_{image.filename}"
            image_path = f"app/data/uploads/{filename}"
            
            with open(image_path, "wb") as f:
                content = await image.read()
                f.write(content)
            
            state["image_path"] = image_path
            logger.info(f"Image saved: {image_path}")
        
        # Run agent workflow with PRESERVED state
        result = agent.graph.invoke(state)
        
        # Update session with COMPLETE result
        sessions[session_id] = result
        
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
        
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve session state"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return sessions[session_id]

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Clear session data"""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Session cleared"}
    raise HTTPException(status_code=404, detail="Session not found")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_sessions": len(sessions)
    }

@router.get("/")
async def ui():
    """Serve the UI"""
    # Assuming ui.html is in the same directory as this file (app/refund_agent/ui.html)
    # But uvicorn runs from root.
    # if we want to serve it, we can use absolute path or relative to root.
    # File is at teacher_rag/app/refund_agent/ui.html
    ui_path = "app/refund_agent/ui.html"
    if os.path.exists(ui_path):
        return FileResponse(ui_path)
    # Check if absolute path works
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ui_path_abs = os.path.join(base_dir, "ui.html")
    if os.path.exists(ui_path_abs):
        return FileResponse(ui_path_abs)
    
    return {"message": "Refund Agent API is running. UI not found."}
