# Complete FastAPI Backend for Legal Family Case Advisor System (LFCAS)
# Phase 1-4 Implementation

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import json

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
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role
)
from groq_service import analyze_case_with_groq, get_advocate_recommendation_criteria
from cloudinary_service import upload_document_to_cloudinary, delete_document_from_cloudinary
# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging - MUST COME FIRST
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
# MongoDB connection with explicit TLS 1.2
import ssl
import certifi

mongo_url = os.environ['MONGO_URL']

# Create SSL context with TLS 1.2
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
ssl_context.maximum_version = ssl.TLSVersion.TLSv1_2

client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    tls=True,
    tlsAllowInvalidCertificates=True,  # For development
    tlsCAFile=certifi.where()
)

db = client[os.environ['DB_NAME']]

# Create indexes for better performance
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.advocates.create_index("user_id")
    await db.cases.create_index("client_id")
    await db.cases.create_index("advocate_id")
    await db.hearings.create_index("case_id")
    await db.documents.create_index("case_id")
    await db.messages.create_index([("case_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.ratings.create_index("advocate_id")

# Socket.IO for real-time messaging
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create FastAPI app
app = FastAPI(title="Legal Family Case Advisor System")

# Create API router
api_router = APIRouter(prefix="/api")

# ============= AUTHENTICATION ENDPOINTS =============
# ... rest of your code continues here ...

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============= AUTHENTICATION ENDPOINTS =============
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user object
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role,
        hashed_password=hashed_password
    )
    
    # Save to database
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create notification
    notification = Notification(
        user_id=user.id,
        notification_type=NotificationType.SYSTEM,
        title="Welcome to LFCAS",
        message=f"Welcome {user.full_name}! Your account has been created successfully."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return UserResponse(**user.model_dump())


@api_router.post("/auth/login")
async def login_user(credentials: UserLogin):
    """Login user and return JWT token"""
    # Find user
    user_dict = await db.users.find_one({"email": credentials.email})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user = User(**user_dict)
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user.model_dump())
    }


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current logged-in user information"""
    user_dict = await db.users.find_one({"id": current_user["user_id"]})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user_dict)


# ============= ADVOCATE ENDPOINTS =============
@api_router.post("/advocates/profile", response_model=AdvocateResponse)
async def create_advocate_profile(
    profile_data: AdvocateCreate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Create advocate profile"""
    # Check if profile already exists
    existing = await db.advocates.find_one({"user_id": current_user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    # Create profile
    profile = AdvocateProfile(
        user_id=current_user["user_id"],
        bar_council_id=profile_data.bar_council_id,
        specialization=profile_data.specialization,
        experience_years=profile_data.experience_years,
        location=profile_data.location,
        bio=profile_data.bio
    )
    
    profile_dict = profile.model_dump()
    profile_dict['created_at'] = profile_dict['created_at'].isoformat()
    profile_dict['updated_at'] = profile_dict['updated_at'].isoformat()
    
    await db.advocates.insert_one(profile_dict)
    
    return AdvocateResponse(**profile.model_dump())


@api_router.get("/advocates", response_model=List[AdvocateResponse])
async def list_advocates(
    status: Optional[AdvocateStatus] = None,
    location: Optional[str] = None,
    specialization: Optional[CaseType] = None,
    limit: int = 20
):
    """List advocates with filters"""
    query = {}
    if status:
        query["status"] = status
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if specialization:
        query["specialization"] = specialization
    
    advocates = await db.advocates.find(query).limit(limit).to_list(limit)
    
    # Get user details for each advocate
    result = []
    for adv in advocates:
        user = await db.users.find_one({"id": adv["user_id"]})
        adv_response = AdvocateResponse(**adv)
        if user:
            adv_response.user = UserResponse(**user)
        result.append(adv_response)
    
    return result


@api_router.get("/advocates/{advocate_id}", response_model=AdvocateResponse)
async def get_advocate(advocate_id: str):
    """Get advocate details"""
    advocate = await db.advocates.find_one({"id": advocate_id})
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    user = await db.users.find_one({"id": advocate["user_id"]})
    adv_response = AdvocateResponse(**advocate)
    if user:
        adv_response.user = UserResponse(**user)
    
    return adv_response


@api_router.patch("/advocates/{advocate_id}/status")
async def update_advocate_status(
    advocate_id: str,
    new_status: AdvocateStatus,
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER]))
):
    """Update advocate status (Admin only)"""
    result = await db.advocates.update_one(
        {"id": advocate_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    # Log admin action
    admin_log = AdminLog(
        admin_id=current_user["user_id"],
        action="update_advocate_status",
        target_type="advocate",
        target_id=advocate_id,
        details={"new_status": new_status}
    )
    log_dict = admin_log.model_dump()
    log_dict['created_at'] = log_dict['created_at'].isoformat()
    await db.admin_logs.insert_one(log_dict)
    
    # Notify advocate
    advocate = await db.advocates.find_one({"id": advocate_id})
    if advocate:
        notification = Notification(
            user_id=advocate["user_id"],
            notification_type=NotificationType.SYSTEM,
            title="Profile Status Updated",
            message=f"Your advocate profile status has been updated to: {new_status}"
        )
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
    
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
    log = GroqAILog(
        user_id=current_user["user_id"],
        query=query.description,
        response=ai_result,
        tokens_used=ai_result.get("tokens_used")
    )
    log_dict = log.model_dump()
    log_dict['created_at'] = log_dict['created_at'].isoformat()
    await db.groq_ai_logs.insert_one(log_dict)
    
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
    case = Case(
        client_id=current_user["user_id"],
        case_type=case_data.case_type,
        title=case_data.title,
        description=case_data.description,
        location=case_data.location,
        ai_analysis=ai_result.get("data", {}),
        required_documents=ai_result.get("data", {}).get("required_documents", []),
        legal_sections=ai_result.get("data", {}).get("legal_sections", []),
        procedural_guidance=ai_result.get("data", {}).get("procedural_guidance", "")
    )
    
    case_dict = case.model_dump()
    case_dict['created_at'] = case_dict['created_at'].isoformat()
    case_dict['updated_at'] = case_dict['updated_at'].isoformat()
    
    await db.cases.insert_one(case_dict)
    
    # Create notification
    notification = Notification(
        user_id=current_user["user_id"],
        notification_type=NotificationType.CASE_UPDATE,
        title="Case Created",
        message=f"Your case '{case.title}' has been created successfully.",
        related_id=case.id
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return CaseResponse(**case.model_dump())


@api_router.get("/cases", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[CaseStatus] = None,
    case_type: Optional[CaseType] = None,
    current_user: dict = Depends(get_current_user)
):
    """List cases based on user role"""
    query = {}
    
    # Filter based on role
    if current_user["role"] == UserRole.CLIENT:
        query["client_id"] = current_user["user_id"]
    elif current_user["role"] == UserRole.ADVOCATE:
        query["advocate_id"] = current_user["user_id"]
    # Platform managers can see all cases
    
    if status:
        query["status"] = status
    if case_type:
        query["case_type"] = case_type
    
    cases = await db.cases.find(query).sort("created_at", -1).to_list(100)
    
    # Populate client and advocate details
    result = []
    for case_dict in cases:
        case_response = CaseResponse(**case_dict)
        
        # Get client details
        client = await db.users.find_one({"id": case_dict["client_id"]})
        if client:
            case_response.client = UserResponse(**client)
        
        # Get advocate details if assigned
        if case_dict.get("advocate_id"):
            advocate = await db.advocates.find_one({"id": case_dict["advocate_id"]})
            if advocate:
                case_response.advocate = AdvocateResponse(**advocate)
        
        result.append(case_response)
    
    return result


@api_router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get case details"""
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check access permissions
    if current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    case_response = CaseResponse(**case)
    
    # Get client details
    client = await db.users.find_one({"id": case["client_id"]})
    if client:
        case_response.client = UserResponse(**client)
    
    # Get advocate details if assigned
    if case.get("advocate_id"):
        advocate = await db.advocates.find_one({"id": case["advocate_id"]})
        if advocate:
            case_response.advocate = AdvocateResponse(**advocate)
    
    return case_response


@api_router.patch("/cases/{case_id}/assign-advocate")
async def assign_advocate_to_case(
    case_id: str,
    advocate_id: str,
    current_user: dict = Depends(require_role([UserRole.CLIENT]))
):
    """Assign an advocate to a case"""
    # Verify advocate exists and is approved
    advocate = await db.advocates.find_one({"id": advocate_id, "status": AdvocateStatus.APPROVED})
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found or not approved")
    
    # Update case
    result = await db.cases.update_one(
        {"id": case_id, "client_id": current_user["user_id"]},
        {
            "$set": {
                "advocate_id": advocate_id,
                "status": CaseStatus.IN_PROGRESS,
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found or access denied")
    
    # Update advocate's active cases count
    await db.advocates.update_one(
        {"id": advocate_id},
        {"$inc": {"active_cases": 1, "total_cases": 1}}
    )
    
    # Notify advocate
    notification = Notification(
        user_id=advocate["user_id"],
        notification_type=NotificationType.ADVOCATE_ASSIGNED,
        title="New Case Assigned",
        message="You have been assigned to a new case.",
        related_id=case_id
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Notify client
    notification2 = Notification(
        user_id=current_user["user_id"],
        notification_type=NotificationType.ADVOCATE_ASSIGNED,
        title="Advocate Assigned",
        message="An advocate has been assigned to your case.",
        related_id=case_id
    )
    notif_dict2 = notification2.model_dump()
    notif_dict2['created_at'] = notif_dict2['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict2)
    
    return {"message": "Advocate assigned successfully"}


@api_router.patch("/cases/{case_id}/status")
async def update_case_status(
    case_id: str,
    new_status: CaseStatus,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE, UserRole.PLATFORM_MANAGER]))
):
    """Update case status"""
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check permissions
    if current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update status
    await db.cases.update_one(
        {"id": case_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    # If case is closed, decrease advocate's active cases
    if new_status == CaseStatus.CLOSED and case.get("advocate_id"):
        await db.advocates.update_one(
            {"id": case["advocate_id"]},
            {"$inc": {"active_cases": -1}}
        )
    
    # Notify client
    notification = Notification(
        user_id=case["client_id"],
        notification_type=NotificationType.CASE_UPDATE,
        title="Case Status Updated",
        message=f"Your case status has been updated to: {new_status}",
        related_id=case_id
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {"message": "Case status updated successfully"}


# ============= HEARING ENDPOINTS =============
@api_router.post("/hearings", response_model=Hearing)
async def create_hearing(
    hearing_data: HearingCreate,
    current_user: dict = Depends(require_role([UserRole.ADVOCATE]))
):
    """Create a hearing schedule"""
    # Verify case exists and advocate has access
    case = await db.cases.find_one({
        "id": hearing_data.case_id,
        "advocate_id": current_user["user_id"]
    })
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or access denied")
    
    # Create hearing
    hearing = Hearing(
        case_id=hearing_data.case_id,
        hearing_date=hearing_data.hearing_date,
        court_name=hearing_data.court_name,
        court_room=hearing_data.court_room,
        notes=hearing_data.notes
    )
    
    hearing_dict = hearing.model_dump()
    hearing_dict['hearing_date'] = hearing_dict['hearing_date'].isoformat()
    hearing_dict['created_at'] = hearing_dict['created_at'].isoformat()
    hearing_dict['updated_at'] = hearing_dict['updated_at'].isoformat()
    
    await db.hearings.insert_one(hearing_dict)
    
    # Update case status
    await db.cases.update_one(
        {"id": hearing_data.case_id},
        {"$set": {"status": CaseStatus.HEARING_SCHEDULED}}
    )
    
    # Notify client
    notification = Notification(
        user_id=case["client_id"],
        notification_type=NotificationType.HEARING_REMINDER,
        title="Hearing Scheduled",
        message=f"A hearing has been scheduled for {hearing.hearing_date}",
        related_id=hearing.id
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return hearing


@api_router.get("/hearings/case/{case_id}", response_model=List[Hearing])
async def get_case_hearings(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all hearings for a case"""
    # Verify access
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if (current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    hearings = await db.hearings.find({"case_id": case_id}).sort("hearing_date", 1).to_list(100)
    
    # Convert ISO strings back to datetime
    for hearing in hearings:
        if isinstance(hearing.get('hearing_date'), str):
            hearing['hearing_date'] = datetime.fromisoformat(hearing['hearing_date'])
        if isinstance(hearing.get('created_at'), str):
            hearing['created_at'] = datetime.fromisoformat(hearing['created_at'])
        if isinstance(hearing.get('updated_at'), str):
            hearing['updated_at'] = datetime.fromisoformat(hearing['updated_at'])
    
    return [Hearing(**h) for h in hearings]


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
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if (current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Upload to Cloudinary
    upload_result = await upload_document_to_cloudinary(file, folder=f"lfcas_cases/{case_id}")
    
    if not upload_result.get("success"):
        raise HTTPException(status_code=500, detail=upload_result.get("error", "Upload failed"))
    
    # Create document record
    document = Document(
        case_id=case_id,
        uploaded_by=current_user["user_id"],
        document_name=document_name,
        document_type=document_type,
        cloudinary_url=upload_result["url"],
        cloudinary_public_id=upload_result["public_id"],
        description=description,
        file_size=upload_result.get("size")
    )
    
    doc_dict = document.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    
    await db.documents.insert_one(doc_dict)
    
    # Notify other party
    notify_user_id = case.get("advocate_id") if current_user["role"] == UserRole.CLIENT else case["client_id"]
    if notify_user_id:
        notification = Notification(
            user_id=notify_user_id,
            notification_type=NotificationType.DOCUMENT_UPLOADED,
            title="New Document Uploaded",
            message=f"A new document '{document_name}' has been uploaded to the case.",
            related_id=document.id
        )
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
    
    return document


@api_router.get("/documents/case/{case_id}", response_model=List[Document])
async def get_case_documents(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents for a case"""
    # Verify access
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if (current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    documents = await db.documents.find({"case_id": case_id}).sort("created_at", -1).to_list(100)
    
    # Convert datetime strings
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    
    return [Document(**d) for d in documents]


# ============= MESSAGE ENDPOINTS =============
@api_router.post("/messages", response_model=Message)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a case"""
    # Verify case access
    case = await db.cases.find_one({"id": message_data.case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Determine receiver
    if current_user["role"] == UserRole.CLIENT:
        if case["client_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        receiver_id = case.get("advocate_id", "")
    else:
        if case.get("advocate_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        receiver_id = case["client_id"]
    
    if not receiver_id:
        raise HTTPException(status_code=400, detail="No advocate assigned to this case")
    
    # Create message
    message = Message(
        case_id=message_data.case_id,
        sender_id=current_user["user_id"],
        receiver_id=receiver_id,
        content=message_data.content,
        message_type=message_data.message_type,
        attachment_url=message_data.attachment_url
    )
    
    msg_dict = message.model_dump()
    msg_dict['created_at'] = msg_dict['created_at'].isoformat()
    
    await db.messages.insert_one(msg_dict)
    
    # Send real-time notification via Socket.IO
    await sio.emit('new_message', msg_dict, room=receiver_id)
    
    # Create notification
    notification = Notification(
        user_id=receiver_id,
        notification_type=NotificationType.NEW_MESSAGE,
        title="New Message",
        message="You have a new message in your case.",
        related_id=message.id
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return message


@api_router.get("/messages/case/{case_id}", response_model=List[Message])
async def get_case_messages(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a case"""
    # Verify access
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if (current_user["role"] == UserRole.CLIENT and case["client_id"] != current_user["user_id"]) or \
       (current_user["role"] == UserRole.ADVOCATE and case.get("advocate_id") != current_user["user_id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await db.messages.find({"case_id": case_id}).sort("created_at", 1).to_list(1000)
    
    # Mark messages as read
    await db.messages.update_many(
        {"case_id": case_id, "receiver_id": current_user["user_id"]},
        {"$set": {"is_read": True}}
    )
    
    # Convert datetime strings
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return [Message(**m) for m in messages]


# ============= NOTIFICATION ENDPOINTS =============
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for notif in notifications:
        if isinstance(notif.get('created_at'), str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    
    return [Notification(**n) for n in notifications]


@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
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
    case = await db.cases.find_one({
        "id": rating_data.case_id,
        "client_id": current_user["user_id"],
        "status": CaseStatus.CLOSED
    })
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or not closed")
    
    # Check if already rated
    existing_rating = await db.ratings.find_one({"case_id": rating_data.case_id})
    if existing_rating:
        raise HTTPException(status_code=400, detail="Case already rated")
    
    # Create rating
    rating = Rating(
        case_id=rating_data.case_id,
        client_id=current_user["user_id"],
        advocate_id=rating_data.advocate_id,
        rating=rating_data.rating,
        review=rating_data.review
    )
    
    rating_dict = rating.model_dump()
    rating_dict['created_at'] = rating_dict['created_at'].isoformat()
    
    await db.ratings.insert_one(rating_dict)
    
    # Update advocate's average rating
    ratings = await db.ratings.find({"advocate_id": rating_data.advocate_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in ratings) / len(ratings)
    
    await db.advocates.update_one(
        {"id": rating_data.advocate_id},
        {"$set": {"rating": round(avg_rating, 2)}}
    )
    
    return rating


@api_router.get("/ratings/advocate/{advocate_id}", response_model=List[Rating])
async def get_advocate_ratings(advocate_id: str, limit: int = 20):
    """Get ratings for an advocate"""
    ratings = await db.ratings.find(
        {"advocate_id": advocate_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for rating in ratings:
        if isinstance(rating.get('created_at'), str):
            rating['created_at'] = datetime.fromisoformat(rating['created_at'])
    
    return [Rating(**r) for r in ratings]


# ============= ADMIN/ANALYTICS ENDPOINTS =============
@api_router.get("/admin/stats")
async def get_platform_stats(
    current_user: dict = Depends(require_role([UserRole.PLATFORM_MANAGER]))
):
    """Get platform statistics"""
    total_users = await db.users.count_documents({})
    total_clients = await db.users.count_documents({"role": UserRole.CLIENT})
    total_advocates = await db.advocates.count_documents({})
    approved_advocates = await db.advocates.count_documents({"status": AdvocateStatus.APPROVED})
    pending_advocates = await db.advocates.count_documents({"status": AdvocateStatus.PENDING_APPROVAL})
    
    total_cases = await db.cases.count_documents({})
    active_cases = await db.cases.count_documents({"status": {"$nin": [CaseStatus.CLOSED]}})
    closed_cases = await db.cases.count_documents({"status": CaseStatus.CLOSED})
    
    # Case distribution by type
    case_types = {}
    for case_type in CaseType:
        count = await db.cases.count_documents({"case_type": case_type})
        case_types[case_type.value] = count
    
    # Recent activity
    recent_cases = await db.cases.find({}).sort("created_at", -1).limit(5).to_list(5)
    
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
    logs = await db.admin_logs.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for log in logs:
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    
    return [AdminLog(**l) for l in logs]


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
        "message": "Legal Family Case Advisor System API",
        "version": "1.0.0",
        "status": "operational"
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
        # Test MongoDB connection
        await client.admin.command('ping')
        logger.info("MongoDB connection successful")
        
        # Create indexes in background
        try:
            await create_indexes()
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Index creation failed (non-critical): {e}")
            
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        logger.warning("Continuing without MongoDB connection...")
    
    logger.info("LFCAS Backend started successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    client.close()
    logger.info("LFCAS Backend shut down")
