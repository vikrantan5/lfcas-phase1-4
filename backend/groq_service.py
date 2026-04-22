# Groq AI Service for Legal Advisory
from groq import Groq
import os
import json
from typing import Dict, List
from models import CaseType, AIQueryResponse, GroqAILog
from datetime import datetime
import logging

from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        # Initialize without proxies parameter
        _groq_client = Groq(
            api_key=api_key,
            max_retries=2
        )
    return _groq_client


LEGAL_INTENT_DETECTION_PROMPT = """You are an advanced AI Legal Intelligence Engine.

Your job is to deeply analyze a user's full conversation transcript and determine whether it is a real legal problem / case-related matter.

IMPORTANT RULES:

1. DO NOT rely on keyword matching.
2. Understand the full context like a human lawyer.
3. Even if legal keywords like "divorce", "case", "court" are missing, still detect intent from meaning.
4. The user may describe problems in informal, emotional, or indirect language.
5. You must detect intent from the situation, not words.
6. BE STRICT: If the query is clearly general knowledge, trivia, or unrelated chit-chat (e.g., "what is the capital of India", "who is the Prime Minister", "tell me about cricket", "what's the weather", "write code for me", "how to cook", "recommend movies"), it is NOT legal. Mark is_legal=false with high confidence (>= 0.9).
7. General legal questions about Indian law (e.g., "what are my rights as a tenant", "how does bail work", "what is IPC 498A") ARE legal and should be accepted.
8. If the user's input is ambiguous, very short, or could be either (e.g., "hello", "help me"), DO NOT guess. Mark is_legal=false with confidence 0.5 so the system asks for clarification.

---

🎯 TASKS:

Analyze the conversation and return:

1. Is this a legal problem? (true/false)
2. If YES → classify case type
3. Extract structured details
4. If NOT → ignore or reject

---

📚 SUPPORTED CASE TYPES (NOT LIMITED):

- Divorce / Separation
- Alimony / Maintenance
- Child Custody
- Domestic Violence
- Dowry Harassment
- Property / Land Dispute
- Inheritance / Will
- Tenant / Rent Issues
- Fraud / Cheating
- Employment Issues
- Consumer Complaints
- Criminal Cases
- Cyber Crime
- Any other legal matter

---

🧠 INTELLIGENCE BEHAVIOR:

- If user says:
  "My husband left me and not giving money"
  → This IS alimony/maintenance case

- If user says:
  "My brother took my father's land"
  → This IS property dispute

- If user says:
  "He beats me daily"
  → This IS domestic violence

- Even WITHOUT keywords → detect intent

---

🚫 NON-LEGAL CASES (mark is_legal=false with HIGH confidence 0.9+):

- Random text / greetings (hello, test, abc, hi, hey)
- Jokes / casual chit-chat
- General knowledge trivia ("capital of India", "who is PM", "distance between...", "when was X born", sports stats, science facts, geography, history dates)
- Coding / tech help requests
- Recipes / cooking / food
- Movies / TV / entertainment recommendations
- Weather / news / current affairs (unless directly legal)
- Mathematical problems, essays, translations
- Medical / health advice (unless medical negligence case)
- Homework / assignment help
- Any topic not tied to a real legal dispute, right, or case

---

⚠️ VERY IMPORTANT:

If the conversation clearly describes a real-life dispute/problem between people → it is LEGAL.

---

📤 OUTPUT FORMAT (STRICT JSON):

{{
  "is_legal": true/false,
  "case_type": "string",
  "confidence": 0-1,
  "summary": "short human-readable summary",
  "legal_domain": "family/civil/criminal/consumer/etc",
  "suggested_sections": ["optional IPC/CrPC sections if possible"],
  "reason_if_rejected": "only if is_legal = false"
}}

---

🎯 EXAMPLES:

Input:
"My wife left home 2 years ago and now she is asking money"

Output:
{{
  "is_legal": true,
  "case_type": "alimony",
  "confidence": 0.92,
  "summary": "Wife left and is demanding financial support",
  "legal_domain": "family"
}}

---

Input:
"My neighbour captured my land"

Output:
{{
  "is_legal": true,
  "case_type": "property_dispute",
  "confidence": 0.95,
  "summary": "Neighbour illegally कब्जा on land",
  "legal_domain": "civil"
}}

---

Input:
"hello bro what are you doing"

Output:
{{
  "is_legal": false,
  "confidence": 0.95,
  "reason_if_rejected": "Casual greeting, not a legal issue"
}}

---

Input:
"what is the capital of India"

Output:
{{
  "is_legal": false,
  "confidence": 0.98,
  "reason_if_rejected": "General knowledge trivia, unrelated to any legal matter"
}}

---

Input:
"who is the prime minister of india"

Output:
{{
  "is_legal": false,
  "confidence": 0.98,
  "reason_if_rejected": "General knowledge question, not a legal problem"
}}

---

Input:
"can you write python code for a sorting algorithm"

Output:
{{
  "is_legal": false,
  "confidence": 0.98,
  "reason_if_rejected": "Coding help request, not a legal issue"
}}
---

Now analyze the following conversation:

USER TRANSCRIPT:
{conversation_text}
"""


async def detect_legal_intent(conversation_text: str) -> Dict:
    """
    Use Groq AI to detect if a conversation is about a legal issue.
    This replaces keyword-based validation with intelligent context understanding.
    """
    try:
        groq_client = get_groq_client()
        
        # Format the prompt
        prompt = LEGAL_INTENT_DETECTION_PROMPT.format(conversation_text=conversation_text)
        
        # Call Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert legal AI that determines if a conversation is about a legal issue. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=500
        )
        
        # Extract response
        response_content = chat_completion.choices[0].message.content
        
        # Parse JSON response
        try:
            # Clean markdown if present
            cleaned_content = response_content.strip()
            if "```json" in cleaned_content:
                json_start = cleaned_content.find("```json") + 7
                json_end = cleaned_content.find("```", json_start)
                cleaned_content = cleaned_content[json_start:json_end].strip()
            elif "```" in cleaned_content:
                json_start = cleaned_content.find("```") + 3
                json_end = cleaned_content.find("```", json_start)
                cleaned_content = cleaned_content[json_start:json_end].strip()
            
            intent_result = json.loads(cleaned_content)
            
            logger.info(f"Legal intent detection: is_legal={intent_result.get('is_legal')}, case_type={intent_result.get('case_type')}")
            
            return {
                "success": True,
                "is_legal": intent_result.get("is_legal", False),
                "case_type": intent_result.get("case_type"),
                "confidence": intent_result.get("confidence", 0.5),
                "summary": intent_result.get("summary", ""),
                "legal_domain": intent_result.get("legal_domain"),
                "reason_if_rejected": intent_result.get("reason_if_rejected"),
                "tokens_used": chat_completion.usage.total_tokens if hasattr(chat_completion, 'usage') else None
            }
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse legal intent response: {e}")
            logger.error(f"Raw response: {response_content}")

            # Fail-safe: if we can't parse, treat as NOT legal so the bot asks for
            # clarification instead of blindly answering general questions.
            return {
                "success": True,
                "is_legal": False,
                "case_type": None,
                "confidence": 0.5,
                "summary": "Unable to parse AI response",
                "reason_if_rejected": "Classifier response was not parseable; ask user to clarify legal issue"
            }

    except Exception as e:
        logger.error(f"Legal intent detection failed: {str(e)}")
        # Fail-safe: on classifier failure, treat as NOT legal so the bot
        # asks for clarification instead of answering non-legal queries.
        return {
            "success": False,
            "is_legal": False,
            "error": str(e),
            "case_type": None,
            "confidence": 0.5
        }

# Enhanced prompt templates with comprehensive legal analysis
CASE_PROMPTS = {
    CaseType.DIVORCE: """You are a senior legal expert specializing in Indian family law with 20+ years of experience in divorce cases.

User's Situation: {description}
Additional Context: {additional_details}

Provide a COMPREHENSIVE legal analysis in JSON format. Be detailed and thorough:

{{
  "case_classification": "divorce",
  "case_summary": "Brief 2-3 line summary of the client's situation and primary legal issue",
  "legal_sections": [
    "Section 13 of Hindu Marriage Act, 1955 - Grounds for divorce (including cruelty, desertion, adultery, conversion, mental disorder, incurable disease, etc.)",
    "Section 13B of Hindu Marriage Act, 1955 - Divorce by mutual consent",
    "Section 27 of Special Marriage Act, 1954 (if applicable)",
    "Include all relevant sections with detailed explanations"
  ],
  "applicable_laws": "Detailed explanation: यह मामला Hindu Marriage Act 1955 की धारा 13 के तहत आता है। इस कानून के अनुसार...",
  "penalties_and_consequences": "Explain what the opponent might face - No criminal penalties in civil divorce but explain about alimony, property division, child custody implications. Mention typical court orders.",
  "legal_rights": [
    "Right to file for divorce under specific grounds",
    "Right to claim alimony/maintenance",
    "Right to child custody",
    "Right to share in matrimonial property",
    "List ALL applicable rights in detail"
  ],
  "required_documents": [
    "Marriage certificate (essential)",
    "Identity proofs - Aadhar, PAN of both parties",
    "Address proofs",
    "Photographs of marriage",
    "Evidence of grounds (medical certificates, police complaints, witness statements, etc.)",
    "Income proofs of both parties",
    "List ALL necessary documents"
  ],
  "procedural_guidance": "DETAILED step-by-step: 1. Engage a family law advocate 2. Prepare divorce petition with grounds 3. File petition in appropriate family court 4. Serve notice to respondent 5. Court hearings and evidence 6. Mediation attempts 7. Final decree of divorce. Typical process takes 6-24 months.",
  "recommended_actions": [
    "Immediately consult a family law advocate experienced in divorce cases",
    "Gather all documentary evidence supporting your grounds",
    "Maintain detailed records of all incidents",
    "Consider mediation/counseling if applicable",
    "Secure financial documents",
    "Plan for child custody arrangements if applicable"
  ],
  "estimated_timeline": "Contested divorce: 1.5 to 3 years depending on court workload and complexity. Mutual consent divorce: 6-18 months (including 6-month mandatory waiting period under Section 13B).",
  "court_jurisdiction": "File in District Court/Family Court having jurisdiction where: (a) marriage was solemnized, (b) parties last resided together, or (c) respondent resides.",
  "important_notes": [
    "Grounds for divorce must be proven with evidence",
    "Mutual consent divorce is faster but requires agreement on all terms",
    "Alimony/maintenance depends on income, needs, and circumstances",
    "Child custody decided based on child's welfare",
    "Irretrievable breakdown of marriage is recognized in some cases",
    "Divorce by mutual consent requires 6-month cooling period"
  ],
  "typical_case_outcome": "Explain what usually happens in such cases - divorce granted if grounds proven, alimony awarded based on husband's income, child custody typically with mother for young children",
  "estimated_costs": "Court fees: Rs 50-500, Advocate fees: Rs 15,000 - Rs 1,00,000+ depending on complexity and location",
  "warnings_and_cautions": "Do not take any hasty action without legal advice. Maintain evidence. Avoid social media posts about case. Do not leave matrimonial home without legal advice as it may affect your rights."
}}

Make analysis DETAILED, PRACTICAL, and in simple language. Include Hindi/regional language explanations where helpful.""",

    CaseType.ALIMONY: """You are a senior legal expert in Indian family law with expertise in maintenance and alimony cases.

User's Situation: {description}
Additional Context: {additional_details}

Provide COMPREHENSIVE analysis in JSON:

{{
  "case_classification": "alimony",
  "case_summary": "Brief summary of client's maintenance/alimony situation",
  "legal_sections": [
    "Section 125 CrPC - Maintenance of wives, children and parents (criminal remedy)",
    "Section 24 of Hindu Marriage Act, 1955 - Maintenance pendente lite",
    "Section 25 of Hindu Marriage Act, 1955 - Permanent alimony",
    "Hindu Adoption and Maintenance Act, 1956",
    "Muslim Women (Protection of Rights on Divorce) Act, 1986 (if applicable)",
    "Include ALL relevant provisions with explanation"
  ],
  "applicable_laws": "Detailed: यह मामला CrPC की धारा 125 के तहत आता है जो पत्नी को गुजारा भत्ता का अधिकार देती है यदि वह अपना भरण-पोषण करने में असमर्थ है। पति की आय के आधार पर...",
  "penalties_and_consequences": "If husband fails to pay maintenance ordered by court: Can face imprisonment up to 1 month or arrest warrant. Also explain typical maintenance amounts based on husband's income.",
  "eligibility_criteria": [
    "Wife unable to maintain herself",
    "Husband has sufficient means",
    "Wife is not living in adultery",
    "Has not remarried (in case of divorced wife)",
    "Detail ALL eligibility conditions"
  ],
  "maintenance_calculation": "Typically 25-33% of husband's net monthly income. Factors: husband's income, wife's income/earning capacity, standard of living during marriage, dependent children, wife's age and health.",
  "required_documents": [
    "Marriage certificate",
    "Husband's income proof (salary slips, ITR, bank statements)",
    "Wife's income details (if any)",
    "Rent receipts/living expense proofs",
    "Children's school fees and expense bills",
    "Medical bills if applicable"
  ],
  "procedural_guidance": "Step-by-step: 1. File application under Section 125 CrPC in Magistrate Court of jurisdiction 2. Court issues notice to husband 3. Husband files reply 4. Evidence and arguments 5. Court determines maintenance amount 6. Monthly payment ordered. Interim maintenance usually granted quickly.",
  "recommended_actions": [
    "Immediately engage a family law advocate",
    "Gather proof of husband's income and assets",
    "Document your monthly expenses",
    "Apply for interim maintenance if urgent",
    "Keep records of non-payment if applicable"
  ],
  "estimated_timeline": "Section 125 CrPC cases: 6-18 months for final order. Interim maintenance usually within 1-3 months.",
  "court_jurisdiction": "Magistrate Court where wife resides or where husband resides or where parties last resided together.",
  "typical_maintenance_amount": "Ranges from Rs 5,000 to Rs 50,000+ per month depending on husband's income. Higher amounts in metros and for higher income groups.",
  "important_notes": [
    "Can claim maintenance even during pending divorce proceedings",
    "Maintenance continues until wife remarries or becomes self-sufficient",
    "Can be modified if circumstances change",
    "Non-payment can lead to arrest",
    "Both interim and permanent maintenance available"
  ],
  "estimated_costs": "Court fees minimal (Rs 50-100), Advocate fees: Rs 10,000-50,000",
  "warnings_and_cautions": "Do not delay filing if financial distress. Maintain evidence of expenses. Do not make false claims about husband's income."
}}""",

    CaseType.CHILD_CUSTODY: """You are a senior legal expert in child custody matters under Indian law.

User's Situation: {description}
Additional Context: {additional_details}

{{
  "case_classification": "child_custody",
  "case_summary": "Summary of custody dispute",
  "legal_sections": [
    "Guardians and Wards Act, 1890 - Primary law for custody",
    "Section 26 of Hindu Marriage Act, 1955 - Custody in divorce proceedings",
    "Hindu Minority and Guardianship Act, 1956",
    "Section 38 of Special Marriage Act (if applicable)",
    "Include all relevant provisions"
  ],
  "applicable_laws": "यह मामला Guardians and Wards Act 1890 के तहत आता है। कोर्ट बच्चे के हित में फैसला करती है। आमतौर पर 7 साल से छोटे बच्चों की कस्टडी मां को...",
  "custody_types": {{
    "physical_custody": "Who the child lives with on day-to-day basis",
    "legal_custody": "Who makes important decisions (education, health, religion)",
    "joint_custody": "Both parents share custody rights",
    "sole_custody": "One parent has exclusive custody"
  }},
  "best_interest_factors": [
    "Child's age, gender, preference (if mature)",
    "Parent's financial capability",
    "Parent's character and conduct",
    "Parent's ability to provide stable environment",
    "Child's existing relationships",
    "Each parent's work schedule",
    "ANY factor affecting child's welfare"
  ],
  "required_documents": [
    "Birth certificate of child",
    "School records and medical records",
    "Income proof of both parents",
    "Evidence of parent-child bond (photos, activities)",
    "Character certificates",
    "Home environment assessment",
    "Any evidence of neglect or abuse by other parent"
  ],
  "procedural_guidance": "1. File custody petition in Family Court/District Court 2. Court may order social investigation report 3. Child may be interviewed by judge 4. Evidence of both parents examined 5. Welfare of child is paramount 6. Court passes custody order with visitation rights",
  "recommended_actions": [
    "Prioritize child's stability and routine",
    "Engage experienced family law advocate",
    "Document your involvement in child's life",
    "Maintain cordial relationship with child",
    "Avoid badmouthing other parent",
    "Consider child's preference if mature"
  ],
  "visitation_rights": "Non-custodial parent typically granted visitation rights (weekends, holidays, vacations). Can be supervised if safety concerns exist.",
  "estimated_timeline": "6 months to 2 years depending on contested issues and court schedule",
  "typical_outcomes": "Children under 7: Usually custody to mother. Older children: Decided based on best interest. Joint custody increasingly common. Father gets visitation rights.",
  "important_notes": [
    "Paramount consideration is child's welfare, not parent's rights",
    "Mother usually preferred for young children",
    "Father's financial capability considered",
    "Custody can be modified if circumstances change",
    "Child's preference considered if above 9 years",
    "International custody disputes involve Hague Convention"
  ],
  "estimated_costs": "Rs 20,000 - Rs 1,00,000+ in advocate fees",
  "warnings_and_cautions": "Never abduct child or restrict other parent's access without court order. Maintain child's routine. Do not involve child in disputes."
}}""",

    CaseType.DOWRY: """You are a criminal law expert specializing in dowry harassment cases (Section 498A IPC).

User's Situation: {description}
Additional Context: {additional_details}

{{
  "case_classification": "dowry",
  "case_summary": "Summary of dowry harassment situation",
  "legal_sections": [
    "Section 498A IPC - Cruelty by husband or his relatives (cognizable, non-bailable)",
    "Section 304B IPC - Dowry death (if applicable)",
    "Dowry Prohibition Act, 1961 - Sections 3, 4, 5",
    "Section 406 IPC - Criminal breach of trust (for stridhan)",
    "Section 34 IPC - Acts done by several persons in furtherance of common intention"
  ],
  "applicable_laws": "यह मामला IPC की धारा 498A के तहत आता है जो दहेज उत्पीड़न के लिए है। यह एक गैर-जमानती अपराध है।",
  "penalties_and_consequences": "Section 498A: Imprisonment up to 3 years AND fine. Section 304B (dowry death): Minimum 7 years, can extend to life imprisonment. Section 3 of Dowry Prohibition Act: Imprisonment up to 2 years AND fine up to Rs 15,000. These are SERIOUS criminal offenses with imprisonment.",
  "criminal_nature": "These are CRIMINAL offenses, not civil. Police investigation involved. Accused can be arrested. Trial in criminal court.",
  "required_documents": [
    "FIR copy (most important)",
    "Medical certificates of injuries",
    "Photographs of injuries",
    "Evidence of dowry demand (letters, messages, WhatsApp chats)",
    "List of dowry items given",
    "Witness statements",
    "Audio/video recordings if any"
  ],
  "procedural_guidance": "IMMEDIATE: 1. File FIR at police station under Section 498A IPC 2. Get medical examination done 3. Police investigation starts 4. Accused may be arrested 5. Chargesheet filed 6. Trial in Sessions Court 7. Can take 2-5 years for verdict. ALSO file for maintenance under Section 125 CrPC separately.",
  "immediate_safety_measures": [
    "Leave husband's house and go to safe location (parent's home)",
    "File FIR immediately if violence or threats",
    "Call Women Helpline: 181 or 1091",
    "Approach nearest police station or Mahila Thana",
    "Can also approach Protection Officer under DV Act"
  ],
  "recommended_actions": [
    "Ensure your safety first",
    "File FIR without delay",
    "Preserve all evidence",
    "Get medical examination",
    "Engage criminal lawyer",
    "Inform family members",
    "Can also file DV case simultaneously"
  ],
  "estimated_timeline": "FIR to chargesheet: 2-6 months. Trial: 1-4 years. Total: 2-5 years typically.",
  "court_jurisdiction": "FIR in police station where offense occurred or where you reside. Trial in Sessions Court.",
  "important_notes": [
    "498A is non-bailable offense - accused may be arrested",
    "Supreme Court guidelines require proper investigation before arrest",
    "Can file multiple cases: 498A, DV Act, Maintenance",
    "Husband and in-laws can all be made accused",
    "Stridhan (woman's property) must be returned",
    "Can also claim compensation"
  ],
  "conviction_rate": "Conviction rate is around 15-20% due to lack of evidence, so proper documentation is crucial",
  "protection_available": "Protection order under DV Act 2005, residence order, maintenance, compensation",
  "helplines": "Women Helpline: 181, NCW Helpline: 7827-170-170, Police: 100",
  "estimated_costs": "Mostly free (criminal case by state). Advocate fees for private lawyer: Rs 25,000-1,00,000",
  "warnings_and_cautions": "Do NOT file false case - can backfire. Preserve ALL evidence. Do not return to husband's house without protection order. Inform police of any threats."
}}""",

    CaseType.DOMESTIC_VIOLENCE: """You are an expert in Protection of Women from Domestic Violence Act, 2005.

User's Situation: {description}
Additional Context: {additional_details}

{{
  "case_classification": "domestic_violence",
  "case_summary": "Summary of domestic violence situation",
  "legal_sections": [
    "Protection of Women from Domestic Violence Act, 2005 (entire Act)",
    "Section 498A IPC - Cruelty",
    "Section 323 IPC - Voluntarily causing hurt",
    "Section 325 IPC - Grievous hurt",
    "Section 506 IPC - Criminal intimidation"
  ],
  "applicable_laws": "यह मामला Protection of Women from Domestic Violence Act 2005 के तहत आता है। यह कानून महिलाओं को घरेलू हिंसा से व्यापक सुरक्षा देता है। केवल शारीरिक हिंसा ही नहीं, मानसिक, आर्थिक, और भावनात्मक शोषण भी शामिल है।",
  "what_constitutes_dv": {{
    "physical_abuse": "Hitting, slapping, pushing, burning, etc.",
    "sexual_abuse": "Forced sexual acts, marital rape",
    "emotional_abuse": "Insults, humiliation, threats, intimidation",
    "economic_abuse": "Denying money, preventing from working, taking salary",
    "definition": "Any act causing harm, injury, danger to life, or impairment of physical, mental, or psychological health"
  }},
  "penalties_and_consequences": "DV Act is CIVIL law (remedies, not punishment). BUT can file 498A IPC (criminal) simultaneously. 498A: up to 3 years jail. Sections 323/325 IPC: up to 1-7 years. Economic abuse can lead to monetary compensation orders.",
  "relief_available": [
    "Protection Order - Prevent husband/in-laws from committing violence",
    "Residence Order - Right to live in shared household",
    "Custody Order - Custody of children",
    "Monetary Relief - Maintenance, medical expenses, loss of earnings, compensation",
    "Compensation Order - For physical/mental injuries",
    "Interim/Ex-parte relief - Immediate temporary orders"
  ],
  "required_documents": [
    "Domestic Incident Report (DIR) from Protection Officer",
    "Medical certificates with injury details",
    "Photographs of injuries",
    "Hospital records",
    "Witness statements",
    "Proof of marriage/relationship",
    "Evidence of shared household",
    "Income proof of husband"
  ],
  "procedural_guidance": "1. Approach Protection Officer (PO) or file directly in Magistrate Court 2. PO helps file complaint and prepares DIR 3. Court can pass interim orders immediately 4. Notice to respondent (husband) 5. Hearings and evidence 6. Final protection/residence/monetary orders. Process faster than divorce - can get interim relief within days.",
  "immediate_safety_measures": [
    "Call Women Helpline: 181 immediately",
    "Go to safe location",
    "Approach Protection Officer (at each district)",
    "File police complaint if serious violence",
    "Get medical examination done",
    "Can get ex-parte protection order same day if urgent"
  ],
  "recommended_actions": [
    "Safety is first priority",
    "File DV complaint immediately",
    "Approach Protection Officer for help",
    "Get medical evidence",
    "Apply for protection order",
    "Claim right to residence",
    "File for maintenance",
    "Can also file 498A IPC"
  ],
  "estimated_timeline": "Interim protection order: Within 3-7 days. Final orders: 2-8 months. Much FASTER than divorce.",
  "court_jurisdiction": "Magistrate Court where woman resides or where violence occurred or where respondent resides.",
  "who_can_file": "Any woman in domestic relationship - wife, live-in partner, sister, mother, daughter, can file against husband, relatives, live-in partner",
  "important_notes": [
    "DV Act is civil remedy, 498A is criminal - can file both",
    "Can get protection order without filing divorce",
    "Right to residence even in husband's house",
    "Can claim maintenance under DV Act",
    "Protection Officer provides FREE assistance",
    "Can get order even if living separately",
    "Covers not just physical but ALL forms of abuse"
  ],
  "protection_officer_role": "PO is appointed by government to help women. Provides free assistance, prepares DIR, arranges shelter, medical help.",
  "shelter_homes": "Can approach One Stop Centre, Swadhar Homes, Short Stay Homes if need safe shelter",
  "helplines": "Women Helpline: 181, NCW: 7827-170-170, Police: 100, One Stop Centre: Find via Protection Officer",
  "estimated_costs": "Minimal/Free. Court fees nominal. Legal aid available.",
  "warnings_and_cautions": "Document everything. Preserve evidence. Do not delay if safety at risk. Can return to matrimonial home with protection order. Violation of protection order is punishable."
}}""",

     CaseType.OTHER: """You are a senior legal expert in India with expertise across ALL areas of law.

User's Situation: {description}
Additional Context: {additional_details}

IMPORTANT INSTRUCTION: Analyze the user's problem and identify the correct legal category:

**Family Law:** divorce, alimony, child custody, dowry, domestic violence, marriage disputes
**Civil Law:** land disputes, property disputes, ownership conflicts, boundary disputes, rent issues, tenant disputes, sale deed issues, partition suits, easement rights, contracts, torts, defamation, nuisance
**Criminal Law:** fraud, theft, assault, harassment, cyber crimes, cheating, criminal breach of trust
**Other:** consumer complaints, employment disputes, service issues, tax matters, etc.

If this is a LAND DISPUTE, PROPERTY DISPUTE, or any CIVIL LAW matter, provide comprehensive analysis like this:

{{
  "case_classification": "property_dispute" or "land_dispute" or "civil_law",
  "category": "Civil Law",
  "case_summary": "Brief 2-3 line summary of the dispute",
  "legal_sections": [
    "Transfer of Property Act, 1882 - Sections on sale, mortgage, lease",
    "Specific Relief Act, 1963 - Section 8 (possession), Section 9 (partition)",
    "Indian Easements Act, 1882 - Sections on rights of way, water rights",
    "Civil Procedure Code, 1908 - Order VII (partition suits), Order XXI (execution)",
    "Registration Act, 1908 - Sections on registration of property documents",
    "Land Revenue Acts (state-specific)",
    "Include ALL relevant sections with explanations"
  ],
  "applicable_laws": "Detailed: यह मामला संपत्ति विवाद से संबंधित है। Transfer of Property Act 1882 और Specific Relief Act 1963 के तहत... यदि यह भूमि का मामला है तो राज्य के Land Revenue Act के तहत...",
  "penalties_and_consequences": "This is a CIVIL matter, not criminal. No jail/imprisonment. Court may order: (1) Declaration of ownership (2) Possession to rightful owner (3) Partition of property (4) Compensation/damages (5) Injunction to stop interference. Losing party may have to pay court costs.",
  "dispute_type": "Identify: ownership dispute, boundary dispute, partition suit, possession dispute, title dispute, adverse possession, fraud in sale, etc.",
  "required_documents": [
    "Sale deed / Title deed / Gift deed",
    "7/12 extract or land revenue records",
    "Mutation records (Ferfar)",
    "Property tax receipts",
    "Survey map and plot measurements",
    "Previous sale deeds (chain of title for 30 years)",
    "Possession documents",
    "Photographs of property and boundaries",
    "Municipal khata certificate",
    "Encumbrance certificate",
    "Identity and address proofs"
  ],
  "procedural_guidance": "Step-by-step: 1. Engage a civil lawyer specializing in property law 2. Gather all title documents 3. File civil suit in appropriate civil court 4. Apply for interim injunction if needed 5. Evidence stage - present documents and witnesses 6. Arguments 7. Judgment and decree 8. If needed, execution proceedings for possession. Timeline: 2-10 years depending on complexity.",
  "recommended_actions": [
    "Immediately consult a civil/property law advocate",
    "Gather all property documents and records",
    "Get property survey done if boundary dispute",
    "Verify title records from sub-registrar office",
    "Apply for interim injunction if opponent interfering",
    "Do NOT take law in own hands - no violence",
    "Maintain peaceful possession if you have it"
  ],
  "estimated_timeline": "Civil property suits: 3-10 years depending on court workload, appeals, and case complexity. Can be longer if appeals to High Court/Supreme Court.",
  "court_jurisdiction": "Civil Court (Junior/Senior Division) having jurisdiction where the property is located. For high-value cases: District Court.",
  "mediation_option": "Property disputes are suitable for mediation. Court may refer to mediation. Consider mutual settlement through family/community mediation to save time and money.",
  "important_notes": [
    "Property disputes are CIVIL matters, NOT criminal (unless fraud involved)",
    "Possession is 9/10ths of law - maintain peaceful possession if you have it",
    "Registered sale deed has strong evidentiary value",
    "Adverse possession requires 12 years continuous possession",
    "Do not use force or violence - this can lead to criminal case",
    "Get proper legal opinion on title before purchase",
    "Partition suits between co-owners are common and court can order division"
  ],
  "typical_case_outcome": "Court examines title documents, hears evidence, and declares rightful owner. May order possession, partition, or compensation. Appeals possible.",
  "estimated_costs": "Court fees: 1-5% of property value. Advocate fees: Rs 25,000 - Rs 5,00,000+ depending on complexity and duration.",
  "warnings_and_cautions": "Never use force or violence to claim property - this is illegal. Never forge or tamper with documents. Always verify title before buying property. Keep all original documents safely."
}}

For any other case type (criminal, consumer, employment, etc.), provide similar comprehensive analysis with:
- case_classification (specific type)
- category (Family/Civil/Criminal/Other)
- case_summary
- legal_sections (with act names and section numbers)
- applicable_laws
- penalties_and_consequences
- required_documents
- procedural_guidance
- recommended_actions
- estimated_timeline
- court_jurisdiction
- important_notes
- estimated_costs
- warnings_and_cautions

CRITICAL: Only reject if the query is clearly NOT a legal problem (e.g., "what's the weather", "tell me a joke", "how to cook"). For unclear cases, ask "Could you provide more details about your legal issue? It may relate to property, family, criminal, or another legal area." DO NOT reject legitimate legal problems."""
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
                    "content": """You are a senior legal expert AI assistant specializing in ALL areas of Indian law including:
- Family Law (divorce, alimony, child custody, dowry, domestic violence)
- Civil Law (property disputes, land disputes, rent disputes, ownership conflicts, contracts, torts)
- Criminal Law (fraud, theft, assault, harassment, cyber crimes)
- Other Legal Matters (consumer complaints, employment disputes, tax issues, etc.)

Your role is to:
1. Identify the legal category and case type from the user's description
2. Provide comprehensive legal analysis in valid JSON format
3. If the case is unclear or seems non-legal (weather, jokes, unrelated topics), politely ask for clarification
4. NEVER reject a legitimate legal problem - all legal issues are valid

If a user describes a property/land dispute, ownership conflict, rent issue, or any civil matter, you MUST recognize it as a valid legal case and provide appropriate legal guidance.

Always respond with valid JSON format."""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2500
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



















# 2026-04-16 20:21:27,376 - httpx - INFO - HTTP Request: POST https://epnzbuofcjffunjnxrgj.supabase.co/rest/v1/ai_case_analysis "HTTP/2 400 Bad Request"
# 2026-04-16 20:21:27,379 - server - ERROR - Error processing voice conversation: {'message': 'value too long for type character varying(100)', 'code': '22001', 'hint': None, 'details': None}
# INFO:     127.0.0.1:60352 - "POST /api/voice/process-conversation HTTP/1.1" 500 Internal Server Error