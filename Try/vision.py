import os
import json
import base64
import logging
import requests
import re # Added for robust parsing
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger("VisionAnalyzer")

class VisionAnalyzer:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = "allenai/molmo-2-8b:free"
        
        if not self.api_key:
            logger.error("OPENROUTER_API_KEY not found in environment")
            raise ValueError("OPENROUTER_API_KEY not found")

    def _image_to_data_url(self, image_path: str) -> str:
        try:
            img = Image.open(image_path).convert("RGB")
            img.thumbnail((768, 768)) 
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode()
            return f"data:image/jpeg;base64,{b64}"
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return ""

    def analyze_product_image(self, image_path: str, context: str = "") -> dict:
        logger.info(f"Analyzing Image: {image_path} | Context: {context}")
        
        image_data_url = self._image_to_data_url(image_path)
        if not image_data_url: 
            return {"status": "acceptable", "description": "Image upload failed"}

        # --- UPDATED PROMPT (Handles Wrong Items) ---
        prompt = (
            f"You are a strict Refund Auditor.\n"
            f"=== CLAIM CONTEXT ===\n{context}\n=====================\n\n"
            
            "INSTRUCTIONS:\n"
            "1. IDENTITY CHECK: Is this image related to the claim? (Reject selfies/floors).\n"
            "2. DEFECT CHECK: Look for the SPECIFIC issue mentioned in context:\n"
            "   - 'Burnt/Damage': Look for charring or crushed packaging.\n"
            "   - 'Spilled': Look for liquids outside container.\n"
            "   - 'Wrong Item': Compare Image vs 'Order' details in context. If they are different, it is DEFECTIVE.\n"
            "   - 'Missing Items': Count visible items. If count < expected, it is DEFECTIVE.\n\n"
            
            "VERDICT RULES:\n"
            "- 'defective': If there is PROOF of Damage, Spillage, Missing Items, OR Wrong Item sent.\n"
            "- 'acceptable': If the food matches the order description and looks edible (even if messy).\n"
            "- 'rejected': If the image is not food/irrelevant.\n\n"
            
            "Return ONLY JSON:\n"
            "{\"status\":\"defective\", \"description\":\"Image shows Pizza, but Order expected Gulab Jamun (Wrong Item).\"}\n"
            "{\"status\":\"acceptable\", \"description\":\"Food matches order and appears edible.\"}"
        )

        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000"
                },
                data=json.dumps({
                    "model": self.model,
                    "temperature": 0.1,
                    "messages": [{"role": "user", "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_data_url}}
                    ]}]
                }),
                timeout=45
            )
            
            response.raise_for_status()
            raw_content = response.json()["choices"][0]["message"]["content"]
            logger.info(f"AI Raw Output: {raw_content}")

            # --- ROBUST JSON PARSING (Fixes the crash) ---
            # 1. Remove Markdown code blocks if present
            clean_content = re.sub(r'```json\s*|\s*```', '', raw_content).strip()
            
            # 2. Find the first '{' and last '}'
            start = clean_content.find("{")
            end = clean_content.rfind("}")
            
            if start != -1 and end != -1:
                json_str = clean_content[start:end+1]
                return json.loads(json_str)
            else:
                logger.error("No JSON found in response")
                return {"status": "acceptable", "description": "AI Parse Error"}

        except Exception as e:
            logger.error(f"Vision API Failed: {e}")
            return {"status": "acceptable", "description": "Technical Verification Failed"}

if __name__ == "__main__":
    # Test block
    analyzer = VisionAnalyzer()
    
    # 1. Setup a dummy image file for testing if you don't have one
    # This creates a tiny red square image so the code doesn't crash on file not found
    test_path = "test_image.jpg"
    if not os.path.exists(test_path):
        img = Image.new('RGB', (100, 100), color = 'red')
        img.save(test_path)
        print(f"Created temporary test image: {test_path}")

    # 2. Test Scenario: Wrong Item
    test_context = "Order: 10x Gulab Jamun. Complaint: 'I received a Pizza instead'."
    
    print(f"\n--- Testing Context: {test_context} ---")
    verdict = analyzer.analyze_product_image(test_path, context=test_context)
    print("Final Verdict:", verdict)
    
