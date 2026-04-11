# Admin Panel Models for LFCAS
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

# ============= ENUMS =============

class ReportStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class WarningSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ============= REPORT MODELS =============

class ReportCreate(BaseModel):
    """Create a new report against an advocate"""
    advocate_id: str
    case_id: Optional[str] = None
    title: str
    description: str


class ReportUpdate(BaseModel):
    """Update report status and admin notes"""
    status: Optional[ReportStatus] = None
    admin_notes: Optional[str] = None


class Report(BaseModel):
    """Report model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    advocate_id: str
    case_id: Optional[str] = None
    title: str
    description: str
    status: ReportStatus = ReportStatus.PENDING
    admin_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ReportResponse(Report):
    """Report response with additional details"""
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    advocate_name: Optional[str] = None
    case_title: Optional[str] = None
    resolved_by_name: Optional[str] = None


# ============= WARNING MODELS =============

class WarningCreate(BaseModel):
    """Create a warning for an advocate"""
    advocate_id: str
    severity: WarningSeverity
    reason: str
    description: Optional[str] = None
    related_report_id: Optional[str] = None


class Warning(BaseModel):
    """Warning model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    advocate_id: str
    issued_by: str
    severity: WarningSeverity
    reason: str
    description: Optional[str] = None
    related_report_id: Optional[str] = None
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WarningResponse(Warning):
    """Warning response with additional details"""
    advocate_name: Optional[str] = None
    issued_by_name: Optional[str] = None
    report_title: Optional[str] = None


# ============= ADMIN STATS MODELS =============

class AdvocatePerformance(BaseModel):
    """Advocate performance metrics"""
    advocate_id: str
    user_id: str
    full_name: str
    email: str
    status: str
    rating: float
    total_cases: int
    active_cases: int
    specialization: List[str]
    location: str
    warning_count: int
    critical_warnings: int
    report_count: int
    pending_reports: int
    created_at: datetime


class PlatformStats(BaseModel):
    """Enhanced platform statistics for admin"""
    users: dict
    advocates: dict
    cases: dict
    reports: dict
    warnings: dict
    recent_activity: List[dict]


class CaseFilters(BaseModel):
    """Filters for case listing"""
    status: Optional[str] = None
    case_type: Optional[str] = None
    advocate_id: Optional[str] = None
    client_id: Optional[str] = None
    location: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class AdvocateFilters(BaseModel):
    """Filters for advocate listing"""
    status: Optional[str] = None
    location: Optional[str] = None
    specialization: Optional[str] = None
    min_rating: Optional[float] = None
    has_warnings: Optional[bool] = None


class BulkActionRequest(BaseModel):
    """Bulk action on advocates"""
    advocate_ids: List[str]
    action: str  # approve, reject, suspend
    reason: Optional[str] = None
