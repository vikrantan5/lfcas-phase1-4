# Cloudinary Service for Document Management
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from typing import Dict, Optional
from fastapi import UploadFile
import uuid

from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET")
)


async def upload_document_to_cloudinary(
    file: UploadFile,
    folder: str = "lfcas_documents"
) -> Dict:
    """
    Upload a document to Cloudinary
    
    Args:
        file: The file to upload
        folder: Cloudinary folder name
        
    Returns:
        Dict with upload details
    """
    try:
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        
        # Read file content
        file_content = await file.read()
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            public_id=unique_filename.split('.')[0],
            resource_type="auto",
            access_mode="authenticated"
        )
        
        return {
            "success": True,
            "url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id"),
            "resource_type": upload_result.get("resource_type"),
            "format": upload_result.get("format"),
            "size": upload_result.get("bytes"),
            "created_at": upload_result.get("created_at")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def delete_document_from_cloudinary(public_id: str) -> Dict:
    """
    Delete a document from Cloudinary
    
    Args:
        public_id: Cloudinary public ID of the file
        
    Returns:
        Dict with deletion status
    """
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="auto")
        return {
            "success": result.get("result") == "ok",
            "message": result.get("result")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def get_document_url(public_id: str) -> str:
    """
    Get a secure URL for a document
    
    Args:
        public_id: Cloudinary public ID
        
    Returns:
        Secure URL string
    """
    try:
        url = cloudinary.CloudinaryImage(public_id).build_url(secure=True)
        return url
    except Exception as e:
        return ""
