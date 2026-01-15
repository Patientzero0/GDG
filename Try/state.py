from typing import TypedDict, Optional, Literal

class AgentState(TypedDict):
    """State for the refund agent"""
    session_id: str
    user_message: str
    sentiment_score: Optional[int]
    intent: Optional[Literal["refund", "quality_complaint", "general"]]
    order_id: Optional[str]
    complaint: Optional[str]
    image_path: Optional[str]
    image_verdict: Optional[dict]
    refund_status: Optional[Literal["approved", "denied", "pending"]]
    email: Optional[str]
    current_node: str
    response_message: str
    needs_input: bool
    conversation_history: list