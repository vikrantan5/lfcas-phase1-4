# Groq AI Service for Legal Advisory
from groq import Groq
import os
import json
from typing import Dict, List
from models import CaseType, AIQueryResponse, GroqAILog
from datetime import datetime

from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Groq client (lazy)
_groq_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

# Prompt templates for different case types
CASE_PROMPTS = {
    CaseType.DIVORCE: """You are a legal expert specializing in Indian family law, specifically divorce cases.

User Query: {description}
Additional Details: {additional_details}

Provide a structured legal analysis in JSON format with the following:
1. case_classification: Confirm this is a "divorce" case
2. legal_sections: List relevant sections from Hindu Marriage Act 1955, Special Marriage Act 1954, or other applicable acts
3. required_documents: List all necessary documents (marriage certificate, ID proofs, evidence, etc.)
4. procedural_guidance: Step-by-step process for filing divorce petition
5. recommended_actions: Immediate steps the client should take
6. estimated_timeline: Approximate time for case resolution
7. important_notes: Critical points the client should know

Respond ONLY with valid JSON. Be professional, accurate, and India-specific.""",

    CaseType.ALIMONY: """You are a legal expert specializing in Indian family law, specifically alimony/maintenance cases.

User Query: {description}
Additional Details: {additional_details}

Provide a structured legal analysis in JSON format with the following:
1. case_classification: Confirm this is an "alimony" case
2. legal_sections: List relevant sections (Section 125 CrPC, Hindu Adoption and Maintenance Act, etc.)
3. required_documents: List all necessary documents (income proof, marriage certificate, bank statements, etc.)
4. procedural_guidance: Step-by-step process for claiming alimony
5. recommended_actions: Immediate steps the client should take
6. estimated_timeline: Approximate time for case resolution
7. important_notes: Factors affecting alimony amount and eligibility

Respond ONLY with valid JSON. Be professional, accurate, and India-specific.""",

    CaseType.CHILD_CUSTODY: """You are a legal expert specializing in Indian family law, specifically child custody cases.

User Query: {description}
Additional Details: {additional_details}

Provide a structured legal analysis in JSON format with the following:
1. case_classification: Confirm this is a "child_custody" case
2. legal_sections: List relevant sections (Guardians and Wards Act 1890, Hindu Minority and Guardianship Act 1956, etc.)
3. required_documents: List all necessary documents (birth certificate, school records, income proof, etc.)
4. procedural_guidance: Step-by-step process for filing custody petition
5. recommended_actions: Immediate steps considering child's welfare
6. estimated_timeline: Approximate time for case resolution
7. important_notes: Best interest of child principle and factors court considers

Respond ONLY with valid JSON. Be professional, accurate, and India-specific.""",

    CaseType.DOWRY: """You are a legal expert specializing in Indian criminal law, specifically dowry-related cases.

User Query: {description}
Additional Details: {additional_details}

Provide a structured legal analysis in JSON format with the following:
1. case_classification: Confirm this is a "dowry" case
2. legal_sections: List relevant sections (Section 498A IPC, Dowry Prohibition Act 1961, Section 304B IPC, etc.)
3. required_documents: List all necessary documents (FIR, evidence of harassment, medical records, witness statements, etc.)
4. procedural_guidance: Step-by-step process for filing dowry harassment complaint
5. recommended_actions: Immediate safety measures and legal steps
6. estimated_timeline: Approximate time for case resolution
7. important_notes: Criminal nature of offense, protection available, and legal rights

Respond ONLY with valid JSON. Be professional, accurate, and India-specific.""",

    CaseType.DOMESTIC_VIOLENCE: """You are a legal expert specializing in Indian law, specifically domestic violence cases.

User Query: {description}
Additional Details: {additional_details}

Provide a structured legal analysis in JSON format with the following:
1. case_classification: Confirm this is a "domestic_violence" case
2. legal_sections: List relevant sections (Protection of Women from Domestic Violence Act 2005, Section 498A IPC, etc.)
3. required_documents: List all necessary documents (medical evidence, photos, witness statements, police complaint, etc.)
4. procedural_guidance: Step-by-step process for filing DV case and getting protection order
5. recommended_actions: Immediate safety measures and support resources
6. estimated_timeline: Approximate time for protection order and case resolution
7. important_notes: Available relief (protection order, residence order, monetary relief), emergency helplines

Respond ONLY with valid JSON. Be professional, accurate, and India-specific.""",

    CaseType.OTHER: """You are a legal expert specializing in Indian family law.

User Query: {description}
Additional Details: {additional_details}

First, determine the specific type of family law case from the description.
Then provide a structured legal analysis in JSON format with the following:
1. case_classification: Identify the specific case type
2. legal_sections: List relevant legal sections and acts
3. required_documents: List all necessary documents
4. procedural_guidance: Step-by-step process for legal action
5. recommended_actions: Immediate steps the client should take
6. estimated_timeline: Approximate time for case resolution
7. important_notes: Critical points specific to this case type

Respond ONLY with valid JSON. Be professional, accurate, and India-specific."""
}


async def analyze_case_with_groq(case_type: CaseType, description: str, additional_details: Dict = None) -> Dict:
    """
    Analyze a legal case using Groq AI
    """
    if additional_details is None:
        additional_details = {}
    
    # Get the appropriate prompt template
    prompt_template = CASE_PROMPTS.get(case_type, CASE_PROMPTS[CaseType.OTHER])
    
    # Format the prompt with user data
    prompt = prompt_template.format(
        description=description,
        additional_details=json.dumps(additional_details, indent=2)
    )
    
    try:

        # Call Groq API
        groq_client = get_groq_client()
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a legal expert AI assistant specializing in Indian family law. Always respond with valid JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2000
        )
        
        # Extract the response
        response_content = chat_completion.choices[0].message.content
        
        # Parse JSON response with improved error handling
        ai_response = None
        try:
            # Try to extract JSON if it's wrapped in markdown code blocks
            cleaned_content = response_content.strip()
            
            if "```json" in cleaned_content:
                json_start = cleaned_content.find("```json") + 7
                json_end = cleaned_content.find("```", json_start)
                cleaned_content = cleaned_content[json_start:json_end].strip()
            elif "```" in cleaned_content:
                json_start = cleaned_content.find("```") + 3
                json_end = cleaned_content.find("```", json_start)
                cleaned_content = cleaned_content[json_start:json_end].strip()
            
            # Try to parse JSON
            ai_response = json.loads(cleaned_content)
            
            # Validate required fields
            required_fields = ["case_classification", "legal_sections", "required_documents"]
            for field in required_fields:
                if field not in ai_response:
                    print(f"Warning: Missing field {field} in AI response")
                    ai_response[field] = []
            
            # Ensure arrays are arrays
            if isinstance(ai_response.get("legal_sections"), str):
                ai_response["legal_sections"] = [ai_response["legal_sections"]]
            if isinstance(ai_response.get("required_documents"), str):
                ai_response["required_documents"] = [ai_response["required_documents"]]
            if isinstance(ai_response.get("recommended_actions"), str):
                ai_response["recommended_actions"] = [ai_response["recommended_actions"]]
            
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"AI Response Parsing Error: {e}")
            print(f"Raw response: {response_content[:500]}")
            
            # Create a structured fallback response
            ai_response = {
                "case_classification": case_type.value,
                "legal_sections": [
                    "Section 13 of Hindu Marriage Act, 1955 (for Divorce)" if case_type.value == "divorce" else
                    "Section 125 of CrPC (for Alimony)" if case_type.value == "alimony" else
                    "Guardians and Wards Act, 1890" if case_type.value == "child_custody" else
                    "Dowry Prohibition Act, 1961" if case_type.value == "dowry" else
                    "Protection of Women from Domestic Violence Act, 2005" if case_type.value == "domestic_violence" else
                    "Relevant family law provisions"
                ],
                "required_documents": [
                    "Identity proof (Aadhar, PAN)",
                    "Address proof",
                    "Marriage certificate (if applicable)",
                    "Income proof",
                    "Evidence supporting your case",
                    "Witness statements (if any)"
                ],
                "procedural_guidance": "Please consult with a qualified advocate for specific guidance on your case. An advocate will help you understand the legal process and prepare necessary documentation.",
                "recommended_actions": [
                    "Document all relevant evidence",
                    "Consult with a qualified family law advocate",
                    "Prepare required documents listed above",
                    "Maintain records of all communications"
                ],
                "estimated_timeline": "6-18 months (varies by case complexity and court schedule)",
                "important_notes": [
                    "This is an automated analysis and should not replace professional legal advice",
                    "Please consult with an advocate for personalized guidance",
                    "Timeline may vary based on case specifics and court availability"
                ]
            }
        
        return {
            "success": True,
            "data": ai_response,
            "tokens_used": chat_completion.usage.total_tokens if hasattr(chat_completion, 'usage') else None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "case_classification": case_type.value,
                "legal_sections": ["Error in AI analysis - please consult advocate"],
                "required_documents": ["Standard case documents"],
                "procedural_guidance": "AI service temporarily unavailable. Please consult with an advocate.",
                "recommended_actions": ["Contact a qualified family law advocate"],
                "estimated_timeline": "To be determined",
                "important_notes": ["AI analysis failed - manual review required"]
            }
        }


def get_advocate_recommendation_criteria(case_type: CaseType, location: str) -> Dict:
    """
    Get criteria for recommending advocates based on case type and location
    """
    return {
        "specialization": [case_type],
        "location": location,
        "status": "approved",
        "sort_by": [
            {"field": "rating", "order": -1},
            {"field": "experience_years", "order": -1},
            {"field": "active_cases", "order": 1}
        ],
        "limit": 5
    }
