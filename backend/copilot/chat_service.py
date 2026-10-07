import json
import logging
import requests
from typing import Any, Dict, List

from .services import _get_api_config, extract_intent, fetch_candidates

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """
You are EcoNext AI, an intelligent, modern shopping assistant for the EcoNext e-commerce platform.
Your goal is to help users find products, compare options, and make smarter, eco-friendly shopping decisions.

Rules:
1. Be concise, friendly, and helpful. Use markdown for formatting (bullet points, bold text).
2. NEVER hallucinate or invent products, prices, or specifications.
3. If the user asks for a product, and context about matching products is provided below, use ONLY that context to answer.
4. If no product context matches or is provided, politely tell the user you couldn't find exactly what they were looking for, but can help them with other queries.
5. If the user greets you or asks a general question, respond naturally.
6. Remember you are talking to a shopper on the EcoNext website. Keep responses relatively short so they fit nicely in a chat bubble.
""".strip()


def run_chat_pipeline(message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Run a chat turn.
    1. Extract intent from the latest message.
    2. Fetch candidate products from DB.
    3. Construct full prompt including system rules, history, and new message + product context.
    4. Call Gemini.
    """
    try:
        # Step 1: Extract intent to fetch relevant products
        intent = extract_intent(message)
        
        # Step 2: Fetch candidates
        candidates = fetch_candidates(intent)
        
        # Format the candidate context
        product_context = ""
        products_data = []
        if candidates:
            context_parts = []
            for p in candidates[:8]:
                desc = (p.description or "")[:150] + "..." if len(p.description or "") > 150 else (p.description or "")
                context_parts.append(
                    f"- {p.name} (ID: {p.id})\n  Price: ₹{p.current_price}\n  Category: {p.category.name if p.category_id else 'Unknown'}\n  Description: {desc}"
                )
                products_data.append({
                    "id": p.id,
                    "name": p.name,
                    "price": float(p.current_price),
                    "image_url": p.image_url,
                })
            product_context = "\n\n[CONTEXT: Available Products in Database matching query]\n" + "\n".join(context_parts)
            product_context += "\n[Use the above products to answer the user's request if relevant. Do not mention that you were given a context block.]"
        
        # Step 3: Construct messages payload
        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
        
        # Add history
        for msg in history:
            role = msg.get("role")
            content = msg.get("content")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})
                
        # Add the final user message with context appended
        final_user_content = message + product_context
        messages.append({"role": "user", "content": final_user_content})
        
        # Step 4: Call Gemini
        config = _get_api_config()
        if not config["api_key"]:
            logger.warning("GEMINI_API_KEY configured: false")
            raise ValueError("GEMINI_API_KEY environment variable is not set")
            
        logger.info("GEMINI_API_KEY configured: true (model: %s)", config["model"])

        payload = {
            "model": config["model"],
            "messages": messages,
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {config['api_key']}",
            "Content-Type": "application/json",
        }
        
        reply_text = None
        try:
            response = requests.post(config["api_url"], headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                reply_text = data["choices"][0]["message"]["content"].strip()
        except Exception:
            logger.info("Chat pipeline OpenAI endpoint attempt failed; trying Google native endpoint")
            native_url = f"https://generativelanguage.googleapis.com/v1beta/models/{config['model']}:generateContent"
            native_contents = []
            for m in messages:
                role = "user" if m.get("role") in ["user", "system"] else "model"
                native_contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
            native_payload = {
                "contents": native_contents,
                "generationConfig": {"temperature": 0.7}
            }
            native_headers = {
                "x-goog-api-key": config["api_key"],
                "Content-Type": "application/json",
            }
            native_resp = requests.post(native_url, headers=native_headers, json=native_payload, timeout=30)
            native_resp.raise_for_status()
            native_data = native_resp.json()
            reply_text = native_data["candidates"][0]["content"]["parts"][0]["text"].strip()

        if not reply_text:
            reply_text = "I received your message, but was unable to generate a response. Please try again."

        return {
            "success": True,
            "response": reply_text,
            "reply": reply_text,
            "products": products_data
        }
        
    except Exception as e:
        err_msg = str(e)
        api_key = config.get("api_key", "") if "config" in locals() else ""
        if api_key and api_key in err_msg:
            err_msg = err_msg.replace(api_key, "[REDACTED]")
        logger.error("Chat pipeline failed: %s", err_msg)
        fallback_msg = "Sorry, I'm having trouble connecting right now. Please try again."
        return {
            "success": False,
            "response": fallback_msg,
            "reply": fallback_msg,
            "products": []
        }
