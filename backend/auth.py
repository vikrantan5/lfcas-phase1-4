# Supabase Authentication Utilities for LFCAS
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Optional, List
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

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


async def get_current_user(credentials=Depends(security)) -> dict:
    """Validate Supabase JWT token and return user information."""
    try:
        token = credentials.credentials
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        auth_user = user_response.user
        user_profile = supabase.table('users').select('*').eq('auth_user_id', auth_user.id).execute()

        if not user_profile.data or len(user_profile.data) == 0:
            raise HTTPException(status_code=404, detail="User profile not found")

        profile = user_profile.data[0]
        return {
            "user_id": profile['id'],
            "auth_user_id": auth_user.id,
            "email": profile['email'],
            "role": profile['role'],
            "full_name": profile['full_name'],
            "is_active": profile['is_active'],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(allowed_roles: List):
    """Dependency to check if user has required role."""
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        role_strings = [r.value if hasattr(r, 'value') else str(r) for r in allowed_roles]
        if current_user["role"] not in role_strings:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(role_strings)}",
            )
        return current_user
    return role_checker


async def create_user_with_auth(email: str, password: str, full_name: str,
                                phone: Optional[str], role: str) -> dict:
    """
    Create a new user in Supabase Auth (auto-confirmed) and our users table.
    Uses admin API with service role key - email confirmation is bypassed.
    """
    role_str = role.value if hasattr(role, 'value') else str(role)
    auth_user = None

    try:
        # Use admin.create_user with service role key - bypasses email confirmation
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,  # Auto-confirm email - no verification needed
            "user_metadata": {
                "full_name": full_name,
                "role": role_str,
            },
        })

        if auth_response and auth_response.user:
            auth_user = auth_response.user
            logger.info(f"User created via admin API: {email}")

    except Exception as admin_error:
        error_str = str(admin_error).lower()
        logger.error(f"Admin create_user failed for {email}: {admin_error}")

        if "already registered" in error_str or "already been registered" in error_str or "duplicate" in error_str:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Fallback: regular sign_up
        try:
            auth_response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {"full_name": full_name, "role": role_str},
                },
            })
            if auth_response and auth_response.user:
                auth_user = auth_response.user
                logger.info(f"User created via sign_up fallback: {email}")
        except Exception as signup_error:
            signup_err_str = str(signup_error).lower()
            if "already registered" in signup_err_str or "already been registered" in signup_err_str:
                raise HTTPException(status_code=400, detail="Email already registered")
            if "rate limit" in signup_err_str or "429" in signup_err_str:
                raise HTTPException(
                    status_code=429,
                    detail="Too many registration attempts. Please try again in a few minutes.",
                )
            raise HTTPException(status_code=400, detail=f"Failed to create auth user: {signup_error}")

    if not auth_user:
        raise HTTPException(status_code=400, detail="Failed to create auth user")

    # Create user profile in our users table
    user_data = {
        "auth_user_id": auth_user.id,
        "email": email,
        "full_name": full_name,
        "phone": phone,
        "role": role_str,
        "is_active": True,
    }

    try:
        user_profile = supabase.table('users').insert(user_data).execute()
    except Exception as db_error:
        logger.error(f"Failed to create user profile in DB: {db_error}")
        # Rollback: delete the auth user so they can retry
        try:
            supabase.auth.admin.delete_user(auth_user.id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create user profile: {db_error}")

    if not user_profile.data or len(user_profile.data) == 0:
        try:
            supabase.auth.admin.delete_user(auth_user.id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to create user profile")

    return {"user": user_profile.data[0], "session": None}


async def login_user(email: str, password: str) -> dict:
    """Login user with Supabase Auth."""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        user_profile = supabase.table('users').select('*').eq('auth_user_id', auth_response.user.id).execute()

        if not user_profile.data or len(user_profile.data) == 0:
            raise HTTPException(status_code=404, detail="User profile not found")

        profile = user_profile.data[0]
        if not profile['is_active']:
            raise HTTPException(status_code=403, detail="Account is inactive")

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user": profile,
        }

    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "invalid" in err or "credentials" in err:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        if "not confirmed" in err or "email not confirmed" in err:
            raise HTTPException(status_code=401, detail="Please verify your email before logging in")
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


def get_supabase_client() -> Client:
    return supabase
