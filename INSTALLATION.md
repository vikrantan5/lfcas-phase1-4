# LFCAS Installation Guide

## Prerequisites

- Python 3.11+
- Node.js 18+ and Yarn
- MongoDB Atlas account
- Groq API key
- Cloudinary account

## Step-by-Step Installation

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `.env` file with your credentials:
```env
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/dbname"
DB_NAME="lfcas_production"
JWT_SECRET_KEY="your-super-secret-key-change-this"
GROQ_API_KEY="your-groq-api-key"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 2. Run Backend Server

```bash
# Development mode
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Production mode
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

Backend will be available at: http://localhost:8001

### 3. Test Backend

```bash
# Test health endpoint
curl http://localhost:8001/api/

# Expected response:
# {
#   "message": "Legal Family Case Advisor System API",
#   "version": "1.0.0",
#   "status": "operational"
# }
```

### 4. Frontend Setup (Phase 5)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
```

Edit frontend `.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 5. Run Frontend (When Phase 5 is complete)

```bash
yarn start
```

Frontend will be available at: http://localhost:3000

## Getting API Keys

### MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Create account and new cluster
3. Get connection string from "Connect" button

### Groq API
1. Go to https://console.groq.com
2. Sign up for account
3. Generate API key from dashboard

### Cloudinary
1. Go to https://cloudinary.com
2. Sign up for free account
3. Get cloud name, API key, and secret from dashboard

## Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Verify all API keys are correct
- Check Python version: `python --version`
- Reinstall dependencies: `pip install -r requirements.txt`

### Database connection failed
- Verify MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)
- Check username/password in connection string
- Ensure database name is correct

### AI queries not working
- Verify Groq API key is valid
- Check Groq account has credits
- Review logs for specific error messages

### File uploads failing
- Verify Cloudinary credentials
- Check cloud name is correct
- Ensure API key/secret are valid

## Production Deployment

### Using Docker (Recommended)

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Using Gunicorn

```bash
pip install gunicorn
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

## Security Checklist

- [ ] Change JWT_SECRET_KEY to a strong random value
- [ ] Use environment variables, never hardcode credentials
- [ ] Enable MongoDB authentication
- [ ] Set up CORS properly (don't use * in production)
- [ ] Use HTTPS in production
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Monitor API usage

## Next Steps

1. Test all API endpoints using API_DOCUMENTATION.md
2. Create test users for each role
3. Test complete case workflow
4. Proceed to Phase 5 (Frontend Development)

---

Need help? Check PROJECT_DOCUMENTATION.md for detailed information.
