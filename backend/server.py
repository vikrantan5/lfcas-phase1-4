# Complete FastAPI Backend for Legal Family Case Advisor System (LFCAS)
# Migrated to Supabase PostgreSQL

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
import socketio
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
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
    AIQueryRequest
)

# Import services
from auth import (
    get_current_user, require_role, create_user_with_auth, 
    login_user, get_supabase_client
)
from groq_service import analyze_case_with_groq, get_advocate_recommendation_criteria
from cloudinary_service import upload_document_to_cloudinary, delete_document_from_cloudinary

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
app = FastAPI(title="Legal Family Case Advisor System - Supabase")

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
    if user_data and len(user_data) > 0:
        adv_response.user = UserResponse(**user_data[0])
    
    return adv_response


@api_router.patch("/advocates/{advocate_id}/status")
async def update_advocate_status(
    advocate_id: str,
    new_status: AdvocateStatus,
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER]))
):
    """Update advocate status (Admin only)"""
    result = supabase.table('advocates').update({
        "status": new_status
    }).eq('id', advocate_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    # Log admin action
    admin_log = {
        "admin_id": current_user["user_id"],
        "action": "update_advocate_status",
        "target_type": "advocate",
        "target_id": advocate_id,
        "details": {"new_status": new_status}
    }
    supabase.table('admin_logs').insert(admin_log).execute()
    
    # Notify advocate
    advocate = result.data[0]
    notification = {
        "user_id": advocate["user_id"],
        "notification_type": NotificationType.SYSTEM,
        "title": "Profile Status Updated",
        "message": f"Your advocate profile status has been updated to: {new_status}"
    }
    supabase.table('notifications').insert(notification).execute()
    
    return {"message": "Status updated successfully"}


# ============= AI QUERY ENDPOINTS =============
@api_router.post("/ai/analyze")
async def analyze_legal_query(
    query: AIQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze legal query using Groq AI"""
    # Call Groq service
    ai_result = await analyze_case_with_groq(
        case_type=query.case_type,
        description=query.description,
        additional_details=query.additional_details
    )
    
    # Log the query
    log = {
        "user_id": current_user["user_id"],
        "query": query.description,
        "response": ai_result,
        "tokens_used": ai_result.get("tokens_used")
    }
    supabase.table('groq_ai_logs').insert(log).execute()
    
    return ai_result


# ============= CASE ENDPOINTS =============
@api_router.post("/cases", response_model=CaseResponse)
async def create_case(
    case_data: CaseCreate,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Create a new case"""
    # Get AI analysis
    ai_result = await analyze_case_with_groq(
        case_type=case_data.case_type,
        description=case_data.description
    )
    
    # Create case
    case = {
        "client_id": current_user["user_id"],
        "case_type": case_data.case_type,
        "title": case_data.title,
        "description": case_data.description,
        "location": case_data.location,
        "ai_analysis": ai_result.get("data", {}),
        "required_documents": ai_result.get("data", {}).get("required_documents", []),
        "legal_sections": ai_result.get("data", {}).get("legal_sections", []),
        "procedural_guidance": ai_result.get("data", {}).get("procedural_guidance", ""),
        "status": CaseStatus.PENDING
    }
    
    result = supabase.table('cases').insert(case).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create case")
    
    created_case = result.data[0]
    
    # Create notification
    notification = {
        "user_id": current_user["user_id"],
        "notification_type": NotificationType.CASE_UPDATE,
        "title": "Case Created",
        "message": f"Your case '{case_data.title}' has been created successfully.",
        "related_id": created_case['id']
    }
    supabase.table('notifications').insert(notification).execute()
    
    return CaseResponse(**created_case)


@api_router.get("/cases", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[CaseStatus] = None,
    case_type: Optional[CaseType] = None,
    current_user: dict = Depends(get_current_user)
):
    """List cases based on user role"""
    query = supabase.table('cases').select('*, users!cases_client_id_fkey(*)')
    
    # Filter based on role
    if current_user["role"] == UserRole.CLIENT:
        query = query.eq('client_id', current_user["user_id"])
    elif current_user["role"] == UserRole.ADVOCATE:
        query = query.eq('advocate_id', current_user["user_id"])
    # Platform managers can see all cases
    
    if status:
        query = query.eq('status', status)
    if case_type:
        query = query.eq('case_type', case_type)
    
    result = query.order('created_at', desc=True).limit(100).execute()
    
    cases = []
    for case_data in result.data:
        client_data = case_data.pop('users', None)
        case_response = CaseResponse(**case_data)
        
        if client_data:
            case_response.client = UserResponse(**client_data)
        
        # Get advocate details if assigned
        if case_data.get("advocate_id"):
            advocate = supabase.table('advocates').select('*').eq('id', case_data["advocate_id"]).execute()
            if advocate.data and len(advocate.data) > 0:
                case_response.advocate = AdvocateResponse(**advocate.data[0])
        
        cases.append(case_response)
    
    return cases


@api_router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get case details"""
    result = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = result.data[0]
    
    # Check access permissions
    if current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    case_response = CaseResponse(**case)
    
    # Get client details
    client = supabase.table('users').select('*').eq('id', case["client_id"]).execute()
    if client.data and len(client.data) > 0:
        case_response.client = UserResponse(**client.data[0])
    
    # Get advocate details if assigned
    if case.get("advocate_id"):
        advocate = supabase.table('advocates').select('*').eq('id', case["advocate_id"]).execute()
        if advocate.data and len(advocate.data) > 0:
            case_response.advocate = AdvocateResponse(**advocate.data[0])
    
    return case_response


@api_router.patch("/cases/{case_id}/assign-advocate")
async def assign_advocate_to_case(
    case_id: str,
    advocate_id: str,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Assign an advocate to a case"""
    # Verify advocate exists and is approved
    advocate = supabase.table('advocates').select('*').eq('id', advocate_id).eq('status', AdvocateStatus.APPROVED).execute()
    if not advocate.data or len(advocate.data) == 0:
        raise HTTPException(status_code=404, detail="Advocate not found or not approved")
    
    # Update case
    result = supabase.table('cases').update({
        "advocate_id": advocate_id,
        "status": CaseStatus.IN_PROGRESS
    }).eq('id', case_id).eq('client_id', current_user["user_id"]).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found or access denied")
    
    # Notify advocate
    notification = {
        "user_id": advocate.data[0]["user_id"],
        "notification_type": NotificationType.ADVOCATE_ASSIGNED,
        "title": "New Case Assigned",
        "message": "You have been assigned to a new case.",
        "related_id": case_id
    }
    supabase.table('notifications').insert(notification).execute()
    
    # Notify client
    notification2 = {
        "user_id": current_user["user_id"],
        "notification_type": NotificationType.ADVOCATE_ASSIGNED,
        "title": "Advocate Assigned",
        "message": "An advocate has been assigned to your case.",
        "related_id": case_id
    }
    supabase.table('notifications').insert(notification2).execute()
    
    return {"message": "Advocate assigned successfully"}


@api_router.patch("/cases/{case_id}/status")
async def update_case_status(
    case_id: str,
    new_status: CaseStatus,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE, UserRole.PLATFORM_MANAGER]))
):
    """Update case status"""
    case = supabase.table('cases').select('*').eq('id', case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    # Check permissions
    if current_user["role"] == UserRole.ADVOCATE and case_data.get("advocate_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update status
    supabase.table('cases').update({"status": new_status}).eq('id', case_id).execute()
    
    # Notify client
    notification = {
        "user_id": case_data["client_id"],
        "notification_type": NotificationType.CASE_UPDATE,
        "title": "Case Status Updated",
        "message": f"Your case status has been updated to: {new_status}",
        "related_id": case_id
    }
    supabase.table('notifications').insert(notification).execute()
    
    return {"message": "Case status updated successfully"}


# ============= HEARING ENDPOINTS =============
@api_router.post("/hearings", response_model=Hearing)
async def create_hearing(
    hearing_data: HearingCreate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Create a hearing schedule"""
    # Verify case exists and advocate has access
    case = supabase.table('cases').select('*').eq('id', hearing_data.case_id).eq('advocate_id', current_user["user_id"]).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found or access denied")
    
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
    
    # Update case status
    supabase.table('cases').update({"status": CaseStatus.HEARING_SCHEDULED}).eq('id', hearing_data.case_id).execute()
    
    # Notify client
    notification = {
        "user_id": case.data[0]["client_id"],
        "notification_type": NotificationType.HEARING_REMINDER,
        "title": "Hearing Scheduled",
        "message": f"A hearing has been scheduled for {hearing_data.hearing_date}",
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
    
    # FIXED: Add backslash for line continuation
    if (current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case_data.get("advocate_id") != current_user["user_id"]):
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
    
    # FIXED: Add backslash for line continuation
    if (current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case_data.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Upload to Cloudinary
    upload_result = await upload_document_to_cloudinary(file, folder=f"lfcas_cases/{case_id}")
    
    if not upload_result.get("success"):
        raise HTTPException(status_code=500, detail=upload_result.get("error", "Upload failed"))
    
    # Rest of the function remains the same...
    
    # Create document record
    document = {
        "case_id": case_id,
        "uploaded_by": current_user["user_id"],
        "document_name": document_name,
        "document_type": document_type,
        "cloudinary_url": upload_result["url"],
        "cloudinary_public_id": upload_result["public_id"],
        "description": description,
        "file_size": upload_result.get("size")
    }
    
    result = supabase.table('documents').insert(document).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to save document")
    
    # Notify other party
    notify_user_id = case_data.get("advocate_id") if current_user["role"] == UserRole.CLIENT else case_data["client_id"]
    if notify_user_id:
        notification = {
            "user_id": notify_user_id,
            "notification_type": NotificationType.DOCUMENT_UPLOADED,
            "title": "New Document Uploaded",
            "message": f"A new document '{document_name}' has been uploaded to the case.",
            "related_id": result.data[0]['id']
        }
        supabase.table('notifications').insert(notification).execute()
    
    return Document(**result.data[0])


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
    
    # FIXED: Add backslash for line continuation
    if (current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case_data.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = supabase.table('documents').select('*').eq('case_id', case_id).order('created_at', desc=True).execute()
    
    return [Document(**d) for d in result.data]


# ============= MESSAGE ENDPOINTS =============
@api_router.post("/messages", response_model=Message)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a case"""
    # Verify case access
    case = supabase.table('cases').select('*').eq('id', message_data.case_id).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_data = case.data[0]
    
    # Determine receiver
    if current_user["role"] == UserRole.CLIENT:
        if case_data["client_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        receiver_id = case_data.get("advocate_id", "")
    else:
        if case_data.get("advocate_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        receiver_id = case_data["client_id"]
    
    if not receiver_id:
        raise HTTPException(status_code=400, detail="No advocate assigned to this case")
    
    # Create message
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
        "message": "You have a new message in your case.",
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
    
    # FIXED: Add backslash for line continuation
    if (current_user["role"] == UserRole.CLIENT and case_data["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case_data.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = supabase.table('messages').select('*').eq('case_id', case_id).order('created_at').execute()
    
    # Mark messages as read
    supabase.table('messages').update({"is_read": True}).eq('case_id', case_id).eq('receiver_id', current_user["user_id"]).execute()
    
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
    case = supabase.table('cases').select('*').eq('id', rating_data.case_id).eq('client_id', current_user["user_id"]).eq('status', CaseStatus.CLOSED).execute()
    
    if not case.data or len(case.data) == 0:
        raise HTTPException(status_code=404, detail="Case not found or not closed")
    
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
    total_clients = supabase.table('users').select('*', count='exact').eq('role', UserRole.CLIENT).execute().count
    total_advocates = supabase.table('advocates').select('*', count='exact').execute().count
    approved_advocates = supabase.table('advocates').select('*', count='exact').eq('status', AdvocateStatus.APPROVED).execute().count
    pending_advocates = supabase.table('advocates').select('*', count='exact').eq('status', AdvocateStatus.PENDING_APPROVAL).execute().count
    
    total_cases = supabase.table('cases').select('*', count='exact').execute().count
    active_cases = supabase.table('cases').select('*', count='exact').neq('status', CaseStatus.CLOSED).execute().count
    closed_cases = supabase.table('cases').select('*', count='exact').eq('status', CaseStatus.CLOSED).execute().count
    
    # Case distribution by type
    case_types = {}
    for case_type in CaseType:
        count = supabase.table('cases').select('*', count='exact').eq('case_type', case_type).execute().count
        case_types[case_type.value] = count
    
    # Recent activity
    recent_cases = supabase.table('cases').select('*').order('created_at', desc=True).limit(5).execute().data
    
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
        "recent_cases": recent_cases
    }


@api_router.get("/admin/logs", response_model=List[AdminLog])
async def get_admin_logs(
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER])),
    limit: int = 50
):
    """Get admin activity logs"""
    result = supabase.table('admin_logs').select('*').order('created_at', desc=True).limit(limit).execute()
    
    return [AdminLog(**l) for l in result.data]


# ============= SOCKET.IO EVENTS =============
@sio.event
async def connect(sid, environ):
    """Socket.IO connection event"""
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'data': 'Connected to LFCAS server'}, room=sid)


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
        logger.info(f"User {user_id} joined room")


# ============= ROOT ENDPOINT =============
@api_router.get("/")
async def root():
    return {
        "message": "Legal Family Case Advisor System API - Supabase Edition",
        "version": "2.0.0",
        "status": "operational",
        "database": "Supabase PostgreSQL"
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
    
    logger.info("LFCAS Backend (Supabase) started successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("LFCAS Backend shut down")
