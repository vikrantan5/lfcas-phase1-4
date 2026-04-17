# Supabase PostgreSQL Models for LFCAS - Phase 5-9 Refactored
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ============= ENUMS =============
class UserRole(str, Enum):
    CLIENT = "client"
    ADVOCATE = "advocate"
    PLATFORM_MANAGER = "platform_manager"


class CaseType(str, Enum):
    DIVORCE = "divorce"
    ALIMONY = "alimony"
    CHILD_CUSTODY = "child_custody"
    DOWRY = "dowry"
    DOMESTIC_VIOLENCE = "domestic_violence"
    PROPERTY_DISPUTE = "property_dispute"
    OTHER = "other"


# NEW: Extended Case Status for proper lifecycle
class CaseStatus(str, Enum):
    INITIATED = "initiated"
    PETITION_FILED = "petition_filed"
    COURT_REVIEW = "court_review"
    HEARING_SCHEDULED = "hearing_scheduled"
    HEARING_DONE = "hearing_done"
    JUDGMENT_PENDING = "judgment_pending"
    CLOSED = "closed"


class AdvocateStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class MessageType(str, Enum):
    TEXT = "text"
    DOCUMENT = "document"
    SYSTEM = "system"


# NEW: Extended Notification Types
class NotificationType(str, Enum):
    CASE_UPDATE = "case_update"
    HEARING_REMINDER = "hearing_reminder"
    NEW_MESSAGE = "new_message"
    DOCUMENT_UPLOADED = "document_uploaded"
    ADVOCATE_ASSIGNED = "advocate_assigned"
    SYSTEM = "system"
    # New types for meeting workflow
    MEETING_REQUESTED = "meeting_requested"
    MEETING_ACCEPTED = "meeting_accepted"
    MEETING_REJECTED = "meeting_rejected"
    MEETING_SCHEDULED = "meeting_scheduled"
    CASE_APPROVED = "case_approved"
    CASE_REJECTED_BY_ADVOCATE = "case_rejected_by_advocate"


# NEW: Meeting Request Status
class MeetingRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


# NEW: Meeting Status
class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


# NEW: Advocate Decision
class AdvocateDecision(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


# ============= USER MODELS =============
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    auth_user_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool = True
    has_completed_onboarding: bool = False
    created_at: Optional[datetime] = None


# ============= ADVOCATE MODELS =============
class AdvocateProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    bar_council_id: str
    specialization: List[CaseType]
    experience_years: int
    location: str
    bio: Optional[str] = None
    status: AdvocateStatus = AdvocateStatus.PENDING_APPROVAL
    rating: float = 0.0
    total_cases: int = 0
    active_cases: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AdvocateCreate(BaseModel):
    bar_council_id: str
    specialization: List[CaseType]
    experience_years: int
    location: str
    bio: Optional[str] = None


class AdvocateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    bar_council_id: str
    specializations: List[str]  # Fixed: changed from specialization to specializations to match database
    experience_years: int
    location: str
    bio: Optional[str] = None
    status: str
    rating: float = 0.0
    total_cases: int = 0
    active_cases: int = 0
    user: Optional[UserResponse] = None
    created_at: Optional[datetime] = None


# ============= NEW: MEETING REQUEST MODELS =============
class MeetingRequestCreate(BaseModel):
    advocate_id: str
    case_type: CaseType
    description: str
    location: str
    preferred_date: Optional[datetime] = None
    ai_analysis: Optional[Dict[str, Any]] = None


class MeetingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    advocate_id: str
    case_type: CaseType
    description: str
    location: str
    preferred_date: Optional[datetime] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    status: MeetingRequestStatus = MeetingRequestStatus.PENDING
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingRequestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    client_id: str
    advocate_id: str
    case_type: str
    description: str
    location: str
    preferred_date: Optional[datetime] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    client: Optional[UserResponse] = None
    advocate: Optional[AdvocateResponse] = None


# ============= NEW: MEETING MODELS =============
class MeetingCreate(BaseModel):
    meeting_request_id: str
    scheduled_date: datetime
    meeting_mode: str = "online"  # online, in_person
    meeting_link: Optional[str] = None
    meeting_location: Optional[str] = None
    notes: Optional[str] = None


class Meeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meeting_request_id: str
    client_id: str
    advocate_id: str
    scheduled_date: datetime
    meeting_mode: str = "online"
    meeting_link: Optional[str] = None
    meeting_location: Optional[str] = None
    notes: Optional[str] = None
    status: MeetingStatus = MeetingStatus.SCHEDULED
    advocate_decision: AdvocateDecision = AdvocateDecision.PENDING
    decision_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    meeting_request_id: str
    client_id: str
    advocate_id: str
    scheduled_date: datetime
    meeting_mode: str
    meeting_link: Optional[str] = None
    meeting_location: Optional[str] = None
    notes: Optional[str] = None
    status: str
    advocate_decision: str
    decision_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    client: Optional[UserResponse] = None
    advocate: Optional[AdvocateResponse] = None
    meeting_request: Optional[MeetingRequestResponse] = None


# ============= CASE MODELS (REFACTORED) =============
class CaseBase(BaseModel):
    case_type: CaseType
    title: str
    description: str
    location: str


class CaseCreate(CaseBase):
    meeting_id: str  # NEW: Case can only be created after meeting approval


class Case(CaseBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    advocate_id: str  # Required now - case created only after advocate accepts
    meeting_id: str  # Reference to the meeting that led to case creation
    status: CaseStatus = CaseStatus.INITIATED
    current_stage: str = "INITIATED"
    ai_analysis: Optional[Dict[str, Any]] = None
    required_documents: List[str] = []
    legal_sections: List[str] = []
    procedural_guidance: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    client_id: str
    advocate_id: Optional[str] = None
    meeting_id: Optional[str] = None
    case_type: str
    title: str
    description: str
    location: str
    status: str
    current_stage: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    required_documents: Optional[List[str]] = None
    legal_sections: Optional[List[str]] = None
    procedural_guidance: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    client: Optional[UserResponse] = None
    advocate: Optional[AdvocateResponse] = None


# ============= NEW: CASE STAGE HISTORY =============
class CaseStageHistoryCreate(BaseModel):
    case_id: str
    from_stage: Optional[str]
    to_stage: str
    notes: Optional[str] = None


class CaseStageHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
    from_stage: Optional[str] = None
    to_stage: str
    changed_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= HEARING MODELS =============
class HearingCreate(BaseModel):
    case_id: str
    hearing_date: datetime
    court_name: str
    court_room: Optional[str] = None
    notes: Optional[str] = None


class Hearing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
    hearing_date: datetime
    court_name: str
    court_room: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    is_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============= DOCUMENT MODELS =============
class DocumentCreate(BaseModel):
    case_id: str
    document_name: str
    document_type: str
    description: Optional[str] = None


class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
    uploaded_by: str
    document_name: str
    document_type: str
    cloudinary_url: str
    cloudinary_public_id: str
    description: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= MESSAGE MODELS =============
class MessageCreate(BaseModel):
    case_id: Optional[str] = None
    meeting_request_id: Optional[str] = None  # NEW: Allow messaging before case creation
    content: str
    message_type: MessageType = MessageType.TEXT
    attachment_url: Optional[str] = None


class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: Optional[str] = None
    meeting_request_id: Optional[str] = None
    sender_id: str
    receiver_id: str
    content: str
    message_type: MessageType
    attachment_url: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= NOTIFICATION MODELS =============
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= RATING MODELS =============
class RatingCreate(BaseModel):
    case_id: str
    advocate_id: str
    rating: int = Field(ge=1, le=5)
    review: Optional[str] = None


class Rating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
    client_id: str
    advocate_id: str
    rating: int
    review: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= ADMIN LOG MODELS =============
class AdminLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    action: str
    target_type: str
    target_id: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= GROQ AI LOG MODELS =============
class GroqAILog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    case_id: Optional[str] = None
    query: str
    response: Dict[str, Any]
    tokens_used: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= AI QUERY MODELS =============
class AIQueryRequest(BaseModel):
    case_type: CaseType
    description: str
    location: Optional[str] = None
    additional_details: Optional[Dict[str, Any]] = None


class AIQueryResponse(BaseModel):
    case_classification: CaseType
    legal_sections: List[str]
    required_documents: List[str]
    procedural_guidance: str
    recommended_actions: List[str]
    estimated_timeline: str
    important_notes: List[str]
    recommended_advocates: Optional[List[AdvocateResponse]] = None





# ============= PAYMENT MODELS =============
class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentRequestCreate(BaseModel):
    case_id: str
    amount: float
    description: str
    due_date: Optional[datetime] = None


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    advocate_id: str
    client_id: str
    case_id: str
    amount: float
    description: str
    status: PaymentStatus = PaymentStatus.PENDING
    due_date: Optional[datetime] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentRequestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    advocate_id: str
    client_id: str
    case_id: str
    amount: float
    description: str
    status: str
    due_date: Optional[datetime] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    case: Optional[CaseResponse] = None
    client: Optional[UserResponse] = None
    advocate: Optional[AdvocateResponse] = None


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    payment_request_id: str


class AdvocatePaymentSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    advocate_id: str
    razorpay_key_id: str
    razorpay_key_secret: str  # This should be encrypted in production
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AdvocatePaymentSettingsUpdate(BaseModel):
    razorpay_key_id: str
    razorpay_key_secret: Optional[str] = None  # Optional for updates




# ============= DOCUMENT EDIT PERMISSION MODELS =============
class DocumentEditStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class DocumentEditRequestCreate(BaseModel):
    document_id: str
    case_id: str
    advocate_id: str
    request_reason: Optional[str] = None


class DocumentEditRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    client_id: str
    advocate_id: str
    case_id: str
    status: DocumentEditStatus = DocumentEditStatus.PENDING
    request_reason: Optional[str] = None
    advocate_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class DocumentEditRequestResponse(DocumentEditRequest):
    document_name: Optional[str] = None
    client_name: Optional[str] = None
    case_title: Optional[str] = None


class DocumentEditRequestUpdate(BaseModel):
    status: DocumentEditStatus
    advocate_notes: Optional[str] = None
    edit_duration_hours: Optional[int] = 24  # How long the document remains editable


class DocumentVersion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    version_number: int
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    edited_by: str
    edit_summary: Optional[str] = None
    changes_description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentVersionCreate(BaseModel):
    document_id: str
    edit_summary: Optional[str] = None
    changes_description: Optional[str] = None


class DocumentWithEditPermission(Document):
    is_locked: bool = True
    is_editable: bool = False
    current_version: int = 1
    last_edited_at: Optional[datetime] = None
    has_pending_edit_request: bool = False
    edit_request_status: Optional[str] = None