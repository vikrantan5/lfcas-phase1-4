# Supabase Storage Service for Document Management
# Replaces Cloudinary for petition and document storage
import os
from typing import Dict, Optional
from fastapi import UploadFile
import uuid
from auth import get_supabase_client
import logging

logger = logging.getLogger(__name__)

# Get Supabase client
supabase = get_supabase_client()


async def upload_document_to_supabase(
    file: UploadFile,
    bucket: str = "case-documents",
    folder: str = "petitions"
) -> Dict:
    """
    Upload a document to Supabase Storage
    
    Args:
        file: The file to upload
        bucket: Supabase storage bucket name (default: 'case-documents')
        folder: Folder within bucket (default: 'petitions')
        
    Returns:
        Dict with upload details
    """
    try:
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        
        # Create full path: folder/unique_filename
        file_path = f"{folder}/{unique_filename}"
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Upload to Supabase Storage
        upload_response = supabase.storage.from_(bucket).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file.content_type, "upsert": "false"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket).get_public_url(file_path)
        
        logger.info(f"Successfully uploaded file to Supabase: {file_path}")
        
        return {
            "success": True,
            "url": public_url,
            "public_id": file_path,  # Store path as public_id for consistency
            "bucket": bucket,
            "size": file_size,
            "content_type": file.content_type
        }
        
    except Exception as e:
        logger.error(f"Supabase upload error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def delete_document_from_supabase(
    file_path: str,
    bucket: str = "case-documents"
) -> Dict:
    """
    Delete a document from Supabase Storage
    
    Args:
        file_path: Path to the file in the bucket (e.g., 'petitions/filename.pdf')
        bucket: Supabase storage bucket name
        
    Returns:
        Dict with deletion status
    """
    try:
        result = supabase.storage.from_(bucket).remove([file_path])
        
        logger.info(f"Successfully deleted file from Supabase: {file_path}")
        
        return {
            "success": True,
            "message": "File deleted successfully"
        }
    except Exception as e:
        logger.error(f"Supabase deletion error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def get_document_url(file_path: str, bucket: str = "case-documents") -> str:
    """
    Get a public URL for a document
    
    Args:
        file_path: Path to the file in the bucket
        bucket: Supabase storage bucket name
        
    Returns:
        Public URL string
    """
    try:
        url = supabase.storage.from_(bucket).get_public_url(file_path)
        return url
    except Exception as e:
        logger.error(f"Error getting document URL: {str(e)}")
        return ""


async def download_document_from_url(url: str) -> bytes:
    """
    Download a document from a URL (for migration purposes)
    
    Args:
        url: URL of the document to download
        
    Returns:
        File content as bytes
    """
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            return response.content
    except Exception as e:
        logger.error(f"Error downloading document from {url}: {str(e)}")
        raise
