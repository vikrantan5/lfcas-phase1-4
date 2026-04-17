# Web Speech API Service for LFCAS (Replaces Vapi)
import os
import logging
from typing import Dict, Optional
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


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


class WebSpeechService:
    """Service for Web Speech API-based voice interactions (replaces Vapi)"""
    
    def __init__(self):
        logger.info("WebSpeechService initialized (browser-based STT/TTS)")
    
    def get_greeting(self, language: str = "english") -> str:
        """Get greeting message for the selected language"""
        return VOICE_PROMPTS.get(language, VOICE_PROMPTS["english"])["greeting"]
    
    def validate_legal_conversation(self, transcript: str, language: str = "english") -> Dict:
        """
        Validate if the conversation is about a legal problem.
        Returns: {"is_legal": bool, "reason": str}
        """
        if not transcript or len(transcript.strip()) < 20:
            return {
                "is_legal": False,
                "reason": "Conversation is too short. Please describe your legal problem in detail."
            }
        
        transcript_lower = transcript.lower()
        
        # Legal keywords in multiple languages - EXPANDED to include ALL legal matters
        legal_keywords = {
            "english": [
                # Family Law
                "divorce", "custody", "alimony", "maintenance", "marriage", "husband", "wife", "child", "children",
                "separation", "dowry", "violence", "harassment", "domestic",
                # Civil Law (Land/Property)
                "land", "property", "dispute", "ownership", "possession", "boundary", "plot", "acres", "deed",
                "sale", "purchase", "tenant", "landlord", "rent", "lease", "eviction", "title", "partition",
                "inheritance", "will", "estate", "registry", "mutation", "encroachment", "easement",
                # Criminal Law
                "fraud", "theft", "cheat", "assault", "fir", "police", "complaint", "bail", "arrest",
                # General Legal
                "lawyer", "advocate", "court", "legal", "case", "law", "rights", "justice", "suit",
                "petition", "file", "judgment", "hearing", "restraining", "order", "injunction", "settlement",
                # Consumer/Employment
                "consumer", "refund", "compensation", "employee", "employer", "salary", "termination",
                # Common phrases
                "legal issue", "legal problem", "legal help", "need lawyer", "court case", "dispute with"
            ],
            "hindi": ["तलाक", "गुजारा", "बच्चे", "हिरासत", "वकील", "अदालत", "कानूनी", "मामला", "शादी", 
                     "हिंसा", "उत्पीड़न", "दहेज", "संपत्ति", "अधिकार", "कानून", "पति", "पत्नी",
                     "जमीन", "भूमि", "विवाद", "मालिक", "किराया", "किरायेदार", "धोखाधड़ी", "चोरी"],
            "bengali": ["ডিভোর্স", "ভরণপোষণ", "সন্তান", "হেফাজত", "আইনজীবী", "আদালত", "আইনি", "মামলা", 
                       "বিবাহ", "সহিংসতা", "হয়রানি", "যৌতুক", "সম্পত্তি", "অধিকার", "আইন", "স্বামী", "স্ত্রী",
                       "জমি", "ভূমি", "বিরোধ", "মালিক", "ভাড়া", "প্রতারণা", "চুরি"]
        }
        
        # Get keywords for the language
        keywords = legal_keywords.get(language, legal_keywords["english"])
        
        # Check if transcript contains legal keywords
        legal_keyword_count = sum(1 for keyword in keywords if keyword in transcript_lower)
        
        if legal_keyword_count < 2:
            return {
                "is_legal": False,
                "reason": "This doesn't appear to be a legal problem. Please describe your family law issue clearly."
            }
        
        # Check for non-legal/spam content
        spam_indicators = ["hello", "hi", "test", "testing", "xyz", "abc", "nothing", "joke", "fun", "random", "demo"]
        spam_count = sum(1 for indicator in spam_indicators if indicator in transcript_lower)
        
        if spam_count > legal_keyword_count and len(transcript.split()) < 30:
            return {
                "is_legal": False,
                "reason": "Please provide a meaningful description of your legal problem. Avoid test or random messages."
            }
        
        return {
            "is_legal": True,
            "reason": "Valid legal conversation"
        }
    
    def extract_case_info_from_transcript(self, transcript: str, language: str = "english") -> Dict:
        """Extract structured case information from conversation transcript"""
        
        # First validate if it's a legal conversation
        validation = self.validate_legal_conversation(transcript, language)
        
        case_info = {
            "is_legal": validation["is_legal"],
            "validation_reason": validation["reason"],
            "case_type": None,
            "location": None,
            "description": transcript,
            "urgency": "medium",
            "has_documents": False,
            "additional_details": {}
        }
        
        if not validation["is_legal"]:
            return case_info
        
        # Simple keyword matching (enhance with NLP in production)
        transcript_lower = transcript.lower()
        
        # Detect case type
        if any(word in transcript_lower for word in ["divorce", "talaq", "तलाक", "ডিভোর্স", "separation", "विवाह विच्छेद"]):
            case_info["case_type"] = "divorce"
        elif any(word in transcript_lower for word in ["alimony", "maintenance", "गुजारा", "ভরণপোষণ", "support", "भरण-पोषण"]):
            case_info["case_type"] = "alimony"
        elif any(word in transcript_lower for word in ["custody", "child", "बच्चे", "সন্তান", "guardianship", "अभिभावक"]):
            case_info["case_type"] = "child_custody"
        elif any(word in transcript_lower for word in ["dowry", "दहेज", "যৌতুক", "498a", "harassment"]):
            case_info["case_type"] = "dowry"
        elif any(word in transcript_lower for word in ["violence", "abuse", "हिंसा", "সহিংসতা", "domestic", "घरेलू", "beat"]):
            case_info["case_type"] = "domestic_violence"
        elif any(word in transcript_lower for word in ["property", "संपत्ति", "সম্পত্তি", "inheritance", "विरासत"]):
            case_info["case_type"] = "property_dispute"
        else:
            case_info["case_type"] = "other"
        
        # Extract location (simple pattern matching)
        import re
        # Look for common Indian cities
        common_cities = ["delhi", "mumbai", "bangalore", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad", 
                        "jaipur", "lucknow", "kanpur", "nagpur", "indore", "bhopal", "patna", "vadodara", 
                        "gurgaon", "noida", "ghaziabad", "agra", "meerut", "varanasi", "allahabad", "surat"]
        
        for city in common_cities:
            if city in transcript_lower:
                case_info["location"] = city.title()
                break
        
        # Detect urgency
        if any(word in transcript_lower for word in ["urgent", "immediate", "emergency", "asap", "जरूरी", "জরুরি", "तत्काल", "तुरंत"]):
            case_info["urgency"] = "high"
        elif any(word in transcript_lower for word in ["soon", "quick", "जल्द", "শীঘ্র"]):
            case_info["urgency"] = "medium"
        
        # Detect documents
        if any(word in transcript_lower for word in ["document", "certificate", "proof", "evidence", "दस्तावेज", "নথি", "प्रमाण पत्र"]):
            case_info["has_documents"] = True
        
        return case_info


# Singleton instance
_web_speech_service = None

def get_web_speech_service() -> WebSpeechService:
    """Get Web Speech service singleton"""
    global _web_speech_service
    if _web_speech_service is None:
        _web_speech_service = WebSpeechService()
    return _web_speech_service
