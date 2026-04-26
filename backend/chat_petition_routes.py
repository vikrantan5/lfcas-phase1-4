"""
LFCAS Enhancement Routes:
- Chat Sessions (AI conversation storage + summary)
- Advocate Recommendations (AI-powered matching)
- Petitions (advocate uploads, client views)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
import json
import logging

from auth import get_current_user, require_role, get_supabase_client
from groq_service import get_groq_client
from supabase_storage_service import upload_document_to_supabase, delete_document_from_supabase
from models import (
    UserRole, NotificationType,
    ChatSession, ChatSessionCreate, ChatSessionAddMessage, ChatSessionAnalyze, ChatSessionResponse,
    Petition, PetitionCreate, PetitionResponse, PetitionStatus,
    AdvocateResponse, UserResponse,
)

logger = logging.getLogger(__name__)
supabase = get_supabase_client()

router = APIRouter(prefix="/api")


# ============= CHAT SESSIONS =============

@router.post("/chat-sessions")
async def create_chat_session(
    payload: ChatSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat session for an AI conversation"""
    initial_messages = []
    if payload.initial_message:
        initial_messages.append({
            "role": "user",
            "content": payload.initial_message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    record = {
        "user_id": current_user["user_id"],
        "messages": initial_messages,
        "urgency_level": "medium",
    }
    result = supabase.table('chat_sessions').insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create chat session")
    return result.data[0]


@router.patch("/chat-sessions/{session_id}/add-message")
async def add_message_to_session(
    session_id: str,
    payload: ChatSessionAddMessage,
    current_user: dict = Depends(get_current_user)
):
    """Append a message to an existing chat session"""
    existing = supabase.table('chat_sessions').select('*').eq('id', session_id).eq('user_id', current_user["user_id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session = existing.data[0]
    messages = session.get('messages') or []
    messages.append({
        "role": payload.role,
        "content": payload.content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    update = supabase.table('chat_sessions').update({
        "messages": messages,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq('id', session_id).execute()

    return update.data[0] if update.data else session


@router.post("/chat-sessions/{session_id}/analyze")
async def analyze_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Use Groq to analyze chat conversation and generate case summary"""
    existing = supabase.table('chat_sessions').select('*').eq('id', session_id).eq('user_id', current_user["user_id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session = existing.data[0]
    messages = session.get('messages') or []
    if len(messages) < 1:
        raise HTTPException(status_code=400, detail="No messages to analyze")

    # Build conversation transcript
    transcript = "".join([f"{m.get('role', 'user').upper()}: {m.get('content','')}" for m in messages])

    prompt = f"""Analyze this legal conversation between a client and an AI legal assistant.
Return STRICT JSON with these fields:
{{
  "case_type": "one of: divorce, alimony, child_custody, dowry, domestic_violence, property_dispute, fraud, employment, consumer, criminal, cyber_crime, other",
  "summary": "5-6 line professional summary of the client's situation in plain English",
  "key_issues": ["issue1", "issue2", "issue3"],
  "urgency_level": "low | medium | high",
  "suggested_specialization": "lowercase keyword matching common specialization tags (e.g. divorce, property, criminal)",
  "confidence": 0.0-1.0
}}

CONVERSATION:
{transcript}
"""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a senior Indian legal expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=800,
        )
        raw = completion.choices[0].message.content.strip()
        if "```json" in raw:
            raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in raw:
            raw = raw.split("```", 1)[1].split("```", 1)[0].strip()
        data = json.loads(raw)
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        data = {
            "case_type": "other",
            "summary": "Unable to auto-analyze the conversation. Please consult an advocate.",
            "key_issues": [],
            "urgency_level": "medium",
            "suggested_specialization": "general",
            "confidence": 0.3,
        }

    update = supabase.table('chat_sessions').update({
        "detected_case_type": data.get("case_type"),
        "summary": data.get("summary"),
        "key_issues": data.get("key_issues") or [],
        "urgency_level": data.get("urgency_level") or "medium",
        "ai_response": data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq('id', session_id).execute()

    return {
        "success": True,
        "session": update.data[0] if update.data else session,
        "analysis": data,
    }


@router.get("/chat-sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Fetch a chat session by id (owner only, or advocate viewing meeting request)"""
    result = supabase.table('chat_sessions').select('*').eq('id', session_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Chat session not found")
    session = result.data[0]

    # Permission: owner OR advocate that has a meeting request linked to this session
    if session["user_id"] != current_user["user_id"]:
        # Check if current user is an advocate linked via meeting_requests
        adv = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        allowed = False
        if adv.data:
            adv_id = adv.data[0]["id"]
            link = supabase.table('meeting_requests').select('id').eq('chat_session_id', session_id).eq('advocate_id', adv_id).execute()
            allowed = bool(link.data)
        if not allowed:
            raise HTTPException(status_code=403, detail="Not authorized")

    return session


# ============= ADVOCATE RECOMMENDATIONS =============

@router.get("/advocate-recommendations")
async def recommend_advocates(
    case_type: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """AI-powered advocate matching based on case type, location, rating, experience.
    Returns advocates with a match_score (0-100)."""
    query = supabase.table('advocates').select('*, users(id, full_name, email, profile_image_url, phone)').eq('status', 'approved')
    result = query.execute()
    advocates = result.data or []

    case_type_lc = (case_type or "").lower().strip()
    location_lc = (location or "").lower().strip()

    scored = []
    for adv in advocates:
        spec_match = 0
        specs = [s.lower() for s in (adv.get('specializations') or [])]
        if case_type_lc:
            for s in specs:
                if case_type_lc in s or s in case_type_lc:
                    spec_match = 50
                    break

        loc_match = 0
        adv_loc = (adv.get('location') or '').lower()
        if location_lc and adv_loc:
            if location_lc in adv_loc or adv_loc in location_lc:
                loc_match = 20
            elif any(part in adv_loc for part in location_lc.split() if len(part) > 2):
                loc_match = 10

        rating = float(adv.get('rating') or 0)
        rating_score = min(20, rating * 4)  # 5★ → 20

        exp = int(adv.get('experience_years') or 0)
        exp_score = min(10, exp)  # 10+ years → 10

        score = spec_match + loc_match + rating_score + exp_score
        adv["match_score"] = round(score, 1)
        adv["matched_specialization"] = case_type_lc if spec_match > 0 else None
        scored.append(adv)

    scored.sort(key=lambda a: (a["match_score"], a.get("rating", 0), a.get("experience_years", 0)), reverse=True)
    top = scored[:limit]

    out = []
    for a in top:
        user_data = a.pop('users', None)
        out.append({
            **a,
            "user": user_data,
        })
    return {"advocates": out, "case_type": case_type, "location": location}


# ============= PETITIONS =============

@router.post("/petitions")
async def create_petition(
    case_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Advocate creates a petition (uploads PDF, status=draft)"""
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed for petitions")

    # Verify case exists and advocate is assigned to it
    case_result = supabase.table('cases').select('*').eq('id', case_id).execute()
    if not case_result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = case_result.data[0]

    # Get advocate profile to compare
    adv = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if not adv.data:
        raise HTTPException(status_code=403, detail="Advocate profile not found")
    advocate_id = adv.data[0]["id"]

    if case.get("advocate_id") and case["advocate_id"] != advocate_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this case")

  # Upload to Supabase Storage (case-documents bucket, petitions folder)
    upload_result = await upload_document_to_supabase(
        file, 
        bucket="case-documents",
        folder=f"petitions/{case_id}"
    )
    if not upload_result.get("success"):
        raise HTTPException(status_code=500, detail=f"Upload failed: {upload_result.get('error')}")

    record = {
        "case_id": case_id,
        "advocate_id": current_user["user_id"],  # store user_id as advocate_id (per schema)
        "title": title,
        "description": description,
        "document_url": upload_result["url"],
        "document_public_id": upload_result["public_id"],
        "status": PetitionStatus.DRAFT.value,
    }
    result = supabase.table('petitions').insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create petition")
    return result.data[0]


@router.patch("/petitions/{petition_id}/submit")
async def submit_petition(
    petition_id: str,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Submit a draft petition - notifies client, updates case stage."""
    existing = supabase.table('petitions').select('*').eq('id', petition_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Petition not found")
    petition = existing.data[0]

    if petition["advocate_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your petition")

    if petition["status"] == PetitionStatus.SUBMITTED.value:
        raise HTTPException(status_code=400, detail="Petition already submitted")

    now = datetime.now(timezone.utc).isoformat()
    update = supabase.table('petitions').update({
        "status": PetitionStatus.SUBMITTED.value,
        "submitted_at": now,
        "updated_at": now,
    }).eq('id', petition_id).execute()

    submitted = update.data[0] if update.data else petition

    # Update case stage to PETITION_FILED
    case_result = supabase.table('cases').select('*').eq('id', petition["case_id"]).execute()
    if case_result.data:
        case = case_result.data[0]
        prev_stage = case.get("current_stage") or "INITIATED"
        if prev_stage != "PETITION_FILED":
            supabase.table('cases').update({
                "current_stage": "PETITION_FILED",
                "updated_at": now
            }).eq('id', petition["case_id"]).execute()

            supabase.table('case_stage_history').insert({
                "case_id": petition["case_id"],
                "from_stage": prev_stage,
                "to_stage": "PETITION_FILED",
                "changed_by": current_user["user_id"],
                "notes": f"Petition '{petition['title']}' submitted",
            }).execute()

        # Notify client
        supabase.table('notifications').insert({
            "user_id": case["client_id"],
            "notification_type": NotificationType.CASE_UPDATE.value,
            "title": "Petition Submitted",
            "message": f"Your advocate has submitted a petition: {petition['title']}",
            "related_id": petition_id,
        }).execute()

    return submitted



@router.get("/petitions/mine")
async def list_my_petitions(
    current_user: dict = Depends(get_current_user)
):
    """List all petitions accessible to the current user.
    - Client: petitions (submitted only) on cases where they are the client.
    - Advocate: petitions (all statuses) on cases where they are assigned.
    """
    role = current_user.get("role")

    # Gather accessible case_ids
    if role == UserRole.CLIENT or role == "client":
        cases = supabase.table('cases').select('id, title, case_type').eq('client_id', current_user["user_id"]).execute()
        case_ids = [c["id"] for c in (cases.data or [])]
        if not case_ids:
            return []
        result = supabase.table('petitions').select('*').in_('case_id', case_ids).eq('status', PetitionStatus.SUBMITTED.value).order('created_at', desc=True).execute()
        case_map = {c["id"]: c for c in (cases.data or [])}
        for p in (result.data or []):
            p["case"] = case_map.get(p.get("case_id"))
        return result.data or []
    elif role == UserRole.ADVOCATE or role == "advocate":
        adv = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv.data:
            return []
        advocate_id = adv.data[0]["id"]
        cases = supabase.table('cases').select('id, title, case_type, client_id').eq('advocate_id', advocate_id).execute()
        case_ids = [c["id"] for c in (cases.data or [])]
        if not case_ids:
            return []
        result = supabase.table('petitions').select('*').in_('case_id', case_ids).order('created_at', desc=True).execute()
        case_map = {c["id"]: c for c in (cases.data or [])}
        for p in (result.data or []):
            p["case"] = case_map.get(p.get("case_id"))
        return result.data or []
    else:
        return []


@router.get("/petitions/case/{case_id}")
async def list_petitions_for_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List petitions for a case. Client sees only submitted, advocate sees all (including drafts)."""
    case_result = supabase.table('cases').select('*').eq('id', case_id).execute()
    if not case_result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = case_result.data[0]

    role = current_user.get("role")
    is_client = (role == UserRole.CLIENT or role == "client") and case["client_id"] == current_user["user_id"]
    is_advocate = False
    adv = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if adv.data and case.get("advocate_id") == adv.data[0]["id"]:
        is_advocate = True

    if not (is_client or is_advocate):
        raise HTTPException(status_code=403, detail="Not authorized for this case")

    query = supabase.table('petitions').select('*').eq('case_id', case_id).order('created_at', desc=True)
    if is_client and not is_advocate:
        query = query.eq('status', PetitionStatus.SUBMITTED.value)
    result = query.execute()
    return result.data or []


@router.get("/petitions/{petition_id}")
async def get_petition(
    petition_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get petition details - for client (only submitted) or assigned advocate."""
    result = supabase.table('petitions').select('*').eq('id', petition_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Petition not found")
    petition = result.data[0]

    case_result = supabase.table('cases').select('*').eq('id', petition["case_id"]).execute()
    if not case_result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = case_result.data[0]

    role = current_user.get("role")
    is_owner_advocate = petition["advocate_id"] == current_user["user_id"]
    is_client = (role == UserRole.CLIENT or role == "client") and case["client_id"] == current_user["user_id"]

    if is_client and petition["status"] != PetitionStatus.SUBMITTED.value:
        raise HTTPException(status_code=403, detail="Petition not yet submitted")
    if not (is_owner_advocate or is_client):
        raise HTTPException(status_code=403, detail="Not authorized")

    return petition
