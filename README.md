# Legal Family Case Advisor System (LFCAS)
## Phase 1-4 Implementation

### Quick Start Guide

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend Setup (Phase 5 - Coming Soon)
```bash
cd frontend
yarn install

# Configure environment variables
cp .env.example .env
# Edit .env with backend URL

# Run development server
yarn start
```

### What's Included

✅ **Phase 1**: Core Architecture + User Roles
✅ **Phase 2**: Complete MongoDB Schema (10 collections)
✅ **Phase 3**: Groq AI Integration for Legal Analysis
✅ **Phase 4**: Complete FastAPI Backend (24+ endpoints)

### Documentation

- `PROJECT_DOCUMENTATION.md` - Complete system architecture
- `API_DOCUMENTATION.md` - Full API reference with examples
- `PHASE_1-4_SUMMARY.md` - Implementation summary

### Features

- JWT Authentication
- Role-Based Access Control (Client, Advocate, Platform Manager)
- AI Legal Analysis (Groq)
- Case Management System
- Document Upload (Cloudinary)
- Real-time Messaging (WebSocket)
- Hearing Scheduling
- Notification System
- Rating & Review System
- Admin Analytics

### Technology Stack

**Backend**:
- FastAPI
- MongoDB (Motor)
- Groq AI
- Cloudinary
- Socket.IO
- JWT

**Frontend** (Ready for Phase 5):
- React 19
- Tailwind CSS
- Radix UI
- Axios

### API Endpoint Examples

```bash
# Health check
curl http://localhost:8001/api/

# Register user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123",
    "full_name": "John Doe",
    "role": "client"
  }'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123"
  }'
```

### Environment Variables Required

**Backend (.env)**:
- MONGO_URL - MongoDB Atlas connection string
- GROQ_API_KEY - Groq API key
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- JWT_SECRET_KEY

**Frontend (.env)**:
- REACT_APP_BACKEND_URL - Backend API URL

### Next Steps

1. Configure environment variables
2. Set up MongoDB Atlas database
3. Get Groq API key
4. Configure Cloudinary account
5. Run backend server
6. Test APIs using API_DOCUMENTATION.md
7. Proceed to Phase 5 (Frontend Development)

### Support

For questions or issues, refer to the comprehensive documentation files included.

---

**Version**: 1.0.0
**Status**: Phase 1-4 Complete ✅
**Next**: Phase 5 - Frontend Implementation
