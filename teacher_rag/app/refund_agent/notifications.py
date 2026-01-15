import smtplib
import ssl
import os
import uuid
import logging
from datetime import datetime
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EmailUtils")

class ReportGenerator:
    """Generates formatted refund receipts"""
    
    @staticmethod
    def generate_receipt(order_data: dict, verdict: dict, session_id: str = None) -> str:
        """Generate a formatted refund receipt"""
        txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        items = order_data.get("items", [])
        item_lines = []
        for item in items:
            qty = item.get('quantity', 1)
            name = item.get('name', 'Unknown Item')
            price = item.get('price', 0)
            item_lines.append(f"   • {qty}x {name} - ₹{price}")
        
        items_text = "\n".join(item_lines) if item_lines else "   • No items listed"
        
        receipt = f"""
========================================
         REFUND CONFIRMATION
========================================

Transaction ID : {txn_id}
Date          : {timestamp}
Order ID      : {order_data.get('order_id', 'N/A')}

----------------------------------------
         REFUND DETAILS
----------------------------------------

Status        : APPROVED ✓
Amount        : ₹{order_data.get('total_amount', 0)}

Items Refunded:
{items_text}

Reason        : {verdict.get('description', 'Issue verified by AI system')}

----------------------------------------
         PAYMENT INFORMATION
----------------------------------------

Refund will be credited to your original
payment method within 5-7 business days.

========================================
Thank you for your patience.
We apologize for the inconvenience.
========================================

Questions? Contact: support@company.com
Order ID: {order_data.get('order_id', 'N/A')}
"""
        return receipt


class EmailSender:
    """Sends emails using SMTP"""
    
    def __init__(self):
        self.sender = os.getenv("EMAIL_SENDER")
        self.password = os.getenv("EMAIL_PASSWORD")
        
        if not self.sender or not self.password:
            logger.warning("Email credentials not configured. Email sending disabled.")

    def send_receipt(self, recipient: str, body: str, order_id: str = None) -> bool:
        """Send refund receipt via email"""
        
        if not self.sender or not self.password:
            logger.error("Email credentials not configured")
            return False
        
        if not recipient:
            logger.error("No recipient email provided")
            return False
        
        try:
            msg = EmailMessage()
            msg.set_content(body)
            msg['Subject'] = f"Refund Approved ✅ - Order {order_id or 'N/A'}"
            msg['From'] = self.sender
            msg['To'] = recipient

            context = ssl.create_default_context()
            
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                server.login(self.sender, self.password)
                server.send_message(msg)
            
            logger.info(f"Receipt sent successfully to {recipient}")
            return True
            
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed. Check EMAIL_SENDER and EMAIL_PASSWORD")
            return False
        except Exception as e:
            logger.error(f"Email sending error: {e}")
            return False
