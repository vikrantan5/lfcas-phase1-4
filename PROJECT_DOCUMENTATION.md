# Legal Family Case Advisor System (LFCAS)

## Project Overview
LFCAS is a comprehensive web platform designed to provide legal guidance and case management for family law matters in India, including divorce, alimony, child custody, dowry, and domestic violence cases.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: MongoDB Atlas
- **AI Integration**: Groq API (LLaMA 3.3 70B)
- **File Storage**: Cloudinary
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Routing**: React Router v7
- **State Management**: React Hooks
- **HTTP Client**: Axios

## System Architecture

### User Roles

1. **Client**
   - Submit legal queries
   - Receive AI-powered guidance
   - View required documents
   - Select and hire advocates
   - Track case progress
   - Chat with advocate
   - Upload documents
   - Rate advocates

2. **Advocate**
   - Create professional profile
   - Review and accept cases
   - Prepare legal petitions
   - Schedule hearings
   - Update case timeline
   - Chat with clients
   - Upload case documents

3. **Platform Manager**
   - Approve advocate registrations
   - View platform analytics
   - Monitor case trends
   - Review advocate performance
   - System administration

## Database Collections

### 1. users
- User authentication and profile
- Fields: id, email, hashed_password, full_name, phone, role, is_active, created_at, updated_at

### 2. advocates
- Advocate professional profiles
- Fields: id, user_id, bar_council_id, specialization, experience_years, location, bio, status, rating, total_cases, active_cases

### 3. cases
- Legal case records
- Fields: id, client_id, advocate_id, case_type, title, description, location, status, ai_analysis, required_documents, legal_sections, procedural_guidance

### 4. hearings
- Court hearing schedules
- Fields: id, case_id, hearing_date, court_name, court_room, notes, outcome, is_completed

### 5. documents
- Case document metadata
- Fields: id, case_id, uploaded_by, document_name, document_type, cloudinary_url, cloudinary_public_id, description, file_size

### 6. messages
- Real-time case communication
- Fields: id, case_id, sender_id, receiver_id, content, message_type, attachment_url, is_read

### 7. notifications
- User notifications
- Fields: id, user_id, notification_type, title, message, related_id, is_read

### 8. ratings
- Advocate ratings and reviews
- Fields: id, case_id, client_id, advocate_id, rating, review

### 9. admin_logs
- Platform manager activity logs
- Fields: id, admin_id, action, target_type, target_id, details

### 10. groq_ai_logs
- AI query and response logs
- Fields: id, user_id, case_id, query, response, tokens_used

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user info

### Advocates
- POST `/api/advocates/profile` - Create advocate profile
- GET `/api/advocates` - List advocates with filters
- GET `/api/advocates/{id}` - Get advocate details
- PATCH `/api/advocates/{id}/status` - Update advocate status (Admin)

### AI Analysis
- POST `/api/ai/analyze` - Analyze legal query with Groq AI

### Cases
- POST `/api/cases` - Create new case
- GET `/api/cases` - List cases (filtered by role)
- GET `/api/cases/{id}` - Get case details
- PATCH `/api/cases/{id}/assign-advocate` - Assign advocate to case
- PATCH `/api/cases/{id}/status` - Update case status

### Hearings
- POST `/api/hearings` - Schedule hearing
- GET `/api/hearings/case/{case_id}` - Get case hearings

### Documents
- POST `/api/documents/upload` - Upload document
- GET `/api/documents/case/{case_id}` - Get case documents

### Messages
- POST `/api/messages` - Send message
- GET `/api/messages/case/{case_id}` - Get case messages

### Notifications
- GET `/api/notifications` - Get user notifications
- PATCH `/api/notifications/{id}/read` - Mark notification as read

### Ratings
- POST `/api/ratings` - Rate advocate
- GET `/api/ratings/advocate/{id}` - Get advocate ratings

### Admin
- GET `/api/admin/stats` - Get platform statistics
- GET `/api/admin/logs` - Get admin activity logs

## Groq AI Integration

### Supported Case Types
1. **Divorce** - Hindu Marriage Act 1955, Special Marriage Act 1954
2. **Alimony** - Section 125 CrPC, Hindu Adoption and Maintenance Act
3. **Child Custody** - Guardians and Wards Act 1890, Hindu Minority and Guardianship Act 1956
4. **Dowry** - Section 498A IPC, Dowry Prohibition Act 1961
5. **Domestic Violence** - Protection of Women from Domestic Violence Act 2005

### AI Response Structure
```json
{
  "case_classification": "divorce",
  "legal_sections": ["Section X", "Act Y"],
  "required_documents": ["Document 1", "Document 2"],
  "procedural_guidance": "Step-by-step process...",
  "recommended_actions": ["Action 1", "Action 2"],
  "estimated_timeline": "6-12 months",
  "important_notes": ["Note 1", "Note 2"]
}
```

## Real-time Features

### Socket.IO Events
- **connect** - Client connection established
- **disconnect** - Client disconnected
- **join_room** - Join user-specific room
- **new_message** - Real-time message notification

## Security Features

1. **JWT Authentication** - Secure token-based authentication
2. **Password Hashing** - bcrypt for password security
3. **Role-Based Access Control (RBAC)** - Endpoint protection by user role
4. **Secure Document Storage** - Cloudinary authenticated access
5. **Input Validation** - Pydantic models for data validation

## Case Workflow

1. **Client Submits Query** → AI analyzes and provides guidance
2. **Client Creates Case** → Case initialized with AI insights
3. **Client Selects Advocate** → From recommended list
4. **Advocate Accepts Case** → Case status: IN_PROGRESS
5. **Document Submission** → Both parties upload documents
6. **Hearing Scheduled** → Advocate schedules court dates
7. **Real-time Communication** → WebSocket messaging
8. **Case Updates** → Status tracking and notifications
9. **Case Closure** → Final judgment uploaded
10. **Rating & Review** → Client rates advocate

## Environment Variables

```env
# MongoDB
MONGO_URL=mongodb+srv://...
DB_NAME=newproject

# JWT
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Groq AI
GROQ_API_KEY=gsk_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
CORS_ORIGINS=*
```

## Installation & Setup

### Backend
```bash
cd /app/backend
pip install -r requirements.txt
```

### Frontend
```bash
cd /app/frontend
yarn install
```

## Running the Application

### Start Backend
```bash
sudo supervisorctl restart backend
```

### Start Frontend
```bash
sudo supervisorctl restart frontend
```

### Check Status
```bash
sudo supervisorctl status all
```

## Development Guidelines

1. **Code Structure**
   - `server.py` - Main FastAPI application
   - `models.py` - Pydantic models
   - `auth.py` - Authentication utilities
   - `groq_service.py` - AI integration
   - `cloudinary_service.py` - Document storage

2. **Database Operations**
   - Use Motor (async MongoDB driver)
   - Always serialize datetime to ISO format before saving
   - Convert ISO strings back to datetime when reading

3. **API Design**
   - RESTful endpoints
   - Proper HTTP status codes
   - Consistent error handling
   - Request/response validation

4. **Security**
   - Always verify user permissions
   - Use require_role for endpoint protection
   - Validate all user inputs
   - Sanitize file uploads

## Future Enhancements

1. **Phase 5** - Frontend Implementation
2. **Phase 6** - Advanced Analytics Dashboard
3. **Phase 7** - Mobile Application
4. **Phase 8** - Video Consultation Feature
5. **Phase 9** - Payment Integration
6. **Phase 10** - Multi-language Support

## Support & Documentation

For issues or questions, contact the development team.

## License

Proprietary - All rights reserved

---

**Version**: 1.0.0 (Phase 1-4 Complete)
**Last Updated**: 2025
