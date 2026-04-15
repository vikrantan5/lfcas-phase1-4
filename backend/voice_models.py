# Voice AI Models for LFCAS
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ============= VOICE ENUMS =============
class VoiceLanguage(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    BENGALI = "bengali"


class VoiceSessionStatus(str, Enum):
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MessageSender(str, Enum):
    USER = "user"
    AI = "ai"
    SYSTEM = "system"


class CaseDraftStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    CASE_CREATED = "case_created"
    REJECTED = "rejected"


# ============= VOICE SESSION MODELS =============
class VoiceSessionCreate(BaseModel):
    language: VoiceLanguage = VoiceLanguage.ENGLISH


class VoiceSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    language: str
    vapi_assistant_id: Optional[str] = None
    vapi_call_id: Optional[str] = None
    status: str = VoiceSessionStatus.INITIATED
    transcript: Optional[str] = None
    duration_seconds: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class VoiceSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    language: str
    vapi_assistant_id: Optional[str] = None
    vapi_call_id: Optional[str] = None
    status: str
    transcript: Optional[str] = None
    duration_seconds: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    messages: Optional[List[Dict]] = None
    analysis: Optional[Dict] = None


# ============= VOICE MESSAGE MODELS =============
class VoiceMessageCreate(BaseModel):
    session_id: str
    sender: MessageSender
    message: str
    message_type: str = "text"
    audio_url: Optional[str] = None


class VoiceMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    sender: str
    message: str
    message_type: str = "text"
    audio_url: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    session_id: str
    sender: str
    message: str
    message_type: str
    audio_url: Optional[str] = None
    timestamp: datetime
    created_at: datetime


# ============= AI CASE ANALYSIS MODELS =============
class AICaseAnalysisCreate(BaseModel):
    session_id: str
    case_type: Optional[str] = None
    location: Optional[str] = None
    urgency_level: str = "medium"
    structured_output: Dict[str, Any]
    legal_sections: Optional[List[str]] = []
    required_documents: Optional[List[str]] = []
    procedural_guidance: Optional[str] = None
    recommended_actions: Optional[List[str]] = []
    estimated_timeline: Optional[str] = None
    important_notes: Optional[List[str]] = []
    confidence_score: float = 0.80
    groq_tokens_used: Optional[int] = None


class AICaseAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    case_type: Optional[str] = None
    location: Optional[str] = None
    urgency_level: str = "medium"
    structured_output: Dict[str, Any]
    legal_sections: List[str] = []
    required_documents: List[str] = []
    procedural_guidance: Optional[str] = None
    recommended_actions: List[str] = []
    estimated_timeline: Optional[str] = None
    important_notes: List[str] = []
    confidence_score: float = 0.80
    groq_tokens_used: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AICaseAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    session_id: str
    user_id: str
    case_type: Optional[str] = None
    location: Optional[str] = None
    urgency_level: str
    structured_output: Dict[str, Any]
    legal_sections: List[str]
    required_documents: List[str]
    procedural_guidance: Optional[str] = None
    recommended_actions: List[str]
    estimated_timeline: Optional[str] = None
    important_notes: List[str]
    confidence_score: float
    created_at: datetime


# ============= VOICE CASE DRAFT MODELS =============
class VoiceCaseDraftCreate(BaseModel):
    session_id: str
    analysis_id: str
    case_type: str
    title: str
    description: str
    location: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    recommended_advocates: Optional[List[Dict]] = None


class VoiceCaseDraft(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    analysis_id: str
    user_id: str
    case_type: str
    title: str
    description: str
    location: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    recommended_advocates: Optional[List[Dict]] = None
    status: str = CaseDraftStatus.DRAFT
    case_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceCaseDraftResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    session_id: str
    analysis_id: str
    user_id: str
    case_type: str
    title: str
    description: str
    location: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    recommended_advocates: Optional[List[Dict]] = None
    status: str
    case_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    session: Optional[VoiceSessionResponse] = None
    analysis: Optional[AICaseAnalysisResponse] = None


# ============= REQUEST/RESPONSE MODELS =============
class ProcessVoiceConversationRequest(BaseModel):
    session_id: str
    transcript: str
    language: VoiceLanguage = VoiceLanguage.ENGLISH


class ConfirmCaseDraftRequest(BaseModel):
    draft_id: str
    selected_advocate_id: Optional[str] = None
    additional_notes: Optional[str] = None


class VoiceToMeetingRequestRequest(BaseModel):
    draft_id: str
    advocate_id: str
    preferred_date: Optional[datetime] = None
    additional_notes: Optional[str] = None
