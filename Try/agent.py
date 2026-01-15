import json
import logging
import re
import operator
from typing import TypedDict, Annotated, List, Optional, Literal
from langgraph.graph import StateGraph, END
from sentiment import SentimentIntentAnalyzer
from vision import VisionAnalyzer
from notifications import EmailSender, ReportGenerator
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger("RefundAgent")

# --- STATE DEFINITION (CRITICAL FOR MEMORY) ---
class AgentState(TypedDict):
    session_id: str
    user_message: str
    sentiment_score: int
    intent: str
    language: str
    order_id: Optional[str]
    complaint: Optional[str]
    image_path: Optional[str]
    image_verdict: Optional[dict]
    refund_status: str
    email: Optional[str]
    current_node: str
    response_message: str
    needs_input: bool
    # 'operator.add' ensures history is APPENDED, not overwritten
    conversation_history: Annotated[List[dict], operator.add]

class RefundAgent:
    def __init__(self):
        self.sentiment_analyzer = SentimentIntentAnalyzer()
        self.vision_analyzer = VisionAnalyzer()
        self.email_service = EmailSender()
        
        # Load Orders DB
        try:
            with open('data/orders.json', 'r') as f:
                self.orders_db = json.load(f)['orders']
        except FileNotFoundError:
            logger.error("CRITICAL: orders.json not found!")
            self.orders_db = {}

        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)
        
        workflow.add_node("intent_reviewer", self.intent_reviewer_node)
        workflow.add_node("collector", self.collector_node)
        workflow.add_node("image_analyzer", self.image_analyzer_node)
        workflow.add_node("decision", self.decision_node)
        workflow.add_node("finalizer", self.finalizer_node)
        
        workflow.set_entry_point("intent_reviewer")
        
        # Routing Logic
        workflow.add_conditional_edges("intent_reviewer", self.route_after_intent, 
            {"general": END, "continue": "collector", "finalize": "finalizer"})
        workflow.add_conditional_edges("collector", self.route_after_collector, 
            {"need_input": END, "ready": "image_analyzer"})
        workflow.add_edge("image_analyzer", "decision")
        
        # Strict Decision Routing
        workflow.add_conditional_edges("decision", self.route_after_decision, 
            {"ask_email": END, "finalize": "finalizer"})
            
        workflow.add_edge("finalizer", END)
        
        return workflow.compile()

    # --- HELPER: History Manager ---
    def _update_history(self, role: str, content: str):
        return [{"role": role, "content": content}]

    def _is_valid_email(self, text: str) -> bool:
        if not text: return False
        return re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text) is not None

    # --- NODE 1: INTENT ---
    def intent_reviewer_node(self, state: AgentState) -> AgentState:
        state["current_node"] = "intent_reviewer"
        user_msg = state["user_message"].strip()
        state["conversation_history"] = self._update_history("user", user_msg)

        # Email Capture (Only if Approved)
        if state.get("refund_status") == "approved":
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', user_msg)
            if email_match:
                state["email"] = email_match.group(0)
                state["intent"] = "finalize_flow"
                return state
            elif not state.get("email"):
                state["response_message"] = "Please provide a valid email address."
                state["conversation_history"] = self._update_history("assistant", state["response_message"])
                state["needs_input"] = True
                return state

        # Check Flow Continuity
        if state.get("intent") in ["refund", "quality_complaint"] and not state.get("refund_status"):
             state["needs_input"] = False 
             return state

        # Analyze Intent
        analysis = self.sentiment_analyzer.analyze(user_msg)
        state.update({
            "sentiment_score": analysis["sentiment_score"],
            "intent": analysis["intent"],
            "language": analysis.get("language", "en")
        })
        
        if analysis["intent"] == "general":
            state["response_message"] = "I can help with refunds or complaints. Do you have an Order ID?"
            state["conversation_history"] = self._update_history("assistant", state["response_message"])
            state["needs_input"] = False 
        else:
            state["needs_input"] = True 
            
        return state
    
    def route_after_intent(self, state: AgentState) -> str:
        if state.get("intent") == "finalize_flow": return "finalize"
        if state["intent"] == "general": return "general"
        return "continue"

    # --- NODE 2: COLLECTOR ---
    def collector_node(self, state: AgentState) -> AgentState:
        state["current_node"] = "collector"
        user_msg = state["user_message"]
        
        # 1. Order ID (XRD format)
        id_match = re.search(r'\bXRD\d{4,6}\b', user_msg, re.IGNORECASE)
        if id_match:
            state["order_id"] = id_match.group(0).upper()

        if not state.get("order_id"):
            state["response_message"] = "Please provide your Order ID (e.g., XRD12345)."
            state["conversation_history"] = self._update_history("assistant", state["response_message"])
            state["needs_input"] = True
            return state

        if state["order_id"] not in self.orders_db:
            state["response_message"] = f"Order '{state['order_id']}' not found in database."
            state["conversation_history"] = self._update_history("assistant", state["response_message"])
            state["order_id"] = None
            state["needs_input"] = True
            return state

        # 2. Complaint
        if not state.get("complaint"):
            clean_msg = user_msg.replace(state["order_id"], "").strip()
            if len(clean_msg) > 10:
                state["complaint"] = clean_msg
            else:
                state["response_message"] = "What is the issue with this order?"
                state["conversation_history"] = self._update_history("assistant", state["response_message"])
                state["needs_input"] = True
                return state

        # 3. Image
        if not state.get("image_path"):
            state["response_message"] = "Please upload an image of the received items."
            state["conversation_history"] = self._update_history("assistant", state["response_message"])
            state["needs_input"] = True
            return state
        
        state["needs_input"] = False
        state["response_message"] = "Analyzing..."
        return state
    
    def route_after_collector(self, state: AgentState) -> str:
        return "need_input" if state.get("needs_input") else "ready"

    # --- NODE 3: VISION (Context Aware) ---
    def image_analyzer_node(self, state: AgentState) -> AgentState:
        if state.get("image_verdict"): return state
        state["current_node"] = "image_analyzer"
        
        order = self.orders_db[state["order_id"]]
        item_list = ", ".join([f"{i['quantity']}x {i['name']}" for i in order['items']])
        
        # Context Injection
        vision_context = f"Order ID: {state['order_id']}\nExpected Items: {item_list}\nUser Complaint: '{state['complaint']}'"
        
        logger.info(f"Invoking Vision with Context: {vision_context}")
        
        verdict = self.vision_analyzer.analyze_product_image(state["image_path"], context=vision_context)
        state["image_verdict"] = verdict
        return state

    # --- NODE 4: DECISION (Strict Logic) ---
    def decision_node(self, state: AgentState) -> AgentState:
        state["current_node"] = "decision"
        verdict = state["image_verdict"]
        
        # STRICT CHECK: Only approve if status is explicitly 'defective'
        if verdict.get("status") == "defective":
            state["refund_status"] = "approved"
            if state.get("email") and self._is_valid_email(state["email"]):
                state["response_message"] = "Refund approved. Sending receipt..."
                state["needs_input"] = False
            else:
                state["response_message"] = "✅ Refund Approved! Please provide your email address for the receipt."
                state["conversation_history"] = self._update_history("assistant", state["response_message"])
                state["needs_input"] = True
        else:
            # DENIAL PATH
            state["refund_status"] = "denied"
            state["response_message"] = f"❌ Refund Denied. Analysis: {verdict.get('description', 'Product acceptable')}."
            state["conversation_history"] = self._update_history("assistant", state["response_message"])
            state["needs_input"] = False # End conversation
            
        return state

    def route_after_decision(self, state: AgentState) -> str:
        # Only ask for email if APPROVED and missing email
        if state["refund_status"] == "approved" and not state.get("email"):
            return "ask_email"
        return "finalize"

    # --- NODE 5: FINALIZER ---
    def finalizer_node(self, state: AgentState) -> AgentState:
        
        # Only process refund if approved
        if state["refund_status"] == "approved":
            if not self._is_valid_email(state.get("email")):
                state["response_message"] = "I still need a valid email address."
                state["conversation_history"] = self._update_history("assistant", state["response_message"])
                state["needs_input"] = True
                return state
            
            # Send Email
            order_data = self.orders_db.get(state["order_id"], {})
            receipt_body = ReportGenerator.generate_receipt(order_data, state["image_verdict"])
            self.email_service.send_receipt(state["email"], f"Refund: {state['order_id']}", receipt_body)
            
            state["response_message"] = f"Success! Receipt sent to {state['email']}."
            state["conversation_history"] = self._update_history("assistant", state["response_message"])

        # Log Transaction
        try:
            with open('refunds.json', 'r') as f: refunds = json.load(f)
        except: refunds = []
        
        refunds.append({
            "session_id": state["session_id"],
            "order_id": state["order_id"],
            "status": state["refund_status"],
            "email": state.get("email")
        })
        
        with open('refunds.json', 'w') as f:
            json.dump(refunds, f, indent=2)

        state["needs_input"] = False
        return state