# MongoDB Models for LFCAS
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
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
    OTHER = "other"


class CaseStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    HEARING_SCHEDULED = "hearing_scheduled"
    AWAITING_JUDGMENT = "awaiting_judgment"
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


class NotificationType(str, Enum):
    CASE_UPDATE = "case_update"
    HEARING_REMINDER = "hearing_reminder"
    NEW_MESSAGE = "new_message"
    DOCUMENT_UPLOADED = "document_uploaded"
    ADVOCATE_ASSIGNED = "advocate_assigned"
    SYSTEM = "system"


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
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime


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
    id: str
    user_id: str
    bar_council_id: str
    specialization: List[CaseType]
    experience_years: int
    location: str
    bio: Optional[str]
    status: AdvocateStatus
    rating: float
    total_cases: int
    active_cases: int
    user: Optional[UserResponse] = None


# ============= CASE MODELS =============
class CaseBase(BaseModel):
    case_type: CaseType
    title: str
    description: str
    location: str


class CaseCreate(CaseBase):
    pass


class Case(CaseBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    advocate_id: Optional[str] = None
    status: CaseStatus = CaseStatus.PENDING
    ai_analysis: Optional[dict] = None
    required_documents: List[str] = []
    legal_sections: List[str] = []
    procedural_guidance: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CaseResponse(Case):
    client: Optional[UserResponse] = None
    advocate: Optional[AdvocateResponse] = None


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
    case_id: str
    content: str
    message_type: MessageType = MessageType.TEXT
    attachment_url: Optional[str] = None


class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
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
    details: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= GROQ AI LOG MODELS =============
class GroqAILog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    case_id: Optional[str] = None
    query: str
    response: dict
    tokens_used: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= AI QUERY MODELS =============
class AIQueryRequest(BaseModel):
    case_type: CaseType
    description: str
    additional_details: Optional[dict] = None


class AIQueryResponse(BaseModel):
    case_classification: CaseType
    legal_sections: List[str]
    required_documents: List[str]
    procedural_guidance: str
    recommended_actions: List[str]
    estimated_timeline: str
    important_notes: List[str]
