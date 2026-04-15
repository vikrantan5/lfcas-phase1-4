# Complete FastAPI Backend for Legal Family Case Advisor System (LFCAS)
# Phase 5-9 Refactored - Correct Workflow Implementation
# Flow: AI Query → Advocate Recommendation → Meeting Request → Meeting → Case Creation

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
import socketio
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
import json
import uuid

# Import models
from models import (
    User, UserCreate, UserLogin, UserResponse, UserRole,
    AdvocateProfile, AdvocateCreate, AdvocateResponse, AdvocateStatus,
    Case, CaseCreate, CaseResponse, CaseStatus, CaseType,
    Hearing, HearingCreate,
    Document, DocumentCreate,
    Message, MessageCreate, MessageType,
    Notification, NotificationType,
    Rating, RatingCreate,
    AdminLog, GroqAILog,
    AIQueryRequest,
    # New models for workflow
    MeetingRequest, MeetingRequestCreate, MeetingRequestResponse, MeetingRequestStatus,
    Meeting, MeetingCreate, MeetingResponse, MeetingStatus, AdvocateDecision,
    CaseStageHistory, CaseStageHistoryCreate
)
from pydantic import BaseModel

# Import services
from auth import (
    get_current_user, require_role, create_user_with_auth, 
    login_user, get_supabase_client
)
from groq_service import analyze_case_with_groq, get_advocate_recommendation_criteria

# Additional models for API requests
class StatusUpdate(BaseModel):
    new_status: AdvocateStatus

class MeetingRequestResponseAction(BaseModel):
    action: str  # 'accept' or 'reject'
    rejection_reason: Optional[str] = None

class ScheduleMeetingRequest(BaseModel):
    meeting_request_id: str
    scheduled_date: datetime
    meeting_mode: str = "online"
    meeting_link: Optional[str] = None
    meeting_location: Optional[str] = None
    notes: Optional[str] = None

class AdvocateDecisionRequest(BaseModel):
    decision: str  # 'accept' or 'reject'
    decision_notes: Optional[str] = None
    case_title: Optional[str] = None

class CaseStageUpdateRequest(BaseModel):
    new_stage: str
    notes: Optional[str] = None

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get Supabase client
supabase = get_supabase_client()

# Socket.IO for real-time messaging
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create FastAPI app
app = FastAPI(title="Legal Family Case Advisor System - Refactored")

# Create API router
api_router = APIRouter(prefix="/api")


# ============= AUTHENTICATION ENDPOINTS =============
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user with Supabase Auth"""
    try:
        # Check if user already exists
        existing = supabase.table('users').select('*').eq('email', user_data.email).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user with Supabase Auth
        result = await create_user_with_auth(
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=user_data.role
        )
        
        # Create welcome notification
        notification_data = {
            "user_id": result['user']['id'],
            "notification_type": NotificationType.SYSTEM,
            "title": "Welcome to LFCAS",
            "message": f"Welcome {user_data.full_name}! Your account has been created successfully."
        }
        supabase.table('notifications').insert(notification_data).execute()
        
        return UserResponse(**result['user'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user with Supabase Auth"""
    return await login_user(credentials.email, credentials.password)


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current logged-in user information"""
    user = supabase.table('users').select('*').eq('id', current_user["user_id"]).execute()
    if not user.data or len(user.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user.data[0])


# ============= ADVOCATE ENDPOINTS =============
@api_router.post("/advocates/profile", response_model=AdvocateResponse)
async def create_advocate_profile(
    profile_data: AdvocateCreate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Create advocate profile"""
    # Check if profile already exists
    existing = supabase.table('advocates').select('*').eq('user_id', current_user["user_id"]).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    # Create profile
    profile = {
        "user_id": current_user["user_id"],
        "bar_council_id": profile_data.bar_council_id,
        "specialization": [s.value for s in profile_data.specialization],
        "experience_years": profile_data.experience_years,
        "location": profile_data.location,
        "bio": profile_data.bio,
        "status": AdvocateStatus.PENDING_APPROVAL
    }
    
    result = supabase.table('advocates').insert(profile).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create profile")
    
    return AdvocateResponse(**result.data[0])


@api_router.get("/advocates", response_model=List[AdvocateResponse])
async def list_advocates(
    status: Optional[AdvocateStatus] = None,
    location: Optional[str] = None,
    specialization: Optional[CaseType] = None,
    limit: int = 20
):
    """List advocates with filters"""
    query = supabase.table('advocates').select('*, users!inner(*)')
    
    if status:
        query = query.eq('status', status)
    if location:
        query = query.ilike('location', f'%{location}%')
    if specialization:
        query = query.contains('specialization', [specialization])
    
    result = query.limit(limit).execute()
    
    advocates = []
    for adv in result.data:
        user_data = adv.pop('users', None)
        adv_response = AdvocateResponse(**adv)
        if user_data:
            adv_response.user = UserResponse(**user_data)
        advocates.append(adv_response)
    
    return advocates


@api_router.get("/advocates/{advocate_id}", response_model=AdvocateResponse)
async def get_advocate(advocate_id: str):
    """Get advocate details"""
    result = supabase.table('advocates').select('*, users(*)').eq('id', advocate_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    adv = result.data[0]
    user_data = adv.pop('users', None)
    adv_response = AdvocateResponse(**adv)
    if user_data:
        adv_response.user = UserResponse(**user_data)
    
    return adv_response


@api_router.patch("/advocates/{advocate_id}/status")
async def update_advocate_status(
    advocate_id: str,
    status_data: StatusUpdate,
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER]))
):
    """Update advocate status (Admin only)"""
    result = supabase.table('advocates').update({
        "status": status_data.new_status
    }).eq('id', advocate_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    # Log admin action
    admin_log = {
        "admin_id": current_user["user_id"],
        "action": "update_advocate_status",
        "target_type": "advocate",
        "target_id": advocate_id,
        "details": {"new_status": status_data.new_status}
    }
    supabase.table('admin_logs').insert(admin_log).execute()
    
    # Notify advocate
    advocate = result.data[0]
    notification = {
        "user_id": advocate["user_id"],
        "notification_type": NotificationType.SYSTEM,
        "title": "Profile Status Updated",
        "message": f"Your advocate profile status has been updated to: {status_data.new_status}"
    }
    supabase.table('notifications').insert(notification).execute()
    
    return {"message": "Status updated successfully"}


# ============= AI QUERY ENDPOINTS (REFACTORED - No Case Creation) =============
@api_router.post("/ai/analyze")
async def analyze_legal_query(
    query: AIQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze legal query using Groq AI and return recommended advocates.
    This does NOT create a case - it just provides analysis and recommendations.
    """
    # Call Groq service
    ai_result = await analyze_case_with_groq(
        case_type=query.case_type,
        description=query.description,
        additional_details=query.additional_details
    )
    
    # Get recommended advocates based on case type and location
    recommended_advocates = []
    try:
        adv_query = supabase.table('advocates').select('*, users!inner(*)').eq('status', 'approved')
        
        if query.case_type:
            adv_query = adv_query.contains('specialization', [query.case_type.value])
        if query.location:
            adv_query = adv_query.ilike('location', f'%{query.location}%')
        
        adv_result = adv_query.order('rating', desc=True).order('experience_years', desc=True).limit(5).execute()
        
        for adv in adv_result.data:
            user_data = adv.pop('users', None)
            adv_response = AdvocateResponse(**adv)
            if user_data:
                adv_response.user = UserResponse(**user_data)
            recommended_advocates.append(adv_response)
    except Exception as e:
        logger.error(f"Error fetching advocates: {e}")
    
    # Log the query
    log = {
        "user_id": current_user["user_id"],
        "query": query.description,
        "response": ai_result,
        "tokens_used": ai_result.get("tokens_used")
    }
    supabase.table('groq_ai_logs').insert(log).execute()
    
    return {
        "ai_analysis": ai_result,
        "recommended_advocates": [adv.model_dump() for adv in recommended_advocates]
    }

# ============= NEW: MEETING REQUEST ENDPOINTS =============
@api_router.post("/meeting-requests", response_model=MeetingRequestResponse)
async def create_meeting_request(
    request_data: MeetingRequestCreate,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """
    Client requests a meeting with an advocate.
    This is the first step after AI analysis and advocate selection.
    """
    # Verify advocate exists and is approved
    advocate = supabase.table('advocates').select('*, users(*)').eq('id', request_data.advocate_id).eq('status', 'approved').execute()
    if not advocate.data or len(advocate.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate not found or not approved")
    
    # Check for existing pending request with same advocate
    existing = supabase.table('meeting_requests').select('*').eq('client_id', current_user["user_id"]).eq('advocate_id', request_data.advocate_id).eq('status', 'pending').execute()
    
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="You already have a pending meeting request with this advocate")
    
    # Create meeting request
    meeting_request = {
        "client_id": current_user["user_id"],
        "advocate_id": request_data.advocate_id,
        "case_type": request_data.case_type.value,
        "description": request_data.description,
        "location": request_data.location,
        "preferred_date": request_data.preferred_date.isoformat() if request_data.preferred_date else None,
        "ai_analysis": request_data.ai_analysis,
        "status": MeetingRequestStatus.PENDING
    }
    
    result = supabase.table('meeting_requests').insert(meeting_request).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create meeting request")
    
    created_request = result.data[0]
    
    # Notify advocate
    advocate_data = advocate.data[0]
    notification = {
        "user_id": advocate_data["user_id"],
        "notification_type": NotificationType.MEETING_REQUESTED,
        "title": "New Meeting Request",
        "message": f"A client has requested a meeting regarding a {request_data.case_type.value} case.",
        "related_id": created_request['id']
    }
    supabase.table('notifications').insert(notification).execute()
    
    # Emit real-time event
    await sio.emit('meeting_request', created_request, room=advocate_data["user_id"])
    
    return MeetingRequestResponse(**created_request)

@api_router.get("/meeting-requests", response_model=List[MeetingRequestResponse])
async def list_meeting_requests(
    status: Optional[MeetingRequestStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """List meeting requests for the current user"""
    query = supabase.table('meeting_requests').select('*, client:users!meeting_requests_client_id_fkey(*), advocate:advocates!meeting_requests_advocate_id_fkey(*, users(*))')
    
    # Filter based on role
    if current_user["role"] == UserRole.CLIENT:
        query = query.eq('client_id', current_user["user_id"])
    elif current_user["role"] == UserRole.ADVOCATE:
        # Get advocate profile first
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if adv_profile.data and len(adv_profile.data) > 0:
            query = query.eq('advocate_id', adv_profile.data[0]['id'])
        else:
            return []
    
    if status:
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True).execute()
    
    requests = []
    for req in result.data:
        client_data = req.pop('client', None)
        advocate_data = req.pop('advocate', None)
        
        req_response = MeetingRequestResponse(**req)
        if client_data:
            req_response.client = UserResponse(**client_data)
        if advocate_data:
            user_data = advocate_data.pop('users', None)
            adv_response = AdvocateResponse(**advocate_data)
            if user_data:
                adv_response.user = UserResponse(**user_data)
            req_response.advocate = adv_response
        
        requests.append(req_response)
    
    return requests


@api_router.get("/meeting-requests/{request_id}", response_model=MeetingRequestResponse)
async def get_meeting_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get meeting request details"""
    result = supabase.table('meeting_requests').select('*, client:users!meeting_requests_client_id_fkey(*), advocate:advocates!meeting_requests_advocate_id_fkey(*, users(*))').eq('id', request_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Meeting request not found")
    
    req = result.data[0]
    client_data = req.pop('client', None)
    advocate_data = req.pop('advocate', None)
    
    req_response = MeetingRequestResponse(**req)
    if client_data:
        req_response.client = UserResponse(**client_data)
    if advocate_data:
        user_data = advocate_data.pop('users', None)
        adv_response = AdvocateResponse(**advocate_data)
        if user_data:
            adv_response.user = UserResponse(**user_data)
        req_response.advocate = adv_response
    
    return req_response


@api_router.patch("/meeting-requests/{request_id}/respond")
async def respond_to_meeting_request(
    request_id: str,
    response_data: MeetingRequestResponseAction,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Advocate accepts or rejects a meeting request"""
    # Get meeting request
    result = supabase.table('meeting_requests').select('*').eq('id', request_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Meeting request not found")
    
    meeting_request = result.data[0]
    
    # Verify advocate owns this request
    adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if not adv_profile.data or adv_profile.data[0]['id'] != meeting_request['advocate_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if meeting_request['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Meeting request is not pending")
    
    # Update status
    new_status = MeetingRequestStatus.ACCEPTED if response_data.action == 'accept' else MeetingRequestStatus.REJECTED
    update_data = {"status": new_status}
    if response_data.rejection_reason:
        update_data["rejection_reason"] = response_data.rejection_reason
    
    supabase.table('meeting_requests').update(update_data).eq('id', request_id).execute()
    
    # Notify client
    notification_type = NotificationType.MEETING_ACCEPTED if response_data.action == 'accept' else NotificationType.MEETING_REJECTED
    notification = {
        "user_id": meeting_request["client_id"],
        "notification_type": notification_type,
        "title": f"Meeting Request {response_data.action.capitalize()}ed",
        "message": f"Your meeting request has been {response_data.action}ed by the advocate." + (f" Reason: {response_data.rejection_reason}" if response_data.rejection_reason else ""),
        "related_id": request_id
    }
    supabase.table('notifications').insert(notification).execute()
    
    # Emit real-time event
    await sio.emit('meeting_request_response', {
        'request_id': request_id,
        'action': response_data.action,
        'rejection_reason': response_data.rejection_reason
    }, room=meeting_request["client_id"])
    
    return {"message": f"Meeting request {response_data.action}ed successfully"}


# ============= NEW: MEETING ENDPOINTS =============
@api_router.post("/meetings", response_model=MeetingResponse)
async def schedule_meeting(
    meeting_data: ScheduleMeetingRequest,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Advocate schedules a meeting after accepting the request"""
    # Get meeting request
    request_result = supabase.table('meeting_requests').select('*').eq('id', meeting_data.meeting_request_id).execute()
    
    if not request_result.data or len(request_result.data) == 0:
        raise HTTPException(status_code=404, detail="Meeting request not found")
    
    meeting_request = request_result.data[0]
    
    # Verify advocate
    adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if not adv_profile.data or adv_profile.data[0]['id'] != meeting_request['advocate_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if meeting_request['status'] != 'accepted':
        raise HTTPException(status_code=400, detail="Meeting request must be accepted first")
    
    # Check if meeting already exists
    existing_meeting = supabase.table('meetings').select('*').eq('meeting_request_id', meeting_data.meeting_request_id).execute()
    if existing_meeting.data and len(existing_meeting.data) > 0:
        raise HTTPException(status_code=400, detail="Meeting already scheduled for this request")
    
    # Create meeting
    meeting = {
        "meeting_request_id": meeting_data.meeting_request_id,
        "client_id": meeting_request["client_id"],
        "advocate_id": meeting_request["advocate_id"],
        "scheduled_date": meeting_data.scheduled_date.isoformat(),
        "meeting_mode": meeting_data.meeting_mode,
        "meeting_link": meeting_data.meeting_link,
        "meeting_location": meeting_data.meeting_location,
        "notes": meeting_data.notes,
        "status": MeetingStatus.SCHEDULED,
        "advocate_decision": AdvocateDecision.PENDING
    }
    
    result = supabase.table('meetings').insert(meeting).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to schedule meeting")
    
    created_meeting = result.data[0]
    
    # Notify client
    notification = {
        "user_id": meeting_request["client_id"],
        "notification_type": NotificationType.MEETING_SCHEDULED,
        "title": "Meeting Scheduled",
        "message": f"Your meeting has been scheduled for {meeting_data.scheduled_date.strftime('%B %d, %Y at %I:%M %p')}",
        "related_id": created_meeting['id']
    }
    supabase.table('notifications').insert(notification).execute()
    
    # Emit real-time event
    await sio.emit('meeting_scheduled', created_meeting, room=meeting_request["client_id"])
    
    return MeetingResponse(**created_meeting)


@api_router.get("/meetings", response_model=List[MeetingResponse])
async def list_meetings(
    status: Optional[MeetingStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """List meetings for the current user"""
    query = supabase.table('meetings').select('*, client:users!meetings_client_id_fkey(*), advocate:advocates!meetings_advocate_id_fkey(*, users(*))')
    
    # Filter based on role
    if current_user["role"] == UserRole.CLIENT:
        query = query.eq('client_id', current_user["user_id"])
    elif current_user["role"] == UserRole.ADVOCATE:
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if adv_profile.data and len(adv_profile.data) > 0:
            query = query.eq('advocate_id', adv_profile.data[0]['id'])
        else:
            return []
    
    if status:
        query = query.eq('status', status)
    
    result = query.order('scheduled_date', desc=True).execute()
    
    meetings = []
    for m in result.data:
        client_data = m.pop('client', None)
        advocate_data = m.pop('advocate', None)
        
        m_response = MeetingResponse(**m)
        if client_data:
            m_response.client = UserResponse(**client_data)
        if advocate_data:
            user_data = advocate_data.pop('users', None)
            adv_response = AdvocateResponse(**advocate_data)
            if user_data:
                adv_response.user = UserResponse(**user_data)
            m_response.advocate = adv_response
        
        meetings.append(m_response)
    
    return meetings


@api_router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get meeting details"""
    result = supabase.table('meetings').select('*, client:users!meetings_client_id_fkey(*), advocate:advocates!meetings_advocate_id_fkey(*, users(*))').eq('id', meeting_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    m = result.data[0]
    client_data = m.pop('client', None)
    advocate_data = m.pop('advocate', None)
    
    m_response = MeetingResponse(**m)
    if client_data:
        m_response.client = UserResponse(**client_data)
    if advocate_data:
        user_data = advocate_data.pop('users', None)
        adv_response = AdvocateResponse(**advocate_data)
        if user_data:
            adv_response.user = UserResponse(**user_data)
        m_response.advocate = adv_response
    
    return m_response


@api_router.patch("/meetings/{meeting_id}/complete")
async def complete_meeting(
    meeting_id: str,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Mark meeting as completed"""
    # Get meeting
    result = supabase.table('meetings').select('*').eq('id', meeting_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = result.data[0]
    
    # Verify advocate
    adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if not adv_profile.data or adv_profile.data[0]['id'] != meeting['advocate_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update meeting status
    supabase.table('meetings').update({"status": MeetingStatus.COMPLETED}).eq('id', meeting_id).execute()
    
    return {"message": "Meeting marked as completed"}


@api_router.patch("/meetings/{meeting_id}/decision")
async def advocate_case_decision(
    meeting_id: str,
    decision_data: AdvocateDecisionRequest,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """
    Advocate decides to accept or reject taking the case after the meeting.
    If accepted, a case is automatically created.
    """
    # Get meeting with request details
    meeting_result = supabase.table('meetings').select('*, meeting_requests(*)').eq('id', meeting_id).execute()
    
    if not meeting_result.data or len(meeting_result.data) == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = meeting_result.data[0]
    meeting_request = meeting.get('meeting_requests')
    
    # Verify advocate
    adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if not adv_profile.data or adv_profile.data[0]['id'] != meeting['advocate_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if meeting['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Meeting must be completed first")
    
    if meeting['advocate_decision'] != 'pending':
        raise HTTPException(status_code=400, detail="Decision already made")
    
    # Update meeting decision
    decision = AdvocateDecision.ACCEPTED if decision_data.decision == 'accept' else AdvocateDecision.REJECTED
    supabase.table('meetings').update({
        "advocate_decision": decision,
        "decision_notes": decision_data.decision_notes
    }).eq('id', meeting_id).execute()
    
    created_case = None
    
    if decision_data.decision == 'accept':
        # CREATE THE CASE - This is the correct place for case creation!
        case_data = {
            "client_id": meeting['client_id'],
            "advocate_id": meeting['advocate_id'],
            "meeting_id": meeting_id,
            "case_type": meeting_request['case_type'] if meeting_request else 'other',
            "title": decision_data.case_title or f"Case from Meeting {meeting_id[:8]}",
            "description": meeting_request['description'] if meeting_request else '',
            "location": meeting_request['location'] if meeting_request else '',
            "status": CaseStatus.INITIATED,
            "current_stage": "INITIATED",
            "ai_analysis": meeting_request.get('ai_analysis') if meeting_request else None,
            "required_documents": meeting_request.get('ai_analysis', {}).get('data', {}).get('required_documents', []) if meeting_request else [],
            "legal_sections": meeting_request.get('ai_analysis', {}).get('data', {}).get('legal_sections', []) if meeting_request else [],
            "procedural_guidance": meeting_request.get('ai_analysis', {}).get('data', {}).get('procedural_guidance', '') if meeting_request else ''
        }
        
        case_result = supabase.table('cases').insert(case_data).execute()
        
        if case_result.data and len(case_result.data) > 0:
            created_case = case_result.data[0]
            
            # Create initial stage history
            stage_history = {
                "case_id": created_case['id'],
                "from_stage": None,
                "to_stage": "INITIATED",
                "changed_by": current_user["user_id"],
                "notes": "Case created after advocate accepted"
            }
            supabase.table('case_stage_history').insert(stage_history).execute()
            
            # Notify client about case creation
            notification = {
                "user_id": meeting['client_id'],
                "notification_type": NotificationType.CASE_APPROVED,
                "title": "Case Created!",
                "message": "The advocate has accepted your case. Your legal case has been officially created and is now in progress.",
                "related_id": created_case['id']
            }
            supabase.table('notifications').insert(notification).execute()
            
            # Emit real-time event
            await sio.emit('case_created', created_case, room=meeting['client_id'])
    else:
        # Notify client about rejection
        notification = {
            "user_id": meeting['client_id'],
            "notification_type": NotificationType.CASE_REJECTED_BY_ADVOCATE,
            "title": "Case Not Accepted",
            "message": f"The advocate has decided not to take your case." + (f" Reason: {decision_data.decision_notes}" if decision_data.decision_notes else " You can request a meeting with another advocate."),
            "related_id": meeting_id
        }
        supabase.table('notifications').insert(notification).execute()
        
        await sio.emit('case_rejected', {'meeting_id': meeting_id, 'reason': decision_data.decision_notes}, room=meeting['client_id'])
    
    return {
        "message": f"Decision recorded: Case {'accepted and created' if decision_data.decision == 'accept' else 'rejected'}",
        "case": created_case
    }


# ============= CASE ENDPOINTS (REFACTORED) =============
@api_router.get("/cases", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[CaseStatus] = None,
    case_type: Optional[CaseType] = None,
    current_user: dict = Depends(get_current_user)
):
    """List cases based on user role"""
    query = supabase.table('cases').select('*, client:users!cases_client_id_fkey(*), advocate:advocates!cases_advocate_id_fkey(*, users(*))')
    
    # Filter based on role
    if current_user["role"] == UserRole.CLIENT:
        query = query.eq('client_id', current_user["user_id"])
    elif current_user["role"] == UserRole.ADVOCATE:
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if adv_profile.data and len(adv_profile.data) > 0:
            query = query.eq('advocate_id', adv_profile.data[0]['id'])
        else:
            return []
    # Platform managers can see all cases
    
    if status:
        query = query.eq('status', status)
    if case_type:
        query = query.eq('case_type', case_type)
    
    result = query.order('created_at', desc=True).limit(100).execute()
    
    cases = []
    for case_data in result.data:
        client_data = case_data.pop('client', None)
        advocate_data = case_data.pop('advocate', None)
        
        case_response = CaseResponse(**case_data)
        
        if client_data:
            case_response.client = UserResponse(**client_data)
        
        if advocate_data:
            user_data = advocate_data.pop('users', None)
            adv_response = AdvocateResponse(**advocate_data)
            if user_data:
                adv_response.user = UserResponse(**user_data)
            case_response.advocate = adv_response
        
        cases.append(case_response)
    
    return cases


@api_router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get case details"""
    result = supabase.table('cases').select('*, client:users!cases_client_id_fkey(*), advocate:advocates!cases_advocate_id_fkey(*, users(*))').eq('id', case_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = result.data[0]
    client_data = case.pop('client', None)
    advocate_data = case.pop('advocate', None)
    
    # Check access permissions
    if current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] == UserRole.ADVOCATE:
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or adv_profile.data[0]['id'] != case.get("advocate_id"):
            raise HTTPException(status_code=403, detail="Access denied")
    
    case_response = CaseResponse(**case)
    
    if client_data:
        case_response.client = UserResponse(**client_data)
    if advocate_data:
        user_data = advocate_data.pop('users', None)
        adv_response = AdvocateResponse(**advocate_data)
        if user_data:
            adv_response.user = UserResponse(**user_data)
        case_response.advocate = adv_response
    
    return case_response


# ============= CASE LIFECYCLE MANAGEMENT =============
@api_router.patch("/cases/{case_id}/stage")
async def update_case_stage(
    case_id: str,
    stage_data: CaseStageUpdateRequest,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE, UserRole.PLATFORM_MANAGER]))
):
    """Update case stage (lifecycle progression)"""
    # Valid stage transitions
    valid_stages = ["INITIATED", "PETITION_FILED", "COURT_REVIEW", "HEARING_SCHEDULED", "HEARING_DONE", "JUDGMENT_PENDING", "CLOSED"]
    
    if stage_data.new_stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Valid stages: {', '.join(valid_stages)}")
    
    # Get case
    case_result = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not case_result.data or len(case_result.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = case_result.data[0]
    current_stage = case.get('current_stage', 'INITIATED')
    
    # Verify advocate access
    if current_user["role"] == UserRole.ADVOCATE:
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or adv_profile.data[0]['id'] != case.get("advocate_id"):
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Update case stage
    new_status = CaseStatus.CLOSED if stage_data.new_stage == "CLOSED" else case['status']
    supabase.table('cases').update({
        "current_stage": stage_data.new_stage,
        "status": new_status
    }).eq('id', case_id).execute()
    
    # Record stage history
    stage_history = {
        "case_id": case_id,
        "from_stage": current_stage,
        "to_stage": stage_data.new_stage,
        "changed_by": current_user["user_id"],
        "notes": stage_data.notes
    }
    supabase.table('case_stage_history').insert(stage_history).execute()
    
    # Notify client
    notification = {
        "user_id": case["client_id"],
        "notification_type": NotificationType.CASE_UPDATE,
        "title": "Case Stage Updated",
        "message": f"Your case has progressed to: {stage_data.new_stage.replace('_', ' ').title()}",
        "related_id": case_id
    }
    supabase.table('notifications').insert(notification).execute()
    
    return {"message": f"Case stage updated to {stage_data.new_stage}"}


@api_router.get("/cases/{case_id}/stage-history")
async def get_case_stage_history(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get case stage history"""
    # Verify access
    case = supabase.table('cases').select('*').eq('id', case_id).execute()
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    if current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = supabase.table('case_stage_history').select('*').eq('case_id', case_id).order('created_at', desc=True).execute()
    
    return result.data


# ============= HEARING ENDPOINTS =============
@api_router.post("/hearings", response_model=Hearing)
async def create_hearing(
    hearing_data: HearingCreate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Create a hearing schedule"""
    # Verify case exists and advocate has access
    case = supabase.table('cases').select('*').eq('id', hearing_data.case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    # Verify advocate
    adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
    if not adv_profile.data or adv_profile.data[0]['id'] != case_data.get("advocate_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create hearing
    hearing = {
        "case_id": hearing_data.case_id,
        "hearing_date": hearing_data.hearing_date.isoformat(),
        "court_name": hearing_data.court_name,
        "court_room": hearing_data.court_room,
        "notes": hearing_data.notes
    }
    
    result = supabase.table('hearings').insert(hearing).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create hearing")
    
    # Update case stage
    supabase.table('cases').update({
        "current_stage": "HEARING_SCHEDULED",
        "status": CaseStatus.HEARING_SCHEDULED
    }).eq('id', hearing_data.case_id).execute()
    
    # Notify client
    notification = {
        "user_id": case_data["client_id"],
        "notification_type": NotificationType.HEARING_REMINDER,
        "title": "Hearing Scheduled",
        "message": f"A hearing has been scheduled for {hearing_data.hearing_date.strftime('%B %d, %Y')}",
        "related_id": result.data[0]['id']
    }
    supabase.table('notifications').insert(notification).execute()
    
    return Hearing(**result.data[0])


@api_router.get("/hearings/case/{case_id}", response_model=List[Hearing])
async def get_case_hearings(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all hearings for a case"""
    # Verify access
    case = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    if current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = supabase.table('hearings').select('*').eq('case_id', case_id).order('hearing_date').execute()
    
    return [Hearing(**h) for h in result.data]


# ============= DOCUMENT ENDPOINTS =============
@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    case_id: str = Form(...),
    document_name: str = Form(...),
    document_type: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document to a case"""
    # Verify case access
    case = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    if current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] == UserRole.ADVOCATE:
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or adv_profile.data[0]['id'] != case_data.get("advocate_id"):
            raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{case_id}/{uuid.uuid4()}.{file_extension}" if file_extension else f"{case_id}/{uuid.uuid4()}"
        
        # Upload to Supabase Storage
        storage_response = supabase.storage.from_('case-documents').upload(
            path=unique_filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_('case-documents').get_public_url(unique_filename)
        
        # Create document record
        document = {
            "case_id": case_id,
            "uploaded_by": current_user["user_id"],
            "document_name": document_name,
            "document_type": document_type,
            "cloudinary_url": public_url,
            "cloudinary_public_id": unique_filename,
            "description": description,
            "file_size": file_size
        }
        
        result = supabase.table('documents').insert(document).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to save document metadata")
        
        # Notify other party
        notify_user_id = case_data.get("advocate_id") if current_user["role"] == UserRole.CLIENT else case_data["client_id"]
        if notify_user_id:
            # Get advocate's user_id if notifying advocate
            if current_user["role"] == UserRole.CLIENT:
                adv = supabase.table('advocates').select('user_id').eq('id', notify_user_id).execute()
                if adv.data:
                    notify_user_id = adv.data[0]['user_id']
            
            notification = {
                "user_id": notify_user_id,
                "notification_type": NotificationType.DOCUMENT_UPLOADED,
                "title": "New Document Uploaded",
                "message": f"A new document '{document_name}' has been uploaded to the case.",
                "related_id": result.data[0]['id']
            }
            supabase.table('notifications').insert(notification).execute()
        
        return Document(**result.data[0])
        
    except Exception as e:
        logger.error(f"Document upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.get("/documents/case/{case_id}", response_model=List[Document])
async def get_case_documents(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents for a case"""
    # Verify access
    case = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    if current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = supabase.table('documents').select('*').eq('case_id', case_id).order('created_at', desc=True).execute()
    
    return [Document(**d) for d in result.data]


# ============= MESSAGE ENDPOINTS =============
@api_router.post("/messages", response_model=Message)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message"""
    receiver_id = None
    
    if message_data.case_id:
        # Message within a case
        case = supabase.table('cases').select('*').eq('id', message_data.case_id).execute()
        
        if not case.data or len(case.data) == 0:
            raise HTTPException(status_code=404, detail="Case not found")
        
        case_data = case.data[0]
        
        if current_user["role"] == UserRole.CLIENT:
            if case_data["client_id"] != current_user["user_id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            # Get advocate's user_id
            if case_data.get("advocate_id"):
                adv = supabase.table('advocates').select('user_id').eq('id', case_data["advocate_id"]).execute()
                if adv.data:
                    receiver_id = adv.data[0]['user_id']
        else:
            adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
            if not adv_profile.data or adv_profile.data[0]['id'] != case_data.get("advocate_id"):
                raise HTTPException(status_code=403, detail="Access denied")
            receiver_id = case_data["client_id"]
    
    elif message_data.meeting_request_id:
        # Message for meeting request (pre-case)
        req = supabase.table('meeting_requests').select('*').eq('id', message_data.meeting_request_id).execute()
        
        if not req.data or len(req.data) == 0:
            raise HTTPException(status_code=404, detail="Meeting request not found")
        
        req_data = req.data[0]
        
        if current_user["role"] == UserRole.CLIENT:
            if req_data["client_id"] != current_user["user_id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            # Get advocate's user_id
            adv = supabase.table('advocates').select('user_id').eq('id', req_data["advocate_id"]).execute()
            if adv.data:
                receiver_id = adv.data[0]['user_id']
        else:
            adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
            if not adv_profile.data or adv_profile.data[0]['id'] != req_data["advocate_id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            receiver_id = req_data["client_id"]
    
    if not receiver_id:
        raise HTTPException(status_code=400, detail="Could not determine message recipient")
    
    # Create message - only include fields that exist in the database
    message = {
        "case_id": message_data.case_id,
        "sender_id": current_user["user_id"],
        "receiver_id": receiver_id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "attachment_url": message_data.attachment_url
    }
    
    result = supabase.table('messages').insert(message).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to send message")
    
    msg = result.data[0]
    
    # Send real-time notification via Socket.IO
    await sio.emit('new_message', msg, room=receiver_id)
    
    # Create notification
    notification = {
        "user_id": receiver_id,
        "notification_type": NotificationType.NEW_MESSAGE,
        "title": "New Message",
        "message": "You have a new message.",
        "related_id": msg['id']
    }
    supabase.table('notifications').insert(notification).execute()
    
    return Message(**msg)


@api_router.get("/messages/case/{case_id}", response_model=List[Message])
async def get_case_messages(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a case"""
    # Verify access
    case = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    if current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = supabase.table('messages').select('*').eq('case_id', case_id).order('created_at').execute()
    
    # Mark messages as read
    supabase.table('messages').update({"is_read": True}).eq('case_id', case_id).eq('receiver_id', current_user["user_id"]).execute()
    
    return [Message(**m) for m in result.data]


@api_router.get("/messages/meeting-request/{request_id}", response_model=List[Message])
async def get_meeting_request_messages(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a meeting request"""
    result = supabase.table('messages').select('*').eq('meeting_request_id', request_id).order('created_at').execute()
    
    # Mark messages as read
    supabase.table('messages').update({"is_read": True}).eq('meeting_request_id', request_id).eq('receiver_id', current_user["user_id"]).execute()
    
    return [Message(**m) for m in result.data]


# ============= NOTIFICATION ENDPOINTS =============
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user notifications"""
    result = supabase.table('notifications').select('*').eq('user_id', current_user["user_id"]).order('created_at', desc=True).limit(limit).execute()
    
    return [Notification(**n) for n in result.data]


@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    result = supabase.table('notifications').update({"is_read": True}).eq('id', notification_id).eq('user_id', current_user["user_id"]).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


# ============= RATING ENDPOINTS =============
@api_router.post("/ratings", response_model=Rating)
async def create_rating(
    rating_data: RatingCreate,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Rate an advocate after case completion"""
    # Verify case is closed and belongs to user
    case = supabase.table('cases').select('*').eq('id', rating_data.case_id).eq('client_id', current_user["user_id"]).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    if case_data.get('current_stage') != 'CLOSED' and case_data.get('status') != 'closed':
        raise HTTPException(status_code=400, detail="Case must be closed before rating")
    
    # Check if already rated
    existing = supabase.table('ratings').select('*').eq('case_id', rating_data.case_id).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="Case already rated")
    
    # Create rating
    rating = {
        "case_id": rating_data.case_id,
        "client_id": current_user["user_id"],
        "advocate_id": rating_data.advocate_id,
        "rating": rating_data.rating,
        "review": rating_data.review
    }
    
    result = supabase.table('ratings').insert(rating).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create rating")
    
    return Rating(**result.data[0])


@api_router.get("/ratings/advocate/{advocate_id}", response_model=List[Rating])
async def get_advocate_ratings(advocate_id: str, limit: int = 20):
    """Get ratings for an advocate"""
    result = supabase.table('ratings').select('*').eq('advocate_id', advocate_id).order('created_at', desc=True).limit(limit).execute()
    
    return [Rating(**r) for r in result.data]


# ============= ADMIN/ANALYTICS ENDPOINTS =============
@api_router.get("/admin/stats")
async def get_platform_stats(
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER]))
):
    """Get platform statistics"""
    total_users = supabase.table('users').select('*', count='exact').execute().count
    total_clients = supabase.table('users').select('*', count='exact').eq('role', 'client').execute().count
    total_advocates = supabase.table('advocates').select('*', count='exact').execute().count
    approved_advocates = supabase.table('advocates').select('*', count='exact').eq('status', 'approved').execute().count
    pending_advocates = supabase.table('advocates').select('*', count='exact').eq('status', 'pending_approval').execute().count
    
    total_cases = supabase.table('cases').select('*', count='exact').execute().count
    active_cases = supabase.table('cases').select('*', count='exact').neq('current_stage', 'CLOSED').execute().count
    closed_cases = supabase.table('cases').select('*', count='exact').eq('current_stage', 'CLOSED').execute().count
    
    # Meeting requests stats
    total_meeting_requests = supabase.table('meeting_requests').select('*', count='exact').execute().count
    pending_meeting_requests = supabase.table('meeting_requests').select('*', count='exact').eq('status', 'pending').execute().count
    
    # Meetings stats
    total_meetings = supabase.table('meetings').select('*', count='exact').execute().count
    
    # Case distribution by type
    case_types = {}
    for case_type in CaseType:
        count = supabase.table('cases').select('*', count='exact').eq('case_type', case_type.value).execute().count
        case_types[case_type.value] = count
    
    # Recent activity
    recent_cases = supabase.table('cases').select('*').order('created_at', desc=True).limit(5).execute().data
    recent_meetings = supabase.table('meetings').select('*').order('created_at', desc=True).limit(5).execute().data
    
    return {
        "users": {
            "total": total_users,
            "clients": total_clients,
            "advocates": total_advocates
        },
        "advocates": {
            "approved": approved_advocates,
            "pending": pending_advocates
        },
        "cases": {
            "total": total_cases,
            "active": active_cases,
            "closed": closed_cases,
            "by_type": case_types
        },
        "meeting_requests": {
            "total": total_meeting_requests,
            "pending": pending_meeting_requests
        },
        "meetings": {
            "total": total_meetings
        },
        "recent_cases": recent_cases,
        "recent_meetings": recent_meetings
    }


@api_router.get("/admin/logs", response_model=List[AdminLog])
async def get_admin_logs(
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER])),
    limit: int = 50
):
    """Get admin activity logs"""
    result = supabase.table('admin_logs').select('*').order('created_at', desc=True).limit(limit).execute()
    
    return [AdminLog(**l) for l in result.data]



# ============= VOICE AI ENDPOINTS =============
from voice_models import (
    VoiceSessionCreate, VoiceSessionResponse, VoiceMessageCreate,
    VoiceMessageResponse, AICaseAnalysisCreate, AICaseAnalysisResponse,
    VoiceCaseDraftCreate, VoiceCaseDraftResponse, ProcessVoiceConversationRequest,
    ConfirmCaseDraftRequest, VoiceToMeetingRequestRequest, VoiceLanguage
)
from vapi_service import get_vapi_service

@api_router.post("/voice/start-session", response_model=VoiceSessionResponse)
async def start_voice_session(
    session_data: VoiceSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Start a new voice AI session using existing Vapi assistant"""
    try:
        vapi_service = get_vapi_service()
        
        # Get existing assistant ID (multilingual assistant)
        logger.info(f"Starting session with language: {session_data.language}")
        assistant_result = vapi_service.get_assistant_id(language=session_data.language)
        
        if not assistant_result["success"]:
            logger.error(f"Failed to get assistant ID: {assistant_result.get('error')}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to initialize AI assistant: {assistant_result.get('error', 'Unknown error')}"
            )
        
        assistant_id = assistant_result["assistant_id"]
        logger.info(f"Using Vapi assistant: {assistant_id}")
        
        # Create voice session in database with assistant ID
        session = {
            "user_id": current_user["user_id"],
            "language": session_data.language,
            "vapi_assistant_id": assistant_id,
            "status": "initiated"
        }
        
        result = supabase.table('voice_sessions').insert(session).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create session in database")
        
        session_id = result.data[0]['id']
        logger.info(f"Voice session created: {session_id}")
        
        # Create initial greeting message
        language_greetings = {
            "english": "Hello! I'm your AI legal assistant. I'm here to help you with your family law issue. Could you please tell me what legal problem you're facing?",
            "hindi": "नमस्ते! मैं आपका AI कानूनी सहायक हूं। मैं आपकी पारिवारिक कानूनी समस्या में मदद के लिए यहां हूं। कृपया मुझे बताएं कि आप किस कानूनी समस्या का सामना कर रहे हैं?",
            "bengali": "নমস্কার! আমি আপনার AI আইনি সহায়ক। আমি আপনার পারিবারিক আইনের সমস্যায় সাহায্য করতে এখানে আছি। আপনি কোন আইনি সমস্যার সম্মুখীন হচ্ছেন তা আমাকে বলুন?"
        }
        
        greeting_msg = {
            "session_id": session_id,
            "sender": "ai",
            "message": language_greetings.get(session_data.language, language_greetings["english"]),
            "message_type": "greeting"
        }
        supabase.table('voice_messages').insert(greeting_msg).execute()
        
        # Return session with assistant ID for frontend to start call
        session_response = result.data[0]
        return VoiceSessionResponse(**session_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting voice session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start voice session: {str(e)}")
@api_router.post("/voice/save-message")
async def save_voice_message(
    message_data: VoiceMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Save a message from voice conversation"""
    try:
        # Verify session belongs to user
        session = supabase.table('voice_sessions').select('*').eq('id', message_data.session_id).eq('user_id', current_user["user_id"]).execute()
        
        if not session.data or len(session.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Save message
        message = {
            "session_id": message_data.session_id,
            "sender": message_data.sender,
            "message": message_data.message,
            "message_type": message_data.message_type,
            "audio_url": message_data.audio_url
        }
        
        result = supabase.table('voice_messages').insert(message).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to save message")
        
        return {"success": True, "message": VoiceMessageResponse(**result.data[0])}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving voice message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/voice/process-conversation")
async def process_voice_conversation(
    request: ProcessVoiceConversationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Process voice conversation with Groq AI and create case analysis"""
    try:
        logger.info(f"Processing conversation for session: {request.session_id}")
        
        # Verify session
        session = supabase.table('voice_sessions').select('*').eq('id', request.session_id).eq('user_id', current_user["user_id"]).execute()
        
        if not session.data or len(session.data) == 0:
            logger.error(f"Session not found: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Validate transcript
        if not request.transcript or len(request.transcript.strip()) < 20:
            logger.error("Transcript too short or empty")
            raise HTTPException(
                status_code=400, 
                detail="Please provide a detailed description of your legal problem. The conversation is too short."
            )
        
        vapi_service = get_vapi_service()
        
        # Extract case info from transcript with validation
        case_info = vapi_service.extract_case_info_from_transcript(
            request.transcript,
            request.language
        )
        
        logger.info(f"Case info extracted: {case_info.get('case_type')}, is_legal: {case_info.get('is_legal')}")
        
        # Validate if conversation is about legal matters
        if not case_info.get("is_legal", True):
            logger.warning(f"Non-legal conversation detected: {case_info.get('validation_reason')}")
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ {case_info.get('validation_reason')} This is a legal advisory system. Please describe your family law issue (divorce, custody, alimony, etc.)"
            )
        
        # Determine case type
        case_type_str = case_info.get("case_type", "other")
        if not case_type_str or case_type_str == "other":
            logger.warning("Could not determine specific case type")
        
        try:
            case_type = CaseType(case_type_str)
        except ValueError:
            logger.warning(f"Invalid case type: {case_type_str}, defaulting to OTHER")
            case_type = CaseType.OTHER
        
        
        # Analyze with Groq
        logger.info(f"Calling Groq AI for analysis, case_type: {case_type}")
        ai_result = await analyze_case_with_groq(
            case_type=case_type,
            description=request.transcript,
            additional_details=case_info.get("additional_details", {})
        )
        
        if not ai_result.get("success"):
            error_msg = ai_result.get("error", "Unknown error")
            logger.error(f"AI analysis failed: {error_msg}")
            raise HTTPException(
                status_code=500, 
                detail=f"AI analysis failed: {error_msg}. Please try again or consult an advocate directly."
            )
        
        ai_data = ai_result.get("data", {})
        if not ai_data:
            logger.error("AI returned empty data")
            raise HTTPException(status_code=500, detail="AI analysis returned no data")
        
        logger.info(f"AI analysis successful, tokens used: {ai_result.get('tokens_used')}")
        
        # Create AI case analysis record
        analysis = {
            "session_id": request.session_id,
            "user_id": current_user["user_id"],
            "case_type": case_type_str,
            "location": case_info.get("location"),
            "urgency_level": case_info.get("urgency", "medium"),
            "structured_output": ai_data,
            "legal_sections": ai_data.get("legal_sections", []),
            "required_documents": ai_data.get("required_documents", []),
            "procedural_guidance": ai_data.get("procedural_guidance"),
            "recommended_actions": ai_data.get("recommended_actions", []),
            "estimated_timeline": ai_data.get("estimated_timeline"),
            "important_notes": ai_data.get("important_notes", []),
            "groq_tokens_used": ai_result.get("tokens_used")
        }
        
        logger.info("Saving AI case analysis to database")
        analysis_result = supabase.table('ai_case_analysis').insert(analysis).execute()
        
        if not analysis_result.data or len(analysis_result.data) == 0:
            logger.error("Failed to save AI analysis to database")
            raise HTTPException(status_code=500, detail="Failed to save analysis to database")
        
        analysis_id = analysis_result.data[0]['id']
        logger.info(f"AI analysis saved with ID: {analysis_id}")
        
        # Update session
        supabase.table('voice_sessions').update({
            "transcript": request.transcript,
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq('id', request.session_id).execute()
        
        # Get recommended advocates
        location = case_info.get("location", "") or "Not specified"
        advocates_query = supabase.table('advocates').select('*, users!inner(*)').eq('status', 'approved')
        
        # Only filter by location if it's actually specified
        if location and location != "Not specified":
            advocates_query = advocates_query.ilike('location', f'%{location}%')
        
        advocates_result = advocates_query.limit(5).execute()
        recommended_advocates = advocates_result.data if advocates_result.data else []
        
        # Create case draft
        draft_title = f"{case_type_str.replace('_', ' ').title()} Case - {datetime.now().strftime('%Y-%m-%d')}"
        draft = {
            "session_id": request.session_id,
            "analysis_id": analysis_id,
            "user_id": current_user["user_id"],
            "case_type": case_type_str,
            "title": draft_title,
            "description": request.transcript[:1000],  # Limit description length
            "location": location,
            "ai_analysis": ai_data,
            "recommended_advocates": recommended_advocates,
            "status": "draft"
        }
        
        draft_result = supabase.table('voice_case_drafts').insert(draft).execute()
        
        if not draft_result.data or len(draft_result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create case draft")
        
        # Log AI query
        ai_log = {
            "user_id": current_user["user_id"],
            "query": request.transcript,
            "response": ai_data,
            "tokens_used": ai_result.get("tokens_used")
        }
        supabase.table('groq_ai_logs').insert(ai_log).execute()
        
        return {
            "success": True,
            "analysis": AICaseAnalysisResponse(**analysis_result.data[0]),
            "case_draft": VoiceCaseDraftResponse(**draft_result.data[0]),
            "recommended_advocates": recommended_advocates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing voice conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/voice/sessions", response_model=List[VoiceSessionResponse])
async def get_user_voice_sessions(
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get user's voice sessions"""
    try:
        result = supabase.table('voice_sessions').select('*').eq('user_id', current_user["user_id"]).order('created_at', desc=True).limit(limit).execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        logger.error(f"Error fetching voice sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/voice/session/{session_id}", response_model=VoiceSessionResponse)
async def get_voice_session_details(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed voice session with messages and analysis"""
    try:
        # Get session
        session_result = supabase.table('voice_sessions').select('*').eq('id', session_id).eq('user_id', current_user["user_id"]).execute()
        
        if not session_result.data or len(session_result.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Get messages
        messages_result = supabase.table('voice_messages').select('*').eq('session_id', session_id).order('timestamp').execute()
        session['messages'] = messages_result.data if messages_result.data else []
        
        # Get analysis
        analysis_result = supabase.table('ai_case_analysis').select('*').eq('session_id', session_id).execute()
        if analysis_result.data and len(analysis_result.data) > 0:
            session['analysis'] = analysis_result.data[0]
        
        return VoiceSessionResponse(**session)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/voice/case-drafts", response_model=List[VoiceCaseDraftResponse])
async def get_user_case_drafts(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None
):
    """Get user's case drafts from voice sessions"""
    try:
        query = supabase.table('voice_case_drafts').select('*').eq('user_id', current_user["user_id"])
        
        if status:
            query = query.eq('status', status)
        
        result = query.order('created_at', desc=True).execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        logger.error(f"Error fetching case drafts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/voice/confirm-draft/{draft_id}")
async def confirm_case_draft(
    draft_id: str,
    request: ConfirmCaseDraftRequest,
    current_user: dict = Depends(get_current_user)
):
    """Confirm case draft and create meeting request with advocate"""
    try:
        # Get draft
        draft_result = supabase.table('voice_case_drafts').select('*').eq('id', draft_id).eq('user_id', current_user["user_id"]).execute()
        
        if not draft_result.data or len(draft_result.data) == 0:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        draft = draft_result.data[0]
        
        if not request.selected_advocate_id:
            raise HTTPException(status_code=400, detail="Advocate selection required")
        
        # Get advocate details to retrieve user_id for notification
        advocate_result = supabase.table('advocates').select('id, user_id').eq('id', request.selected_advocate_id).execute()
        
        if not advocate_result.data or len(advocate_result.data) == 0:
            raise HTTPException(status_code=404, detail="Selected advocate not found")
        
        advocate = advocate_result.data[0]
        advocate_user_id = advocate['user_id']
        
        # Update draft status
        supabase.table('voice_case_drafts').update({
            "status": "confirmed"
        }).eq('id', draft_id).execute()
        
        # Create meeting request - Fix location to handle None values
        meeting_request = {
            "client_id": current_user["user_id"],
            "advocate_id": request.selected_advocate_id,
            "case_type": draft['case_type'],
            "description": draft['description'],
            "location": draft.get('location') if draft.get('location') else 'Not specified',
            "ai_analysis": draft.get('ai_analysis'),
            "status": "pending"
        }
        
        meeting_result = supabase.table('meeting_requests').insert(meeting_request).execute()
        
        if not meeting_result.data or len(meeting_result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create meeting request")
        
        # Create notification for advocate using user_id from advocates table
        try:
            notification = {
                "user_id": advocate_user_id,
                "notification_type": "meeting_requested",
                "title": "New Meeting Request from Voice Session",
                "message": f"New meeting request for {draft['case_type']} case",
                "related_id": meeting_result.data[0]['id']
            }
            supabase.table('notifications').insert(notification).execute()
            logger.info(f"Notification created for advocate user_id: {advocate_user_id}")
        except Exception as notif_error:
            # Log notification error but don't fail the entire request
            logger.error(f"Failed to create notification: {str(notif_error)}")
        
        return {
            "success": True,
            "meeting_request": meeting_result.data[0],
            "message": "Meeting request created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming case draft: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ============= SOCKET.IO EVENTS =============
@sio.event
async def connect(sid, environ):
    """Socket.IO connection event with authentication"""
    try:
        # Extract token from query params or headers
        token = None
        
        # Try to get from query string
        query_string = environ.get('QUERY_STRING', '')
        if 'token=' in query_string:
            for param in query_string.split('&'):
                if param.startswith('token='):
                    token = param.split('=')[1]
                    break
        
        # Try to get from headers
        if not token:
            auth_header = environ.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
        
        # If no token, reject connection
        if not token:
            logger.warning(f"Socket connection rejected - no token: {sid}")
            return False
        
        # Verify token with Supabase
        try:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                logger.info(f"Socket authenticated: {sid} - User: {user_response.user.id}")
                await sio.emit('connected', {'data': 'Connected to LFCAS server'}, room=sid)
                return True
            else:
                logger.warning(f"Socket connection rejected - invalid token: {sid}")
                return False
        except Exception as auth_error:
            logger.error(f"Socket auth error: {auth_error}")
            return False
            
    except Exception as e:
        logger.error(f"Socket connection error: {e}")
        return False


@sio.event
async def disconnect(sid):
    """Socket.IO disconnection event"""
    logger.info(f"Client disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    """Join a user-specific room for real-time updates"""
    user_id = data.get('user_id')
    if user_id:
        sio.enter_room(sid, user_id)
        logger.info(f"User {user_id} joined personal room (sid: {sid})")
        await sio.emit('room_joined', {'user_id': user_id}, room=sid)


@sio.event
async def join_case(sid, data):
    """Join a case-specific room for real-time messaging"""
    case_id = data.get('case_id')
    if case_id:
        sio.enter_room(sid, f"case_{case_id}")
        logger.info(f"Socket {sid} joined case room: {case_id}")
        await sio.emit('case_joined', {'case_id': case_id}, room=sid)


@sio.event
async def leave_case(sid, data):
    """Leave a case-specific room"""
    case_id = data.get('case_id')
    if case_id:
        sio.leave_room(sid, f"case_{case_id}")
        logger.info(f"Socket {sid} left case room: {case_id}")


@sio.event
async def new_message(sid, data):
    """Handle new message from client and broadcast to case room"""
    try:
        case_id = data.get('case_id')
        message_content = data.get('content')
        sender_id = data.get('sender_id')
        
        logger.info(f"New message in case {case_id} from {sender_id}")
        
        # Broadcast to all clients in the case room
        await sio.emit('new_message', {
            'case_id': case_id,
            'content': message_content,
            'sender_id': sender_id,
            'created_at': datetime.now(timezone.utc).isoformat()
        }, room=f"case_{case_id}")
        
    except Exception as e:
        logger.error(f"Error handling new message: {e}")
        await sio.emit('error', {'message': 'Failed to send message'}, room=sid)


# ============= ROOT ENDPOINT =============
@api_router.get("/")
async def root():
    return {
        "message": "Legal Family Case Advisor System API - Voice AI Enabled",
        "version": "4.0.0",
        "status": "operational",
        "database": "Supabase PostgreSQL",
        "features": [
            "AI Voice Legal Assistant (Vapi)",
            "Multilingual Support (English, Hindi, Bengali)",
            "Auto Case Creation from Voice",
            "AI-Powered Case Analysis (Groq)",
            "Advocate Recommendation",
            "Meeting Request Workflow"
        ],
        "flow": "Voice Conversation → AI Analysis → Case Draft → Advocate Selection → Meeting Request → Case Creation"
    }


# Include router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)


# Startup event
@app.on_event("startup")
async def startup_event():
    try:
        # Test Supabase connection
        test = supabase.table('users').select('count', count='exact').limit(1).execute()
        logger.info("Supabase connection successful")
    except Exception as e:
        logger.error(f"Supabase connection failed: {e}")
        logger.warning("Continuing without Supabase connection...")
    
    logger.info("LFCAS Backend (Refactored) started successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("LFCAS Backend shut down")
















































