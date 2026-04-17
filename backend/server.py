# Complete FastAPI Backend for Legal Family Case Advisor System (LFCAS)
# Phase 5-9 Refactored - Correct Workflow Implementation
# Flow: AI Query → Advocate Recommendation → Meeting Request → Meeting → Case Creation

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
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
    CaseStageHistory, CaseStageHistoryCreate,
    # Payment models
    PaymentRequest, PaymentRequestCreate, PaymentRequestResponse, PaymentStatus,
    PaymentVerification, AdvocatePaymentSettings, AdvocatePaymentSettingsUpdate,
    # Document edit permission models
    DocumentEditRequest, DocumentEditRequestCreate, DocumentEditRequestResponse,
    DocumentEditRequestUpdate, DocumentEditStatus, DocumentVersion, DocumentVersionCreate,
    DocumentWithEditPermission
)
from pydantic import BaseModel

# Import services
from auth import (
    get_current_user, require_role, create_user_with_auth, 
    login_user, get_supabase_client
)
from groq_service import analyze_case_with_groq, get_advocate_recommendation_criteria, detect_legal_intent
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


@api_router.patch("/users/onboarding-status")
async def update_onboarding_status(
    completed: bool = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Update user's onboarding completion status"""
    try:
        result = supabase.table('users').update({
            'has_completed_onboarding': completed
        }).eq('id', current_user["user_id"]).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Onboarding status updated successfully", "has_completed_onboarding": completed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update onboarding status: {str(e)}")




# ============= PROFILE IMAGE ENDPOINTS =============
@api_router.post("/users/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload or update user profile image"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Check file size (max 5MB)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"profile-images/{current_user['user_id']}.{file_extension}"
        
        # Delete old profile image if exists
        try:
            supabase.storage.from_('profile-images').remove([unique_filename])
        except:
            pass  # File might not exist
        
        # Upload to Supabase Storage
        storage_response = supabase.storage.from_('profile-images').upload(
            path=unique_filename,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_('profile-images').get_public_url(unique_filename)
        
        # Update user profile with image URL
        supabase.table('users').update({
            "profile_image_url": public_url
        }).eq('id', current_user["user_id"]).execute()
        
        return {
            "message": "Profile image uploaded successfully",
            "image_url": public_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile image upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@api_router.get("/users/{user_id}/profile-image")
async def get_profile_image_url(user_id: str):
    """Get user profile image URL"""
    try:
        user = supabase.table('users').select('profile_image_url').eq('id', user_id).execute()
        if not user.data or len(user.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "image_url": user.data[0].get('profile_image_url')
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/users/profile-image")
async def delete_profile_image(current_user: dict = Depends(get_current_user)):
    """Delete user profile image"""
    try:
        # Get current image URL to extract filename
        user = supabase.table('users').select('profile_image_url').eq('id', current_user["user_id"]).execute()
        
        if user.data and user.data[0].get('profile_image_url'):
            # Try to delete from storage
            try:
                filename = f"profile-images/{current_user['user_id']}.jpg"  # Assuming jpg, adjust if needed
                supabase.storage.from_('profile-images').remove([filename])
            except:
                pass  # File might not exist or already deleted
        
        # Remove URL from database
        supabase.table('users').update({
            "profile_image_url": None
        }).eq('id', current_user["user_id"]).execute()
        
        return {"message": "Profile image deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting profile image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        "specializations": [s.value for s in profile_data.specializations],
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
        query = query.eq('status', status.value)
    if location:
        query = query.ilike('location', f'%{location}%')
    if specialization:
        query = query.contains('specializations', [specialization.value])
    
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



@api_router.patch("/advocates/{advocate_id}")
async def update_advocate_profile(
    advocate_id: str,
    update_data: dict,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Update advocate profile"""
    try:
        # Verify advocate owns this profile
        advocate = supabase.table('advocates').select('*').eq('id', advocate_id).execute()
        
        if not advocate.data or len(advocate.data) == 0:
            raise HTTPException(status_code=404, detail="Advocate profile not found")
        
        if advocate.data[0]['user_id'] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update profile
        result = supabase.table('advocates').update(update_data).eq('id', advocate_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return {"message": "Profile updated successfully", "profile": result.data[0]}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update advocate profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



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
            adv_query = adv_query.contains('specializations', [query.case_type.value])
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
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List meeting requests for the current user"""
    query = supabase.table('meeting_requests').select('*, client:users!meeting_requests_client_id_fkey(*), advocate:advocates!meeting_requests_advocate_id_fkey(*, users(*))')
    
    # Filter based on role
    if current_user["role"] == UserRole.CLIENT or current_user["role"] == 'client':
        query = query.eq('client_id', current_user["user_id"])
    elif current_user["role"] == UserRole.ADVOCATE or current_user["role"] == 'advocate':
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





# ============= DOCUMENT EDIT PERMISSION ENDPOINTS =============
@api_router.post("/documents/edit-request", response_model=DocumentEditRequestResponse)
async def create_document_edit_request(
    request_data: DocumentEditRequestCreate,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Client requests permission to edit a document"""
    try:
        # Verify document exists and belongs to client's case
        document = supabase.table('documents').select('*, cases!inner(*)').eq('id', request_data.document_id).execute()
        
        if not document.data or len(document.data) == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = document.data[0]
        case_data = doc.get('cases')
        
        if not case_data or case_data['client_id'] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if there's already a pending request
        existing = supabase.table('document_edit_requests').select('*').eq('document_id', request_data.document_id).eq('status', 'pending').execute()
        
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="A pending edit request already exists for this document")
        
        # Create edit request
        edit_request = {
            "document_id": request_data.document_id,
            "client_id": current_user["user_id"],
            "advocate_id": case_data['advocate_id'],
            "reason": request_data.reason,
            "status": DocumentEditStatus.PENDING
        }
        
        result = supabase.table('document_edit_requests').insert(edit_request).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create edit request")
        
        # Notify advocate
        if case_data.get('advocate_id'):
            advocate = supabase.table('advocates').select('user_id').eq('id', case_data['advocate_id']).execute()
            if advocate.data:
                notification = {
                    "user_id": advocate.data[0]['user_id'],
                    "notification_type": NotificationType.DOCUMENT_UPLOADED,
                    "title": "Document Edit Request",
                    "message": f"A client has requested permission to edit a document: {doc['document_name']}",
                    "related_id": result.data[0]['id']
                }
                supabase.table('notifications').insert(notification).execute()
        
        return DocumentEditRequestResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create edit request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create edit request: {str(e)}")


@api_router.get("/documents/edit-requests/client", response_model=List[DocumentEditRequestResponse])
async def get_client_edit_requests(
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Get all edit requests made by the current client"""
    try:
        result = supabase.table('document_edit_requests').select('*, documents(*)').eq('client_id', current_user["user_id"]).order('created_at', desc=True).execute()
        
        requests = []
        for req in result.data:
            requests.append(DocumentEditRequestResponse(**req))
        
        return requests
    except Exception as e:
        logger.error(f"Get client edit requests error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/documents/edit-requests/advocate", response_model=List[DocumentEditRequestResponse])
async def get_advocate_edit_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Get all edit requests for the current advocate"""
    try:
        # Get advocate profile
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or len(adv_profile.data) == 0:
            return []
        
        advocate_id = adv_profile.data[0]['id']
        
        query = supabase.table('document_edit_requests').select('*, documents(*), client:users!document_edit_requests_client_id_fkey(*)').eq('advocate_id', advocate_id)
        
        if status:
            query = query.eq('status', status)
        
        result = query.order('created_at', desc=True).execute()
        
        requests = []
        for req in result.data:
            req_response = DocumentEditRequestResponse(**req)
            if req.get('client'):
                req_response.client = UserResponse(**req['client'])
            requests.append(req_response)
        
        return requests
    except Exception as e:
        logger.error(f"Get advocate edit requests error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.patch("/documents/edit-requests/{request_id}", response_model=DocumentEditRequestResponse)
async def update_edit_request(
    request_id: str,
    update_data: DocumentEditRequestUpdate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Advocate approves or rejects an edit request"""
    try:
        # Get edit request
        req_result = supabase.table('document_edit_requests').select('*').eq('id', request_id).execute()
        
        if not req_result.data or len(req_result.data) == 0:
            raise HTTPException(status_code=404, detail="Edit request not found")
        
        edit_req = req_result.data[0]
        
        # Verify advocate owns this request
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or adv_profile.data[0]['id'] != edit_req['advocate_id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update request
        update_dict = {"status": update_data.status}
        if update_data.response_notes:
            update_dict["response_notes"] = update_data.response_notes
        
        result = supabase.table('document_edit_requests').update(update_dict).eq('id', request_id).execute()
        
        # Notify client
        notification_title = "Edit Request Approved" if update_data.status == "approved" else "Edit Request Rejected"
        notification = {
            "user_id": edit_req['client_id'],
            "notification_type": NotificationType.SYSTEM,
            "title": notification_title,
            "message": f"Your document edit request has been {update_data.status}." + (f" Note: {update_data.response_notes}" if update_data.response_notes else ""),
            "related_id": request_id
        }
        supabase.table('notifications').insert(notification).execute()
        
        return DocumentEditRequestResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update edit request error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/documents/{document_id}/edit-status")
async def get_document_edit_status(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a document has an approved edit request"""
    try:
        # Get latest edit request for this document
        result = supabase.table('document_edit_requests').select('*').eq('document_id', document_id).order('created_at', desc=True).limit(1).execute()
        
        if not result.data or len(result.data) == 0:
            return {
                "can_edit": False,
                "status": "no_request",
                "message": "No edit request found"
            }
        
        latest_request = result.data[0]
        
        return {
            "can_edit": latest_request['status'] == 'approved',
            "status": latest_request['status'],
            "request_id": latest_request['id'],
            "response_notes": latest_request.get('response_notes')
        }
        
    except Exception as e:
        logger.error(f"Get edit status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= DOCUMENT VERSION ENDPOINTS =============
@api_router.get("/documents/{document_id}/versions", response_model=List[DocumentVersion])
async def get_document_versions(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get version history for a document"""
    try:
        # Verify document access
        document = supabase.table('documents').select('*, cases!inner(*)').eq('id', document_id).execute()
        
        if not document.data or len(document.data) == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = document.data[0]
        case_data = doc.get('cases')
        
        # Check access
        if current_user["role"] == UserRole.CLIENT and case_data['client_id'] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user["role"] == UserRole.ADVOCATE:
            adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
            if not adv_profile.data or adv_profile.data[0]['id'] != case_data.get("advocate_id"):
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Get versions
        result = supabase.table('document_versions').select('*, edited_by_user:users!document_versions_edited_by_fkey(*)').eq('document_id', document_id).order('version_number', desc=True).execute()
        
        versions = []
        for ver in result.data:
            version = DocumentVersion(**ver)
            if ver.get('edited_by_user'):
                version.edited_by_user = UserResponse(**ver['edited_by_user'])
            versions.append(version)
        
        return versions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get document versions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/documents/{document_id}/versions", response_model=DocumentVersion)
async def create_document_version(
    document_id: str,
    file: UploadFile = File(...),
    changes_summary: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new version of a document (after edit approval)"""
    try:
        # Verify document exists and user has edit permission
        document = supabase.table('documents').select('*, cases!inner(*)').eq('id', document_id).execute()
        
        if not document.data or len(document.data) == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = document.data[0]
        case_data = doc.get('cases')
        
        # Check if client has approved edit request
        if current_user["role"] == UserRole.CLIENT:
            edit_request = supabase.table('document_edit_requests').select('*').eq('document_id', document_id).eq('status', 'approved').order('created_at', desc=True).limit(1).execute()
            
            if not edit_request.data or len(edit_request.data) == 0:
                raise HTTPException(status_code=403, detail="No approved edit request found. Please request edit permission first.")
        
        # Get current version number
        versions = supabase.table('document_versions').select('version_number').eq('document_id', document_id).order('version_number', desc=True).limit(1).execute()
        
        next_version = 2 if not versions.data else versions.data[0]['version_number'] + 1
        
        # Upload new version file
        file_content = await file.read()
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{case_data['id']}/versions/{uuid.uuid4()}.{file_extension}"
        
        storage_response = supabase.storage.from_('case-documents').upload(
            path=unique_filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        public_url = supabase.storage.from_('case-documents').get_public_url(unique_filename)
        
        # Create version record
        version_data = {
            "document_id": document_id,
            "version_number": next_version,
            "file_url": public_url,
            "file_path": unique_filename,
            "edited_by": current_user["user_id"],
            "changes_summary": changes_summary,
            "file_size": len(file_content)
        }
        
        result = supabase.table('document_versions').insert(version_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create document version")
        
        # Update main document URL to point to latest version
        supabase.table('documents').update({
            "cloudinary_url": public_url,
            "cloudinary_public_id": unique_filename
        }).eq('id', document_id).execute()
        
        # Notify other party
        notify_user_id = case_data.get("advocate_id") if current_user["role"] == UserRole.CLIENT else case_data["client_id"]
        if notify_user_id:
            if current_user["role"] == UserRole.CLIENT:
                adv = supabase.table('advocates').select('user_id').eq('id', notify_user_id).execute()
                if adv.data:
                    notify_user_id = adv.data[0]['user_id']
            
            notification = {
                "user_id": notify_user_id,
                "notification_type": NotificationType.DOCUMENT_UPLOADED,
                "title": "Document Updated",
                "message": f"Document '{doc['document_name']}' has been updated. Version {next_version} is now available.",
                "related_id": document_id
            }
            supabase.table('notifications').insert(notification).execute()
        
        return DocumentVersion(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create document version error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



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



# ============= PAYMENT ENDPOINTS =============
@api_router.post("/payments/settings")
async def save_payment_settings(
    settings: AdvocatePaymentSettingsUpdate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Save or update advocate's Razorpay payment settings"""
    try:
        # Get advocate profile
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or len(adv_profile.data) == 0:
            raise HTTPException(status_code=404, detail="Advocate profile not found")
        
        advocate_id = adv_profile.data[0]['id']
        
        # Check if settings already exist
        existing = supabase.table('advocate_payment_settings').select('*').eq('advocate_id', advocate_id).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing settings
            update_data = {"razorpay_key_id": settings.razorpay_key_id}
            if settings.razorpay_key_secret:  # Only update secret if provided
                update_data["razorpay_key_secret"] = settings.razorpay_key_secret
            
            supabase.table('advocate_payment_settings').update(update_data).eq('advocate_id', advocate_id).execute()
        else:
            # Create new settings
            if not settings.razorpay_key_secret:
                raise HTTPException(status_code=400, detail="Razorpay secret key is required for first-time setup")
            
            new_settings = {
                "advocate_id": advocate_id,
                "razorpay_key_id": settings.razorpay_key_id,
                "razorpay_key_secret": settings.razorpay_key_secret
            }
            supabase.table('advocate_payment_settings').insert(new_settings).execute()
        
        return {"message": "Payment settings saved successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving payment settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save payment settings: {str(e)}")


@api_router.get("/payments/settings")
async def get_payment_settings(
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Get advocate's payment settings (without exposing secret)"""
    try:
        # Get advocate profile
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or len(adv_profile.data) == 0:
            raise HTTPException(status_code=404, detail="Advocate profile not found")
        
        advocate_id = adv_profile.data[0]['id']
        
        # Get settings
        result = supabase.table('advocate_payment_settings').select('razorpay_key_id').eq('advocate_id', advocate_id).execute()
        
        if result.data and len(result.data) > 0:
            return {
                "razorpay_key_id": result.data[0].get('razorpay_key_id'),
                "has_secret": True
            }
        else:
            return {
                "razorpay_key_id": "",
                "has_secret": False
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payment settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch payment settings: {str(e)}")


@api_router.post("/payments/request", response_model=PaymentRequestResponse)
async def create_payment_request(
    request_data: PaymentRequestCreate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Advocate creates a payment request for a client"""
    try:
        # Get advocate profile
        adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
        if not adv_profile.data or len(adv_profile.data) == 0:
            raise HTTPException(status_code=404, detail="Advocate profile not found")
        
        advocate_id = adv_profile.data[0]['id']
        
        # Verify case exists and advocate owns it
        case = supabase.table('cases').select('*').eq('id', request_data.case_id).eq('advocate_id', advocate_id).execute()
        if not case.data or len(case.data) == 0:
            raise HTTPException(status_code=404, detail="Case not found or access denied")
        
        case_data = case.data[0]
        client_id = case_data['client_id']
        
        # Get advocate's Razorpay settings
        settings = supabase.table('advocate_payment_settings').select('*').eq('advocate_id', advocate_id).execute()
        if not settings.data or len(settings.data) == 0:
            raise HTTPException(status_code=400, detail="Please configure your Razorpay keys in Settings before requesting payments")
        
        razorpay_settings = settings.data[0]
        
        # Create Razorpay order (in test mode)
        try:
            import razorpay
            razorpay_client = razorpay.Client(auth=(razorpay_settings['razorpay_key_id'], razorpay_settings['razorpay_key_secret']))
            
            # Create order
            order_data = {
                "amount": int(request_data.amount * 100),  # Amount in paise
                "currency": "INR",
                "notes": {
                    "case_id": request_data.case_id,
                    "advocate_id": advocate_id,
                    "description": request_data.description
                }
            }
            razorpay_order = razorpay_client.order.create(data=order_data)
            razorpay_order_id = razorpay_order['id']
        
        except Exception as razorpay_error:
            logger.error(f"Razorpay order creation failed: {str(razorpay_error)}")
            raise HTTPException(status_code=500, detail=f"Failed to create payment order: {str(razorpay_error)}")
        
        # Create payment request in database
        payment_request = {
            "advocate_id": advocate_id,
            "client_id": client_id,
            "case_id": request_data.case_id,
            "amount": request_data.amount,
            "description": request_data.description,
            "status": PaymentStatus.PENDING,
            "due_date": request_data.due_date.isoformat() if request_data.due_date else None,
            "razorpay_order_id": razorpay_order_id
        }
        
        result = supabase.table('payment_requests').insert(payment_request).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create payment request")
        
        created_request = result.data[0]
        
        # Notify client
        notification = {
            "user_id": client_id,
            "notification_type": NotificationType.CASE_UPDATE,
            "title": "Payment Request",
            "message": f"You have received a payment request of ₹{request_data.amount:,.2f} for your case.",
            "related_id": created_request['id']
        }
        supabase.table('notifications').insert(notification).execute()
        
        return PaymentRequestResponse(**created_request)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment request: {str(e)}")


@api_router.get("/payments/requests", response_model=List[PaymentRequestResponse])
async def list_payment_requests(
    status: Optional[PaymentStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """List payment requests for current user"""
    try:
        query = supabase.table('payment_requests').select('*, case:cases(*), client:users!payment_requests_client_id_fkey(*), advocate:advocates!payment_requests_advocate_id_fkey(*, users(*))')
        
        # Filter based on role
        if current_user["role"] == UserRole.CLIENT:
            query = query.eq('client_id', current_user["user_id"])
        elif current_user["role"] == UserRole.ADVOCATE:
            # Get advocate profile
            adv_profile = supabase.table('advocates').select('id').eq('user_id', current_user["user_id"]).execute()
            if adv_profile.data and len(adv_profile.data) > 0:
                query = query.eq('advocate_id', adv_profile.data[0]['id'])
            else:
                return []
        
        if status:
            query = query.eq('status', status.value)
        
        result = query.order('created_at', desc=True).execute()
        
        requests = []
        for req in result.data:
            case_data = req.pop('case', None)
            client_data = req.pop('client', None)
            advocate_data = req.pop('advocate', None)
            
            req_response = PaymentRequestResponse(**req)
            if case_data:
                req_response.case = CaseResponse(**case_data)
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
    
    except Exception as e:
        logger.error(f"Error listing payment requests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list payment requests: {str(e)}")


@api_router.post("/payments/verify")
async def verify_payment(
    verification: PaymentVerification,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Verify and complete a payment"""
    try:
        # Get payment request
        payment_req = supabase.table('payment_requests').select('*, advocate:advocates!payment_requests_advocate_id_fkey(*)').eq('id', verification.payment_request_id).execute()
        
        if not payment_req.data or len(payment_req.data) == 0:
            raise HTTPException(status_code=404, detail="Payment request not found")
        
        payment_data = payment_req.data[0]
        
        # Verify client owns this payment
        if payment_data['client_id'] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get advocate's Razorpay settings for verification
        advocate_data = payment_data.get('advocate')
        if not advocate_data:
            raise HTTPException(status_code=500, detail="Advocate data not found")
        
        advocate_id = advocate_data['id']
        settings = supabase.table('advocate_payment_settings').select('*').eq('advocate_id', advocate_id).execute()
        
        if not settings.data or len(settings.data) == 0:
            raise HTTPException(status_code=500, detail="Payment settings not found")
        
        razorpay_settings = settings.data[0]
        
        # Verify payment signature with Razorpay
        try:
            import razorpay
            razorpay_client = razorpay.Client(auth=(razorpay_settings['razorpay_key_id'], razorpay_settings['razorpay_key_secret']))
            
            # Verify signature
            params_dict = {
                'razorpay_order_id': verification.razorpay_order_id,
                'razorpay_payment_id': verification.razorpay_payment_id,
                'razorpay_signature': verification.razorpay_signature
            }
            
            razorpay_client.utility.verify_payment_signature(params_dict)
            
        except razorpay.errors.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        except Exception as razorpay_error:
            logger.error(f"Razorpay verification failed: {str(razorpay_error)}")
            raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(razorpay_error)}")
        
        # Update payment request status
        supabase.table('payment_requests').update({
            "status": PaymentStatus.PAID,
            "razorpay_payment_id": verification.razorpay_payment_id
        }).eq('id', verification.payment_request_id).execute()
        
        # Notify advocate
        advocate_user = advocate_data.get('users') or advocate_data.get('user_id')
        if advocate_user:
            advocate_user_id = advocate_user if isinstance(advocate_user, str) else advocate_user.get('id')
            notification = {
                "user_id": advocate_user_id,
                "notification_type": NotificationType.CASE_UPDATE,
                "title": "Payment Received",
                "message": f"Payment of ₹{payment_data['amount']:,.2f} has been received from your client.",
                "related_id": verification.payment_request_id
            }
            supabase.table('notifications').insert(notification).execute()
        
        return {
            "message": "Payment verified successfully",
            "status": "paid"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")


# ============= CLIENT DASHBOARD ENDPOINT =============
@api_router.get("/client/dashboard-summary")
async def get_client_dashboard_summary(
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Get dashboard summary for client"""
    user_id = current_user["user_id"]
    
    # Count total cases
    total_cases_result = supabase.table('cases').select('*', count='exact').eq('client_id', user_id).execute()
    total_cases = total_cases_result.count or 0
    
    # Count active cases (not closed)
    active_cases_result = supabase.table('cases').select('*', count='exact').eq('client_id', user_id).neq('current_stage', 'CLOSED').execute()
    active_cases = active_cases_result.count or 0
    
    # Count completed cases
    completed_cases_result = supabase.table('cases').select('*', count='exact').eq('client_id', user_id).eq('current_stage', 'CLOSED').execute()
    completed_cases = completed_cases_result.count or 0
    
    # Count upcoming meetings (this week)
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    week_end = today + timedelta(days=7)
    
    meetings_result = supabase.table('meetings').select('*', count='exact').eq('client_id', user_id).gte('scheduled_date', today.isoformat()).lte('scheduled_date', week_end.isoformat()).execute()
    upcoming_meetings = meetings_result.count or 0
    
    # Count total documents uploaded by this client
    case_ids = [case['id'] for case in total_cases_result.data] if total_cases_result.data else []
    if case_ids:
        documents_result = supabase.table('documents').select('case_id', count='exact').in_('case_id', case_ids).execute()
        total_documents = documents_result.count or 0
    else:
        total_documents = 0
    
    # Calculate average case score (based on AI analysis confidence if available)
    case_score = 7.5  # Default score
    if total_cases_result.data and len(total_cases_result.data) > 0:
        scores = []
        for case in total_cases_result.data:
            ai_analysis = case.get('ai_analysis', {})
            if isinstance(ai_analysis, dict):
                confidence = ai_analysis.get('confidence_score', 75)  # Default 75%
                scores.append(confidence / 10)  # Convert to 0-10 scale
        if scores:
            case_score = round(sum(scores) / len(scores), 1)
    
    # Get recent notifications (unread count)
    unread_notifications = supabase.table('notifications').select('*', count='exact').eq('user_id', user_id).eq('is_read', False).execute()
    unread_count = unread_notifications.count or 0
    
    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "completed_cases": completed_cases,
        "upcoming_meetings": upcoming_meetings,
        "total_documents": total_documents,
        "case_score": case_score,
        "unread_notifications": unread_count
    }




@api_router.get("/client/reminders")
async def get_client_reminders(
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Get upcoming reminders for client (hearings + meetings + document deadlines)"""
    user_id = current_user["user_id"]
    
    reminders = []
    
    # Get upcoming hearings (next 30 days)
    today = datetime.now(timezone.utc)
    thirty_days_later = today + timedelta(days=30)
    
    # Get client's cases
    cases_result = supabase.table('cases').select('id, title, case_type').eq('client_id', user_id).execute()
    case_ids = [case['id'] for case in cases_result.data] if cases_result.data else []
    
    if case_ids:
        # Get upcoming hearings
        hearings_result = supabase.table('hearings').select('*').in_('case_id', case_ids).gte('hearing_date', today.isoformat()).lte('hearing_date', thirty_days_later.isoformat()).eq('is_completed', False).order('hearing_date').limit(10).execute()
        
        for hearing in hearings_result.data:
            reminders.append({
                "type": "Hearing Date",
                "detail": f"{hearing.get('court_name', 'Court')}, {hearing.get('court_room', '')}",
                "time": hearing['hearing_date'],
                "icon": "calendar",
                "color": "blue",
                "related_id": hearing['id'],
                "related_type": "hearing"
            })
    
    # Get upcoming meetings
    meetings_result = supabase.table('meetings').select('*').eq('client_id', user_id).gte('scheduled_date', today.isoformat()).lte('scheduled_date', thirty_days_later.isoformat()).neq('status', 'completed').order('scheduled_date').limit(10).execute()
    
    for meeting in meetings_result.data:
        # Get advocate name
        advocate_result = supabase.table('advocates').select('user_id').eq('id', meeting['advocate_id']).execute()
        if advocate_result.data:
            user_result = supabase.table('users').select('full_name').eq('id', advocate_result.data[0]['user_id']).execute()
            advocate_name = user_result.data[0]['full_name'] if user_result.data else "Advocate"
        else:
            advocate_name = "Advocate"
        
        reminders.append({
            "type": "Meeting with Advocate",
            "detail": advocate_name,
            "time": meeting['scheduled_date'],
            "icon": "check",
            "color": "green",
            "related_id": meeting['id'],
            "related_type": "meeting"
        })
    
    # Mock document deadlines (you can enhance this by adding a document_deadlines table)
    # For now, we'll check cases with pending documents
    if case_ids:
        # Get cases that need documents
        cases_needing_docs = supabase.table('cases').select('id, title, required_documents').in_('id', case_ids).neq('current_stage', 'CLOSED').execute()
        
        for case in cases_needing_docs.data:
            required_docs = case.get('required_documents', [])
            if required_docs and isinstance(required_docs, list):
                # Get already uploaded documents for this case
                uploaded_docs = supabase.table('documents').select('document_type').eq('case_id', case['id']).execute()
                uploaded_types = [doc['document_type'] for doc in uploaded_docs.data] if uploaded_docs.data else []
                
                # Check if there are missing documents
                missing_docs = [doc for doc in required_docs if doc not in uploaded_types]
                if missing_docs:
                    reminders.append({
                        "type": "Document Deadline",
                        "detail": f"Upload {missing_docs[0]}",
                        "time": (today + timedelta(days=2)).isoformat(),  # 2 days deadline
                        "icon": "alert",
                        "color": "orange",
                        "related_id": case['id'],
                        "related_type": "document"
                    })
                    break  # Only show one document reminder for now
    
    # Sort by time
    reminders.sort(key=lambda x: x['time'])
    
    return {"reminders": reminders[:10]}  # Return top 10 reminders


@api_router.get("/client/recommended-advocates")
async def get_recommended_advocates(
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Get recommended advocates based on client's case types and location"""
    user_id = current_user["user_id"]
    
    # Get client's recent cases to understand their needs
    cases_result = supabase.table('cases').select('case_type, location').eq('client_id', user_id).order('created_at', desc=True).limit(5).execute()
    
    # Determine primary case type and location
    case_types = []
    locations = []
    if cases_result.data:
        case_types = [case.get('case_type') for case in cases_result.data if case.get('case_type')]
        locations = [case.get('location') for case in cases_result.data if case.get('location')]
    
    primary_case_type = case_types[0] if case_types else None
    primary_location = locations[0] if locations else None
    
    # Get approved advocates
    query = supabase.table('advocates').select('*, users(full_name, email)').eq('status', 'approved')
    
    # Filter by specialization if we know the case type
    if primary_case_type:
        query = query.contains('specializations', [primary_case_type.lower()])
    
    # Filter by location if we know it
    if primary_location:
        query = query.ilike('location', f'%{primary_location}%')
    
    # Order by rating and limit to top 10
    advocates_result = query.order('rating', desc=True).limit(10).execute()
    
    recommended_advocates = []
    for advocate in advocates_result.data:
        user_data = advocate.get('users', {})
        
        recommended_advocates.append({
            "id": advocate['id'],
            "name": user_data.get('full_name', 'Advocate'),
            "specialty": advocate.get('specializations', ['Family Law'])[0] if advocate.get('specializations') else 'Family Law',
            "experience": f"{advocate.get('experience_years', 0)}+ Yrs",
            "rating": advocate.get('rating', 0.0),
            "verified": advocate.get('status') == 'approved',
            "location": advocate.get('location', ''),
            "bar_council_id": advocate.get('bar_council_id', ''),
            "bio": advocate.get('bio', '')[:100] + '...' if advocate.get('bio') else ''
        })
    
    return {"advocates": recommended_advocates}

@api_router.get("/advocate/dashboard-summary")
async def get_advocate_dashboard_summary(
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Get dashboard summary for advocate"""
    user_id = current_user["user_id"]
    
    # Get advocate profile
    adv_profile = supabase.table('advocates').select('*').eq('user_id', user_id).execute()
    if not adv_profile.data or len(adv_profile.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate profile not found")
    
    advocate_id = adv_profile.data[0]['id']
    advocate_data = adv_profile.data[0]
    
    # Get rating and reviews
    average_rating = advocate_data.get('rating', 0.0)
    total_reviews = advocate_data.get('total_reviews', 0)
    
    # Calculate advocate score (weighted average of rating and reviews)
    # Score is based on rating (out of 5) converted to 10-point scale
    advocate_score = round(average_rating * 2, 1) if average_rating > 0 else 0.0
    
    # Count active cases (not closed)
    active_cases_result = supabase.table('cases').select('*', count='exact').eq('advocate_id', advocate_id).neq('current_stage', 'CLOSED').execute()
    active_cases = active_cases_result.count or 0
    
    # Count today's hearings
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Get case IDs for this advocate
    cases_result = supabase.table('cases').select('id').eq('advocate_id', advocate_id).execute()
    case_ids = [case['id'] for case in cases_result.data] if cases_result.data else []
    
    today_hearings = 0
    if case_ids:
        hearings_result = supabase.table('hearings').select('*', count='exact').in_('case_id', case_ids).gte('hearing_date', today_start.isoformat()).lt('hearing_date', today_end.isoformat()).eq('is_completed', False).execute()
        today_hearings = hearings_result.count or 0
    
    # Count pending meeting requests
    pending_requests_result = supabase.table('meeting_requests').select('*', count='exact').eq('advocate_id', advocate_id).eq('status', 'pending').execute()
    pending_requests = pending_requests_result.count or 0
    
    return {
        "average_rating": average_rating,
        "total_reviews": total_reviews,
        "advocate_score": advocate_score,
        "active_cases": active_cases,
        "today_hearings": today_hearings,
        "pending_requests": pending_requests
    }

@api_router.get("/advocate/activity-stats")
async def get_advocate_activity_stats(
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Get activity statistics for advocate (last 7 days)"""
    user_id = current_user["user_id"]
    
    # Get advocate profile
    adv_profile = supabase.table('advocates').select('id').eq('user_id', user_id).execute()
    if not adv_profile.data or len(adv_profile.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate profile not found")
    
    advocate_id = adv_profile.data[0]['id']
    
    # Get last 7 days of activity
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)
    
    # Get case IDs
    cases_result = supabase.table('cases').select('id').eq('advocate_id', advocate_id).execute()
    case_ids = [case['id'] for case in cases_result.data] if cases_result.data else []
    
    # Initialize activity data
    activity_data = []
    hearings_this_week = 0
    documents_this_week = 0
    
    for i in range(7):
        day = seven_days_ago + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Count hearings for this day
        hearings_count = 0
        documents_count = 0
        
        if case_ids:
            hearings_result = supabase.table('hearings').select('*', count='exact').in_('case_id', case_ids).gte('hearing_date', day_start.isoformat()).lt('hearing_date', day_end.isoformat()).execute()
            hearings_count = hearings_result.count or 0
            hearings_this_week += hearings_count
            
            # Count documents uploaded by advocate on this day
            documents_result = supabase.table('documents').select('*', count='exact').in_('case_id', case_ids).eq('uploaded_by', user_id).gte('created_at', day_start.isoformat()).lt('created_at', day_end.isoformat()).execute()
            documents_count = documents_result.count or 0
            documents_this_week += documents_count
        
        # Count case filings (cases created on this day)
        cases_filed = supabase.table('cases').select('*', count='exact').eq('advocate_id', advocate_id).gte('created_at', day_start.isoformat()).lt('created_at', day_end.isoformat()).execute()
        
        activity_data.append({
            "day": day.strftime("%a"),  # Day name (Mon, Tue, etc.)
            "hearings": hearings_count,
            "documents": documents_count,
            "cases_filed": cases_filed.count or 0
        })
    
    # Calculate summary statistics
    # Cases filed this month
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cases_this_month = supabase.table('cases').select('*', count='exact').eq('advocate_id', advocate_id).gte('created_at', month_start.isoformat()).execute()
    
    # Cases filed last month
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start
    cases_last_month = supabase.table('cases').select('*', count='exact').eq('advocate_id', advocate_id).gte('created_at', last_month_start.isoformat()).lt('created_at', last_month_end.isoformat()).execute()
    
    # Calculate percentage change
    cases_change_percent = 0
    if cases_last_month.count and cases_last_month.count > 0:
        cases_change_percent = round(((cases_this_month.count or 0) - cases_last_month.count) / cases_last_month.count * 100, 1)
    elif cases_this_month.count and cases_this_month.count > 0:
        cases_change_percent = 100
    
    # Documents uploaded in last 30 days
    documents_30_days = 0
    if case_ids:
        documents_30_result = supabase.table('documents').select('*', count='exact').in_('case_id', case_ids).eq('uploaded_by', user_id).gte('created_at', thirty_days_ago.isoformat()).execute()
        documents_30_days = documents_30_result.count or 0
    
    return {
        "activity_data": activity_data,
        "summary": {
            "hearings_this_week": hearings_this_week,
            "documents_this_week": documents_this_week,
            "cases_filed_this_month": cases_this_month.count or 0,
            "cases_change_percent": cases_change_percent,
            "documents_30_days": documents_30_days
        }
    }


@api_router.get("/advocate/today-hearings")
async def get_advocate_today_hearings(
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Get today's hearings for advocate"""
    user_id = current_user["user_id"]
    
    # Get advocate profile
    adv_profile = supabase.table('advocates').select('id').eq('user_id', user_id).execute()
    if not adv_profile.data or len(adv_profile.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate profile not found")
    
    advocate_id = adv_profile.data[0]['id']
    
    # Get today's date range
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Get case IDs for this advocate
    cases_result = supabase.table('cases').select('id, title, client_id').eq('advocate_id', advocate_id).execute()
    case_ids = [case['id'] for case in cases_result.data] if cases_result.data else []
    cases_map = {case['id']: case for case in cases_result.data} if cases_result.data else {}
    
    hearings = []
    if case_ids:
        # Get today's hearings
        hearings_result = supabase.table('hearings').select('*').in_('case_id', case_ids).gte('hearing_date', today_start.isoformat()).lt('hearing_date', today_end.isoformat()).order('hearing_date').execute()
        
        for hearing in hearings_result.data:
            case_data = cases_map.get(hearing['case_id'], {})
            
            # Get client name
            client_name = "Client"
            if case_data.get('client_id'):
                client_result = supabase.table('users').select('full_name').eq('id', case_data['client_id']).execute()
                if client_result.data:
                    client_name = client_result.data[0]['full_name']
            
            # Get documents for this case
            documents_result = supabase.table('documents').select('id', count='exact').eq('case_id', hearing['case_id']).execute()
            documents_count = documents_result.count or 0
            
            hearings.append({
                "id": hearing['id'],
                "case_id": hearing['case_id'],
                "case_title": case_data.get('title', 'Case'),
                "client_name": client_name,
                "hearing_date": hearing['hearing_date'],
                "court_name": hearing.get('court_name', ''),
                "court_room": hearing.get('court_room', ''),
                "notes": hearing.get('notes', ''),
                "documents_count": documents_count,
                "is_completed": hearing.get('is_completed', False)
            })
    
    return {"hearings": hearings}


@api_router.get("/advocate/reminders")
async def get_advocate_reminders(
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Get upcoming reminders for advocate (hearings + meetings + deadlines)"""
    user_id = current_user["user_id"]
    
    # Get advocate profile
    adv_profile = supabase.table('advocates').select('id').eq('user_id', user_id).execute()
    if not adv_profile.data or len(adv_profile.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate profile not found")
    
    advocate_id = adv_profile.data[0]['id']
    
    reminders = []
    
    # Get upcoming hearings (next 30 days)
    from datetime import timedelta
    today = datetime.now(timezone.utc)
    thirty_days_later = today + timedelta(days=30)
    
    # Get case IDs
    cases_result = supabase.table('cases').select('id, title').eq('advocate_id', advocate_id).execute()
    case_ids = [case['id'] for case in cases_result.data] if cases_result.data else []
    cases_map = {case['id']: case for case in cases_result.data} if cases_result.data else {}
    
    if case_ids:
        # Get upcoming hearings
        hearings_result = supabase.table('hearings').select('*').in_('case_id', case_ids).gte('hearing_date', today.isoformat()).lte('hearing_date', thirty_days_later.isoformat()).eq('is_completed', False).order('hearing_date').limit(10).execute()
        
        for hearing in hearings_result.data:
            case_data = cases_map.get(hearing['case_id'], {})
            reminders.append({
                "type": "Hearing Date",
                "detail": f"{hearing.get('court_name', 'Court')}, {hearing.get('court_room', '')}",
                "case_title": case_data.get('title', 'Case'),
                "time": hearing['hearing_date'],
                "icon": "calendar",
                "color": "blue",
                "related_id": hearing['id'],
                "related_type": "hearing"
            })
    
    # Get upcoming meetings
    meetings_result = supabase.table('meetings').select('*, client:users!meetings_client_id_fkey(full_name)').eq('advocate_id', advocate_id).gte('scheduled_date', today.isoformat()).lte('scheduled_date', thirty_days_later.isoformat()).neq('status', 'completed').order('scheduled_date').limit(10).execute()
    
    for meeting in meetings_result.data:
        client_data = meeting.get('client', {})
        client_name = client_data.get('full_name', 'Client') if client_data else 'Client'
        
        reminders.append({
            "type": "Meeting with Client",
            "detail": client_name,
            "time": meeting['scheduled_date'],
            "icon": "check",
            "color": "green",
            "related_id": meeting['id'],
            "related_type": "meeting"
        })
    
    # Sort by time
    reminders.sort(key=lambda x: x['time'])
    
    return {"reminders": reminders[:10]}

# ============= ADMIN/ANALYTICS ENDPOINTS =============
@api_router.get("/admin/stats")
async def get_platform_stats(
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER]))
):
    """Get enhanced platform statistics for admin dashboard"""
    # Users stats
    total_users = supabase.table('users').select('*', count='exact').execute().count
    total_clients = supabase.table('users').select('*', count='exact').eq('role', 'client').execute().count
    total_advocates = supabase.table('advocates').select('*', count='exact').execute().count
    
    # New user registrations (last 30 days)
    from datetime import timedelta
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    new_users = supabase.table('users').select('*', count='exact').gte('created_at', thirty_days_ago).execute().count
    
    # Advocates stats
    approved_advocates = supabase.table('advocates').select('*', count='exact').eq('status', 'approved').execute().count
    pending_advocates = supabase.table('advocates').select('*', count='exact').eq('status', 'pending_approval').execute().count
    rejected_advocates = supabase.table('advocates').select('*', count='exact').eq('status', 'rejected').execute().count
    
    # Cases stats
    total_cases = supabase.table('cases').select('*', count='exact').execute().count
    active_cases = supabase.table('cases').select('*', count='exact').neq('current_stage', 'CLOSED').execute().count
    closed_cases = supabase.table('cases').select('*', count='exact').eq('current_stage', 'CLOSED').execute().count
    
    # Case distribution by type
    case_types = {}
    for case_type in CaseType:
        count = supabase.table('cases').select('*', count='exact').eq('case_type', case_type.value).execute().count
        case_types[case_type.value] = count
    
    # Case progress stages
    petition_filed = supabase.table('cases').select('*', count='exact').eq('current_stage', 'PETITION_FILED').execute().count
    hearing_scheduled_count = supabase.table('cases').select('*', count='exact').eq('current_stage', 'HEARING_SCHEDULED').execute().count
    judgment_pending = supabase.table('cases').select('*', count='exact').eq('current_stage', 'JUDGMENT_PENDING').execute().count
    
    # Hearings stats
    total_hearings = supabase.table('hearings').select('*', count='exact').execute().count
    upcoming_hearings_count = supabase.table('hearings').select('*', count='exact').gte('hearing_date', datetime.now(timezone.utc).isoformat()).eq('is_completed', False).execute().count
    
    # Meeting requests stats
    total_meeting_requests = supabase.table('meeting_requests').select('*', count='exact').execute().count
    pending_meeting_requests = supabase.table('meeting_requests').select('*', count='exact').eq('status', 'pending').execute().count
    
    # Meetings stats
    total_meetings = supabase.table('meetings').select('*', count='exact').execute().count
    
    # Recent activity for dashboard
    recent_cases = supabase.table('cases').select('*').order('created_at', desc=True).limit(10).execute().data
    recent_meetings = supabase.table('meetings').select('*').order('created_at', desc=True).limit(10).execute().data
    
    # Pending advocates for review
    pending_advocates_list = supabase.table('advocates').select('*, users(*)').eq('status', 'pending_approval').order('created_at', desc=True).limit(10).execute().data
    
    # Recent activities (combining various actions)
    activity_log = []
    
    # Recent advocate approvals
    recent_approvals = supabase.table('advocates').select('*, users(*)').eq('status', 'approved').order('updated_at', desc=True).limit(3).execute().data
    for adv in recent_approvals:
        activity_log.append({
            "type": "advocate_approved",
            "message": f"Advocate {adv.get('users', {}).get('full_name', 'Unknown')} approved",
            "timestamp": adv.get('updated_at'),
            "icon": "check"
        })
    
    # Recent case creations
    for case in recent_cases[:3]:
        activity_log.append({
            "type": "case_created",
            "message": f"New Case: {case.get('case_type', 'Unknown')} - #{case.get('id', '')[:8]}",
            "timestamp": case.get('created_at'),
            "icon": "case"
        })
    
    # Sort activity log by timestamp
    activity_log.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    # Upcoming hearings for alerts
    upcoming_hearings = supabase.table('hearings').select('*, cases(*)').gte('hearing_date', datetime.now(timezone.utc).isoformat()).eq('is_completed', False).order('hearing_date').limit(5).execute().data
    
    return {
        "users": {
            "total": total_users,
            "clients": total_clients,
            "advocates": total_advocates,
            "new_registrations": new_users
        },
        "advocates": {
            "approved": approved_advocates,
            "pending": pending_advocates,
            "rejected": rejected_advocates,
            "pending_list": pending_advocates_list
        },
        "cases": {
            "total": total_cases,
            "active": active_cases,
            "closed": closed_cases,
            "by_type": case_types
        },
        "case_progress": {
            "petition_filed": petition_filed,
            "hearing_scheduled": hearing_scheduled_count,
            "judgment_pending": judgment_pending
        },
        "hearings": {
            "total": total_hearings,
            "upcoming": upcoming_hearings_count,
            "upcoming_list": upcoming_hearings
        },
        "meeting_requests": {
            "total": total_meeting_requests,
            "pending": pending_meeting_requests
        },
        "meetings": {
            "total": total_meetings
        },
        "activity_log": activity_log,
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
# from admin_models import AdminLog, AdminLogResponse, AdminStats, PlatformStats, NotificationResponse
from voice_models import (
    VoiceSessionCreate, VoiceSession, VoiceSessionResponse,
    VoiceMessageCreate, VoiceMessage, VoiceMessageResponse,
    AICaseAnalysisCreate, AICaseAnalysis, AICaseAnalysisResponse,
    VoiceCaseDraftCreate, VoiceCaseDraft, VoiceCaseDraftResponse,
    ProcessVoiceConversationRequest, ConfirmCaseDraftRequest,
    VoiceLanguage, VoiceSessionStatus, MessageSender, CaseDraftStatus
)
from web_speech_service import get_web_speech_service

@api_router.post("/voice/start-session", response_model=VoiceSessionResponse)
async def start_voice_session(
    session_data: VoiceSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Start a new voice AI session using Web Speech API (browser-based)"""
    try:
        logger.info(f"Starting Web Speech session with language: {session_data.language}")
        
        # Create voice session in database (no Vapi needed)
        session = {
            "user_id": current_user["user_id"],
            "language": session_data.language,
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
        
        # Return session (frontend will use Web Speech API for STT/TTS)
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


@api_router.get("/voice/session/{session_id}/messages")
async def get_voice_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a voice session"""
    try:
        # Verify session belongs to user
        session = supabase.table('voice_sessions').select('*').eq('id', session_id).eq('user_id', current_user["user_id"]).execute()
        
        if not session.data or len(session.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        messages = supabase.table('voice_messages').select('*').eq('session_id', session_id).order('created_at').execute()
        
        return messages.data if messages.data else []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")



@api_router.get("/voice/session/{session_id}/messages")
async def get_voice_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a voice session"""
    try:
        # Verify session belongs to user
        session = supabase.table('voice_sessions').select('*').eq('id', session_id).eq('user_id', current_user["user_id"]).execute()
        
        if not session.data or len(session.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        messages = supabase.table('voice_messages').select('*').eq('session_id', session_id).order('created_at').execute()
        
        return messages.data if messages.data else []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@api_router.post("/voice/get-next-question")
async def get_next_question(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-driven next question based on conversation history"""
    try:
        session_id = request.get("session_id")
        user_message = request.get("user_message", "")
        language = request.get("language", "english")
        
        # Get all messages in this session
        messages = supabase.table('voice_messages').select('*').eq('session_id', session_id).order('created_at').execute()
        
        # Build conversation context
        conversation_history = []
        for msg in messages.data:
            conversation_history.append({
                "role": "user" if msg["sender"] == "user" else "assistant",
                "content": msg["message"]
            })
        
        # Add current user message
        if user_message:
            conversation_history.append({
                "role": "user",
                "content": user_message
            })
        
        # Count user responses (excluding greeting)
        user_responses = len([msg for msg in conversation_history if msg["role"] == "user"])
        
        # Determine next question based on conversation stage
        from groq import Groq
        groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        # Enhanced system prompt for REAL-TIME CONVERSATIONAL BEHAVIOR
        lang_instructions = {
            "english": "Respond ONLY in English",
            "hindi": "केवल हिंदी में जवाब दें। कोई अंग्रेजी शब्द न इस्तेमाल करें।",
            "bengali": "শুধুমাত্র বাংলায় উত্তর দিন"
        }
        
        system_prompt = f"""You are a real-time conversational AI assistant specializing in Indian family law.

IMPORTANT: {lang_instructions.get(language, 'Respond in English')}

---

⚠️ CRITICAL BEHAVIOR RULES:

1. Treat voice transcript EXACTLY like typed input.
2. The moment user input is received, you MUST generate a helpful response.
3. DO NOT wait for additional input.
4. DO NOT stay silent after receiving input.
5. DO NOT assume the conversation is incomplete.
6. Even if the sentence is imperfect or partial, respond intelligently.

---

🎤 VOICE INPUT HANDLING:

- Voice input may come as a raw transcript.
- It may contain pauses, incomplete grammar, or errors.
- You must still understand intent and respond naturally.

Example:
User says (voice): "my husband not giving money from last 2 years"

You should respond like:
"I understand your situation. This appears to be related to maintenance/alimony. Your husband has legal obligation to provide financial support. Let me gather some more details - when did he stop giving money? Are you currently living together or separately? Also, which city are you in so I can help recommend local advocates?"

---

⚡ RESPONSE RULE:

ALWAYS generate a helpful, empathetic response after every user message that:
1. Acknowledges what they said
2. Shows you understand the legal issue
3. Asks 1-2 relevant follow-up questions naturally (not interrogation-style)
4. Provides immediate helpful context when possible

---

🚫 DO NOT:

- Wait for confirmation
- Ask "can you repeat?"
- Stay stuck in listening mode
- Ignore the input
- Ask questions in numbered list format
- Sound robotic or scripted

---

🎯 GOAL:

Make the conversation feel like talking to a real human lawyer who:
- Listens carefully
- Responds immediately with empathy
- Asks relevant follow-up questions naturally
- Provides helpful context as you go

---

CURRENT USER RESPONSES COUNT: {user_responses}

After about 4-6 meaningful exchanges, when you have enough information (case type, duration, location, basic details), include "READY_TO_ANALYZE" at the very end of your response.

---

Now respond naturally to the following user input:
"""
        
        messages_for_groq = [{"role": "system", "content": system_prompt}] + conversation_history
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_for_groq,
            temperature=0.7,
            max_tokens=300
        )
        
        next_question = response.choices[0].message.content
        
        # Check if AI thinks we have enough information
        ready_to_analyze = "READY_TO_ANALYZE" in next_question or user_responses >= 5
        
        if ready_to_analyze:
            # Remove the READY_TO_ANALYZE marker if present
            next_question = next_question.replace("READY_TO_ANALYZE", "").strip()
            
            # Add natural completion message
            if not next_question.endswith("'Finish & Analyze'") and not next_question.endswith("विश्लेषण करें"):
                completion_msg = {
                    "english": " I now have enough information to provide you with a comprehensive legal analysis. Click 'Finish & Analyze' button below to see detailed insights, applicable laws, and recommended advocates.",
                    "hindi": " अब मेरे पास आपके मामले का विस्तृत विश्लेषण करने के लिए पर्याप्त जानकारी है। विस्तृत जानकारी, लागू कानून और अनुशंसित वकील देखने के लिए नीचे 'समाप्त करें और विश्लेषण करें' बटन पर क्लिक करें।",
                    "bengali": " এখন আমার কাছে আপনার মামলার বিস্তারিত বিশ্লেষণ করার জন্য যথেষ্ট তথ্য আছে। বিস্তারিত অন্তর্দৃষ্টি, প্রযোজ্য আইন এবং প্রস্তাবিত আইনজীবী দেখতে নীচে 'শেষ করুন এবং বিশ্লেষণ করুন' বোতামে ক্লিক করুন।"
                }.get(language, "")
                
                next_question = next_question.strip() + completion_msg
        
        return {
            "success": True,
            "next_question": next_question,
            "ready_to_analyze": ready_to_analyze
        }
        
    except Exception as e:
        logger.error(f"Error getting next question: {str(e)}")
        fallback_msg = {
            "english": "Could you please provide more details about your situation?",
            "hindi": "क्या आप अपनी स्थिति के बारे में अधिक विवरण दे सकते हैं?",
            "bengali": "আপনি কি আপনার পরিস্থিতি সম্পর্কে আরও বিস্তারিত জানাতে পারেন?"
        }.get(language, "Could you please provide more details about your situation?")
        
        return {
            "success": False,
            "next_question": fallback_msg,
            "ready_to_analyze": False
        }
    
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
        
        # Validate transcript length
        if not request.transcript or len(request.transcript.strip()) < 15:
            logger.info(f"Transcript too short or empty")
            raise HTTPException(
                status_code=400, 
                detail="Please provide a detailed description of your legal problem. The conversation is too short."
            )
        
        # STEP 1: Use Groq AI to detect legal intent (intelligent validation)
        logger.info("Step 1: Detecting legal intent with Groq AI...")
        intent_result = await detect_legal_intent(request.transcript)
        
        if not intent_result.get("is_legal", False):
            rejection_reason = intent_result.get("reason_if_rejected", "This doesn't appear to be a legal problem")
            logger.warning(f"AI detected non-legal conversation: {rejection_reason}")
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ {rejection_reason}. This is a legal advisory system. Please describe your legal issue clearly (divorce, custody, property dispute, etc.)"
            )
        
        logger.info(f"AI confirmed legal intent: case_type={intent_result.get('case_type')}, confidence={intent_result.get('confidence')}")
        
        # STEP 2: Extract additional case info for context
        web_speech_service = get_web_speech_service()
        case_info = web_speech_service.extract_case_info_from_transcript(
            request.transcript,
            request.language
        )
        
        
        # STEP 3: Determine case type (prefer AI detection, fallback to keyword extraction)
        case_type_str = intent_result.get("case_type") or case_info.get("case_type", "other")
        if not case_type_str or case_type_str == "other":
            logger.info("Case type not specifically determined, will use comprehensive analysis")
        
        try:
            case_type = CaseType(case_type_str)
        except ValueError:
            logger.warning(f"Invalid case type: {case_type_str}, defaulting to OTHER")
            case_type = CaseType.OTHER
        
        
        # STEP 4: Analyze with Groq (full detailed analysis)
        logger.info(f"Step 2: Calling Groq AI for comprehensive analysis, case_type: {case_type}")
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
# ============= USER PROFILE ENDPOINTS (MISSING) =============
@api_router.get("/users/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    try:
        user = supabase.table('users').select('*').eq('id', current_user["user_id"]).execute()
        if not user.data or len(user.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return user.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")


@api_router.patch("/users/profile")
async def update_user_profile(
    profile_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    try:
        # Only allow updating specific fields
        allowed_fields = ['full_name', 'phone']
        update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        result = supabase.table('users').update(update_data).eq('id', current_user["user_id"]).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Profile updated successfully", "user": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


# ============= CLIENT DOWNLOADS ENDPOINT (MISSING) =============
@api_router.get("/client/downloads")
async def get_client_downloads(current_user: dict = Depends(require_role([UserRole.CLIENT]))):
    """Get all downloadable documents for client"""
    try:
        user_id = current_user["user_id"]
        
        # Get all cases for this client
        cases_result = supabase.table('cases').select('id, title').eq('client_id', user_id).execute()
        case_ids = [case['id'] for case in cases_result.data] if cases_result.data else []
        
        downloads = []
        
        if case_ids:
            # Get all documents for these cases
            docs_result = supabase.table('documents').select('*').in_('case_id', case_ids).order('created_at', desc=True).execute()
            
            if docs_result.data:
                for doc in docs_result.data:
                    # Get case title
                    case_title = next((c['title'] for c in cases_result.data if c['id'] == doc['case_id']), 'Unknown Case')
                    
                    downloads.append({
                        "id": doc['id'],
                        "name": doc['document_name'],
                        "type": doc['document_type'],
                        "case_title": case_title,
                        "url": doc.get('cloudinary_url', ''),
                        "size": doc.get('file_size', 0),
                        "uploaded_at": doc['created_at'],
                        "description": doc.get('description', '')
                    })
        
        # Add some mock legal templates as downloadable resources
        mock_templates = [
            {
                "id": "template_1",
                "name": "Divorce Petition Template",
                "type": "pdf",
                "case_title": "Legal Templates",
                "url": "https://example.com/divorce-template.pdf",
                "size": 524288,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "description": "Standard divorce petition template for reference"
            },
            {
                "id": "template_2",
                "name": "Child Custody Agreement",
                "type": "pdf",
                "case_title": "Legal Templates",
                "url": "https://example.com/custody-template.pdf",
                "size": 362144,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "description": "Sample child custody agreement template"
            }
        ]
        
        # Add mock templates if no real documents
        if len(downloads) == 0:
            downloads.extend(mock_templates)
        
        return {"downloads": downloads}
    
    except Exception as e:
        logger.error(f"Error fetching downloads: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch downloads")


# ============= LEGAL RESOURCES ENDPOINT (MISSING) =============
@api_router.get("/legal-resources")
async def get_legal_resources(category: str = "all"):
    """Get legal resources (articles, guides, checklists) by category"""
    try:
        # Define mock legal resources
        all_resources = [
            {
                "id": "res_1",
                "title": "Complete Guide to Divorce in India",
                "description": "A comprehensive guide covering all aspects of divorce proceedings including grounds for divorce, mutual consent divorce, and contested divorce procedures.",
                "content_type": "guide",
                "category": "divorce",
                "tags": ["divorce", "legal procedure", "family law"],
                "reading_time": "12 min read",
                "thumbnail": None
            },
            {
                "id": "res_2",
                "title": "Understanding Child Custody Laws",
                "description": "Learn about child custody types, factors considered by courts, and how to prepare for custody hearings in India.",
                "content_type": "article",
                "category": "child_custody",
                "tags": ["child custody", "parental rights", "family court"],
                "reading_time": "8 min read",
                "thumbnail": None
            },
            {
                "id": "res_3",
                "title": "Alimony Rights and Calculation",
                "description": "Understand your rights to alimony, how it's calculated, and the legal provisions under different personal laws.",
                "content_type": "article",
                "category": "alimony",
                "tags": ["alimony", "maintenance", "financial support"],
                "reading_time": "10 min read",
                "thumbnail": None
            },
            {
                "id": "res_4",
                "title": "Domestic Violence Act: Your Rights",
                "description": "A detailed overview of the Protection of Women from Domestic Violence Act, 2005 and the remedies available.",
                "content_type": "guide",
                "category": "domestic_violence",
                "tags": ["domestic violence", "protection order", "women's rights"],
                "reading_time": "15 min read",
                "thumbnail": None
            },
            {
                "id": "res_5",
                "title": "Documents Required for Divorce",
                "description": "A complete checklist of documents needed for filing a divorce petition in India.",
                "content_type": "checklist",
                "category": "divorce",
                "tags": ["divorce", "documents", "checklist"],
                "reading_time": "5 min read",
                "thumbnail": None
            },
            {
                "id": "res_6",
                "title": "Family Court Procedures Explained",
                "description": "Step-by-step explanation of how family court proceedings work in India.",
                "content_type": "article",
                "category": "general",
                "tags": ["family court", "legal procedure", "court process"],
                "reading_time": "10 min read",
                "thumbnail": None
            },
            {
                "id": "res_7",
                "title": "Maintenance and Alimony Calculator Guide",
                "description": "Understand how courts calculate maintenance and alimony amounts based on various factors.",
                "content_type": "guide",
                "category": "alimony",
                "tags": ["alimony calculation", "maintenance", "financial planning"],
                "reading_time": "7 min read",
                "thumbnail": None
            },
            {
                "id": "res_8",
                "title": "Child Support: Legal Obligations",
                "description": "Everything you need to know about child support obligations and enforcement.",
                "content_type": "article",
                "category": "child_custody",
                "tags": ["child support", "parental obligations", "financial support"],
                "reading_time": "9 min read",
                "thumbnail": None
            },
            {
                "id": "res_9",
                "title": "Legal Glossary: Family Law Terms",
                "description": "A comprehensive glossary of common legal terms used in family law cases.",
                "content_type": "glossary",
                "category": "general",
                "tags": ["legal terms", "glossary", "definitions"],
                "reading_time": "6 min read",
                "thumbnail": None
            },
            {
                "id": "res_10",
                "title": "Preparing for Your First Court Hearing",
                "description": "A practical guide to help you prepare for your first appearance in family court.",
                "content_type": "guide",
                "category": "general",
                "tags": ["court hearing", "preparation", "legal advice"],
                "reading_time": "11 min read",
                "thumbnail": None
            }
        ]
        
        # Filter by category
        if category and category != "all":
            filtered_resources = [r for r in all_resources if r["category"] == category]
        else:
            filtered_resources = all_resources
        
        # Get unique categories
        categories = ["all", "divorce", "child_custody", "alimony", "domestic_violence", "general"]
        
        return {
            "resources": filtered_resources,
            "categories": categories,
            "total": len(filtered_resources)
        }
    
    except Exception as e:
        logger.error(f"Error fetching legal resources: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch legal resources")


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
















































