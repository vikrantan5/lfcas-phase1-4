# Supabase Authentication Utilities for LFCAS
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Optional, List
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase client - Using service role key for backend operations (bypasses RLS)
supabase_url = os.environ.get('SUPABASE_URL')
supabase_service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_service_key:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_service_key)

# HTTP Bearer security
security = HTTPBearer()


async def get_current_user(credentials = Depends(security)) -> dict:
    """
    Validate Supabase JWT token and return user information
    """
    try:
        token = credentials.credentials
        
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        auth_user = user_response.user
        
        # Get additional user profile from our users table
        user_profile = supabase.table('users').select('*').eq('auth_user_id', auth_user.id).execute()
        
        if not user_profile.data or len(user_profile.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile = user_profile.data[0]
        
        return {
            "user_id": profile['id'],
            "auth_user_id": auth_user.id,
            "email": profile['email'],
            "role": profile['role'],
            "full_name": profile['full_name'],
            "is_active": profile['is_active']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(allowed_roles: List[str]):
    """
    Dependency to check if user has required role
    """
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker

async def create_user_with_auth(email: str, password: str, full_name: str, phone: Optional[str], role: str) -> dict:
    """
    Create a new user in Supabase Auth and our users table
    """
    try:
        # Create user in Supabase Auth using sign_up (works without admin privileges)
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name,
                    "role": role
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create auth user"
            )
        
        auth_user = auth_response.user
        
        # Create user profile in our users table
        user_data = {
            "auth_user_id": auth_user.id,
            "email": email,
            "full_name": full_name,
            "phone": phone,
            "role": role,
            "is_active": True
        }
        
        user_profile = supabase.table('users').insert(user_data).execute()
        
        if not user_profile.data or len(user_profile.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
        
        return {
            "user": user_profile.data[0],
            "session": None  # We don't return session on registration for security
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )


async def login_user(email: str, password: str) -> dict:
    """
    Login user with Supabase Auth
    """
    try:
        # Sign in with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Get user profile
        user_profile = supabase.table('users').select('*').eq('auth_user_id', auth_response.user.id).execute()
        
        if not user_profile.data or len(user_profile.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile = user_profile.data[0]
        
        # Check if user is active
        if not profile['is_active']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user": profile
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


# Utility function to get Supabase client (for use in other modules)
def get_supabase_client() -> Client:
    """
    Returns the Supabase client for direct database operations
    """
    return supabase
