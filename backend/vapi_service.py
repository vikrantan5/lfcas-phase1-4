# Vapi Voice AI Service for LFCAS
import os
import json
import httpx
from typing import Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

VAPI_API_KEY = os.environ.get("VAPI_API_KEY")
VAPI_BASE_URL = "https://api.vapi.ai"


# Multilingual prompts for voice AI
VOICE_PROMPTS = {
    "english": {
        "greeting": "Hello! I'm your AI legal assistant. I'm here to help you with your family law issue. Could you please tell me what legal problem you're facing?",
        "case_type_question": "Based on what you've told me, could you clarify if this is related to: divorce, alimony, child custody, dowry harassment, domestic violence, or something else?",
        "details_question": "Could you provide more details about your situation? For example, when did this start, where are you located, and what is your main concern?",
        "location_question": "Which city or district are you located in? This will help me recommend local advocates.",
        "urgency_question": "How urgent is your situation? Do you need immediate legal assistance?",
        "documents_question": "Do you have any relevant documents like marriage certificate, police complaints, or medical records?",
        "closing": "Thank you for sharing your situation. I'm now analyzing your case and will provide you with legal insights, recommended advocates, and next steps. Please wait a moment."
    },
    "hindi": {
        "greeting": "नमस्ते! मैं आपका AI कानूनी सहायक हूं। मैं आपकी पारिवारिक कानूनी समस्या में मदद के लिए यहां हूं। कृपया मुझे बताएं कि आप किस कानूनी समस्या का सामना कर रहे हैं?",
        "case_type_question": "आपने जो बताया उसके आधार पर, क्या यह इनमें से किसी से संबंधित है: तलाक, गुजारा भत्ता, बच्चे की हिरासत, दहेज उत्पीड़न, घरेलू हिंसा, या कुछ और?",
        "details_question": "क्या आप अपनी स्थिति के बारे में अधिक विवरण दे सकते हैं? उदाहरण के लिए, यह कब शुरू हुआ, आप कहां स्थित हैं, और आपकी मुख्य चिंता क्या है?",
        "location_question": "आप किस शहर या जिले में स्थित हैं? इससे मुझे स्थानीय वकीलों की सिफारिश करने में मदद मिलेगी।",
        "urgency_question": "आपकी स्थिति कितनी जरूरी है? क्या आपको तत्काल कानूनी सहायता की आवश्यकता है?",
        "documents_question": "क्या आपके पास कोई प्रासंगिक दस्तावेज हैं जैसे विवाह प्रमाणपत्र, पुलिस शिकायत, या चिकित्सा रिकॉर्ड?",
        "closing": "आपकी स्थिति साझा करने के लिए धन्यवाद। मैं अब आपके मामले का विश्लेषण कर रहा हूं और आपको कानूनी जानकारी, अनुशंसित वकील और अगले कदम प्रदान करूंगा। कृपया एक क्षण प्रतीक्षा करें।"
    },
    "bengali": {
        "greeting": "নমস্কার! আমি আপনার AI আইনি সহায়ক। আমি আপনার পারিবারিক আইনের সমস্যায় সাহায্য করতে এখানে আছি। আপনি কোন আইনি সমস্যার সম্মুখীন হচ্ছেন তা আমাকে বলুন?",
        "case_type_question": "আপনি যা বলেছেন তার ভিত্তিতে, এটি কি এর সাথে সম্পর্কিত: ডিভোর্স, ভরণপোষণ, সন্তানের হেফাজত, যৌতুক হয়রানি, গার্হস্থ্য সহিংসতা, বা অন্য কিছু?",
        "details_question": "আপনার পরিস্থিতি সম্পর্কে আরও বিস্তারিত বলতে পারেন? উদাহরণস্বরূপ, এটি কখন শুরু হয়েছিল, আপনি কোথায় অবস্থিত, এবং আপনার প্রধান উদ্বেগ কী?",
        "location_question": "আপনি কোন শহর বা জেলায় অবস্থিত? এটি আমাকে স্থানীয় আইনজীবীদের সুপারিশ করতে সাহায্য করবে।",
        "urgency_question": "আপনার পরিস্থিতি কতটা জরুরি? আপনার কি তাৎক্ষণিক আইনি সহায়তা প্রয়োজন?",
        "documents_question": "আপনার কি কোনো প্রাসঙ্গিক নথি আছে যেমন বিবাহ শংসাপত্র, পুলিশ অভিযোগ, বা চিকিৎসা রেকর্ড?",
        "closing": "আপনার পরিস্থিতি শেয়ার করার জন্য ধন্যবাদ। আমি এখন আপনার মামলা বিশ্লেষণ করছি এবং আপনাকে আইনি অন্তর্দৃষ্টি, প্রস্তাবিত আইনজীবী এবং পরবর্তী পদক্ষেপ প্রদান করব। অনুগ্রহ করে একটু অপেক্ষা করুন।"
    }
}


class VapiService:
    """Service for managing Vapi voice AI interactions"""
    
    def __init__(self):
        self.api_key = VAPI_API_KEY
        self.base_url = VAPI_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_assistant(self, language: str = "english", user_context: Dict = None) -> Dict:
        """Create a Vapi assistant for voice conversation"""
        
        prompts = VOICE_PROMPTS.get(language, VOICE_PROMPTS["english"])
        
        assistant_config = {
            "name": f"LFCAS Legal Assistant ({language})",
            "model": {
                "provider": "openai",
                "model": "gpt-4o",
                "temperature": 0.7,
                "systemPrompt": f"""You are a compassionate and professional AI legal assistant for family law cases in India.
                
Language: {language.upper()}
Speak ONLY in {language}.

Your role:
1. Greet the user warmly
2. Ask about their legal problem
3. Ask follow-up questions to understand:
   - Case type (divorce, alimony, custody, dowry, domestic violence)
   - Location (city/district)
   - Key details and timeline
   - Urgency level
   - Available documents
4. Be empathetic and professional
5. Keep questions clear and simple
6. Don't provide legal advice - just gather information
7. After gathering information, thank them and inform that analysis is being prepared

Important: 
- Be culturally sensitive
- Use simple language
- Show empathy for their situation
- Never ask for personal identifying information
- Focus on legal facts only

Start with: {prompts['greeting']}
"""
            },
            "voice": {
                "provider": "11labs",
                "voiceId": "sarah" if language == "english" else "hindi_female" if language == "hindi" else "bengali_female"
            },
            "firstMessage": prompts['greeting'],
            "endCallFunctionEnabled": True,
            "recordingEnabled": True,
            "transcriber": {
                "provider": "deepgram",
                "model": "nova-2",
                "language": "en" if language == "english" else "hi" if language == "hindi" else "bn"
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/assistant",
                    headers=self.headers,
                    json=assistant_config,
                    timeout=30.0
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def start_call(self, assistant_id: str, phone_number: Optional[str] = None) -> Dict:
        """Start a voice call with the assistant"""
        
        call_config = {
            "assistantId": assistant_id,
            "type": "webCall"  # or "phoneCall" if phone_number provided
        }
        
        if phone_number:
            call_config["type"] = "phoneCall"
            call_config["customer"] = {
                "number": phone_number
            }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/call",
                    headers=self.headers,
                    json=call_config,
                    timeout=30.0
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def get_call_details(self, call_id: str) -> Dict:
        """Get details of a specific call including transcript"""
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/call/{call_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    async def end_call(self, call_id: str) -> Dict:
        """End an ongoing call"""
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/call/{call_id}/end",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                return {
                    "success": True,
                    "data": response.json()
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }
    
    def extract_case_info_from_transcript(self, transcript: str, language: str = "english") -> Dict:
        """Extract structured case information from conversation transcript"""
        
        # This is a simple extraction - in production, you'd use NLP/LLM
        case_info = {
            "case_type": None,
            "location": None,
            "description": transcript,
            "urgency": "medium",
            "has_documents": False,
            "additional_details": {}
        }
        
        # Simple keyword matching (enhance with NLP in production)
        transcript_lower = transcript.lower()
        
        # Detect case type
        if any(word in transcript_lower for word in ["divorce", "talaq", "तलाक", "ডিভোর্স"]):
            case_info["case_type"] = "divorce"
        elif any(word in transcript_lower for word in ["alimony", "maintenance", "गुजारा", "ভরণপোষণ"]):
            case_info["case_type"] = "alimony"
        elif any(word in transcript_lower for word in ["custody", "child", "बच्चे", "সন্তান"]):
            case_info["case_type"] = "child_custody"
        elif any(word in transcript_lower for word in ["dowry", "दहेज", "যৌতুক"]):
            case_info["case_type"] = "dowry"
        elif any(word in transcript_lower for word in ["violence", "abuse", "हिंसा", "সহিংসতা"]):
            case_info["case_type"] = "domestic_violence"
        else:
            case_info["case_type"] = "other"
        
        # Detect urgency
        if any(word in transcript_lower for word in ["urgent", "immediate", "emergency", "जरूरी", "জরুরি"]):
            case_info["urgency"] = "high"
        
        # Detect documents
        if any(word in transcript_lower for word in ["document", "certificate", "proof", "दस्तावेज", "নথি"]):
            case_info["has_documents"] = True
        
        return case_info


# Singleton instance
_vapi_service = None

def get_vapi_service() -> VapiService:
    """Get Vapi service singleton"""
    global _vapi_service
    if _vapi_service is None:
        _vapi_service = VapiService()
    return _vapi_service
