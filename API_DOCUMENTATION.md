# LFCAS API Documentation

## Base URL
```
https://case-advisor-hub.preview.emergentagent.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints Reference

### 1. Authentication APIs

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "phone": "+91-9876543210",
  "role": "client" | "advocate" | "platform_manager"
}

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "+91-9876543210",
  "role": "client",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "client"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "+91-9876543210",
  "role": "client",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00"
}
```

---

### 2. Advocate APIs

#### Create Advocate Profile
```http
POST /api/advocates/profile
Authorization: Bearer <advocate_token>
Content-Type: application/json

{
  "bar_council_id": "BAR/2020/12345",
  "specialization": ["divorce", "child_custody"],
  "experience_years": 5,
  "location": "Mumbai, Maharashtra",
  "bio": "Experienced family law advocate..."
}

Response: 200 OK
{
  "id": "uuid",
  "user_id": "uuid",
  "bar_council_id": "BAR/2020/12345",
  "specialization": ["divorce", "child_custody"],
  "experience_years": 5,
  "location": "Mumbai, Maharashtra",
  "bio": "Experienced family law advocate...",
  "status": "pending_approval",
  "rating": 0.0,
  "total_cases": 0,
  "active_cases": 0
}
```

#### List Advocates
```http
GET /api/advocates?status=approved&location=Mumbai&specialization=divorce&limit=20

Response: 200 OK
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "bar_council_id": "BAR/2020/12345",
    "specialization": ["divorce", "child_custody"],
    "experience_years": 5,
    "location": "Mumbai, Maharashtra",
    "status": "approved",
    "rating": 4.5,
    "total_cases": 20,
    "active_cases": 3,
    "user": {
      "id": "uuid",
      "email": "advocate@example.com",
      "full_name": "Jane Smith",
      "role": "advocate"
    }
  }
]
```

#### Get Advocate Details
```http
GET /api/advocates/{advocate_id}

Response: 200 OK
{
  "id": "uuid",
  "user_id": "uuid",
  "bar_council_id": "BAR/2020/12345",
  "specialization": ["divorce", "child_custody"],
  "experience_years": 5,
  "location": "Mumbai, Maharashtra",
  "bio": "Experienced family law advocate...",
  "status": "approved",
  "rating": 4.5,
  "total_cases": 20,
  "active_cases": 3,
  "user": {...}
}
```

#### Update Advocate Status (Admin Only)
```http
PATCH /api/advocates/{advocate_id}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "new_status": "approved" | "rejected" | "suspended"
}

Response: 200 OK
{
  "message": "Status updated successfully"
}
```

---

### 3. AI Analysis API

#### Analyze Legal Query
```http
POST /api/ai/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "case_type": "divorce",
  "description": "I want to file for divorce. My spouse and I have been living separately for 2 years. We have mutual consent.",
  "additional_details": {
    "marriage_duration": "10 years",
    "children": "2",
    "location": "Mumbai"
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "case_classification": "divorce",
    "legal_sections": [
      "Section 13B of Hindu Marriage Act 1955 (Mutual Consent Divorce)",
      "Section 28 of Special Marriage Act 1954"
    ],
    "required_documents": [
      "Marriage Certificate",
      "ID Proofs (Aadhar, PAN)",
      "Address Proof",
      "Passport size photographs",
      "Mutual Consent Petition",
      "Joint Settlement regarding custody and maintenance"
    ],
    "procedural_guidance": "Step 1: File joint petition...",
    "recommended_actions": [
      "Gather all required documents",
      "Draft mutual consent terms",
      "Consult a family law advocate"
    ],
    "estimated_timeline": "6-18 months (minimum 6 months cooling period)",
    "important_notes": [
      "Minimum 1 year of marriage required",
      "6 months cooling period mandatory",
      "Both parties must appear in court"
    ]
  },
  "tokens_used": 450
}
```

---

### 4. Case Management APIs

#### Create Case
```http
POST /api/cases
Authorization: Bearer <client_token>
Content-Type: application/json

{
  "case_type": "divorce",
  "title": "Mutual Consent Divorce - Doe vs Doe",
  "description": "Seeking divorce by mutual consent after 2 years of separation",
  "location": "Mumbai, Maharashtra"
}

Response: 200 OK
{
  "id": "uuid",
  "client_id": "uuid",
  "advocate_id": null,
  "case_type": "divorce",
  "title": "Mutual Consent Divorce - Doe vs Doe",
  "description": "Seeking divorce by mutual consent...",
  "location": "Mumbai, Maharashtra",
  "status": "pending",
  "ai_analysis": {...},
  "required_documents": [...],
  "legal_sections": [...],
  "procedural_guidance": "..."
}
```

#### List Cases
```http
GET /api/cases?status=in_progress&case_type=divorce
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "uuid",
    "client_id": "uuid",
    "advocate_id": "uuid",
    "case_type": "divorce",
    "title": "Mutual Consent Divorce - Doe vs Doe",
    "status": "in_progress",
    "created_at": "2025-01-15T10:30:00",
    "client": {...},
    "advocate": {...}
  }
]
```

#### Get Case Details
```http
GET /api/cases/{case_id}
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "client_id": "uuid",
  "advocate_id": "uuid",
  "case_type": "divorce",
  "title": "Mutual Consent Divorce - Doe vs Doe",
  "description": "...",
  "location": "Mumbai, Maharashtra",
  "status": "in_progress",
  "ai_analysis": {...},
  "required_documents": [...],
  "legal_sections": [...],
  "procedural_guidance": "...",
  "created_at": "2025-01-15T10:30:00",
  "client": {...},
  "advocate": {...}
}
```

#### Assign Advocate to Case
```http
PATCH /api/cases/{case_id}/assign-advocate
Authorization: Bearer <client_token>
Content-Type: application/json

{
  "advocate_id": "uuid"
}

Response: 200 OK
{
  "message": "Advocate assigned successfully"
}
```

#### Update Case Status
```http
PATCH /api/cases/{case_id}/status
Authorization: Bearer <advocate_token>
Content-Type: application/json

{
  "new_status": "hearing_scheduled" | "awaiting_judgment" | "closed"
}

Response: 200 OK
{
  "message": "Case status updated successfully"
}
```

---

### 5. Hearing APIs

#### Schedule Hearing
```http
POST /api/hearings
Authorization: Bearer <advocate_token>
Content-Type: application/json

{
  "case_id": "uuid",
  "hearing_date": "2025-02-15T10:00:00",
  "court_name": "Mumbai Family Court",
  "court_room": "Court Room 3",
  "notes": "First hearing for mutual consent"
}

Response: 200 OK
{
  "id": "uuid",
  "case_id": "uuid",
  "hearing_date": "2025-02-15T10:00:00",
  "court_name": "Mumbai Family Court",
  "court_room": "Court Room 3",
  "notes": "First hearing for mutual consent",
  "outcome": null,
  "is_completed": false
}
```

#### Get Case Hearings
```http
GET /api/hearings/case/{case_id}
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "uuid",
    "case_id": "uuid",
    "hearing_date": "2025-02-15T10:00:00",
    "court_name": "Mumbai Family Court",
    "court_room": "Court Room 3",
    "notes": "First hearing",
    "outcome": "Adjourned to next month",
    "is_completed": true
  }
]
```

---

### 6. Document APIs

#### Upload Document
```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: (binary file)
- case_id: "uuid"
- document_name: "Marriage Certificate"
- document_type: "certificate"
- description: "Original marriage certificate"

Response: 200 OK
{
  "id": "uuid",
  "case_id": "uuid",
  "uploaded_by": "uuid",
  "document_name": "Marriage Certificate",
  "document_type": "certificate",
  "cloudinary_url": "https://res.cloudinary.com/...",
  "cloudinary_public_id": "lfcas_cases/...",
  "description": "Original marriage certificate",
  "file_size": 245678,
  "created_at": "2025-01-15T10:30:00"
}
```

#### Get Case Documents
```http
GET /api/documents/case/{case_id}
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "uuid",
    "case_id": "uuid",
    "uploaded_by": "uuid",
    "document_name": "Marriage Certificate",
    "document_type": "certificate",
    "cloudinary_url": "https://res.cloudinary.com/...",
    "description": "Original marriage certificate",
    "file_size": 245678,
    "created_at": "2025-01-15T10:30:00"
  }
]
```

---

### 7. Messaging APIs

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "case_id": "uuid",
  "content": "Hello, I have a question about the hearing date.",
  "message_type": "text",
  "attachment_url": null
}

Response: 200 OK
{
  "id": "uuid",
  "case_id": "uuid",
  "sender_id": "uuid",
  "receiver_id": "uuid",
  "content": "Hello, I have a question about the hearing date.",
  "message_type": "text",
  "attachment_url": null,
  "is_read": false,
  "created_at": "2025-01-15T10:30:00"
}
```

#### Get Case Messages
```http
GET /api/messages/case/{case_id}
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "uuid",
    "case_id": "uuid",
    "sender_id": "uuid",
    "receiver_id": "uuid",
    "content": "Hello, I have a question about the hearing date.",
    "message_type": "text",
    "is_read": true,
    "created_at": "2025-01-15T10:30:00"
  }
]
```

---

### 8. Notification APIs

#### Get Notifications
```http
GET /api/notifications?limit=50
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "notification_type": "hearing_reminder",
    "title": "Hearing Scheduled",
    "message": "A hearing has been scheduled for 2025-02-15",
    "related_id": "uuid",
    "is_read": false,
    "created_at": "2025-01-15T10:30:00"
  }
]
```

#### Mark Notification as Read
```http
PATCH /api/notifications/{notification_id}/read
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Notification marked as read"
}
```

---

### 9. Rating APIs

#### Rate Advocate
```http
POST /api/ratings
Authorization: Bearer <client_token>
Content-Type: application/json

{
  "case_id": "uuid",
  "advocate_id": "uuid",
  "rating": 5,
  "review": "Excellent service, very professional and knowledgeable."
}

Response: 200 OK
{
  "id": "uuid",
  "case_id": "uuid",
  "client_id": "uuid",
  "advocate_id": "uuid",
  "rating": 5,
  "review": "Excellent service...",
  "created_at": "2025-01-15T10:30:00"
}
```

#### Get Advocate Ratings
```http
GET /api/ratings/advocate/{advocate_id}?limit=20

Response: 200 OK
[
  {
    "id": "uuid",
    "case_id": "uuid",
    "client_id": "uuid",
    "advocate_id": "uuid",
    "rating": 5,
    "review": "Excellent service...",
    "created_at": "2025-01-15T10:30:00"
  }
]
```

---

### 10. Admin APIs

#### Get Platform Statistics
```http
GET /api/admin/stats
Authorization: Bearer <admin_token>

Response: 200 OK
{
  "users": {
    "total": 150,
    "clients": 120,
    "advocates": 25
  },
  "advocates": {
    "approved": 20,
    "pending": 5
  },
  "cases": {
    "total": 85,
    "active": 45,
    "closed": 40,
    "by_type": {
      "divorce": 30,
      "alimony": 15,
      "child_custody": 20,
      "dowry": 10,
      "domestic_violence": 10
    }
  },
  "recent_cases": [...]
}
```

#### Get Admin Logs
```http
GET /api/admin/logs?limit=50
Authorization: Bearer <admin_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "admin_id": "uuid",
    "action": "update_advocate_status",
    "target_type": "advocate",
    "target_id": "uuid",
    "details": {
      "new_status": "approved"
    },
    "created_at": "2025-01-15T10:30:00"
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## WebSocket Events

### Connect
```javascript
socket.on('connected', (data) => {
  console.log(data); // { data: 'Connected to LFCAS server' }
});
```

### Join Room
```javascript
socket.emit('join_room', { user_id: 'your-user-id' });
```

### New Message
```javascript
socket.on('new_message', (message) => {
  console.log(message);
  // { id, case_id, sender_id, content, created_at, ... }
});
```

---

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Other endpoints**: 100 requests per minute
- **Document upload**: 10 uploads per hour

## Support

For API issues or questions, contact: support@lfcas.com
